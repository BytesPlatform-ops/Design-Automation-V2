/**
 * Puppeteer-based scraper for JS-heavy websites
 * @deprecated Use unified-scraper.ts instead - this module is kept for reference
 * Works on Render, Railway, local dev - NOT on Vercel serverless
 */

import type { ScrapedProduct } from './unified-scraper';

export interface PuppeteerScrapedData {
  products: ScrapedProduct[];
  brandName: string | null;
  logo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  title: string | null;
  description: string | null;
  // Landing page content (NEW)
  landingPageContent: {
    heroHeadline: string | null;
    heroSubheadline: string | null;
    ctaText: string[];
    valuePropositions: string[];
    serviceDescriptions: string[];
    pricingInfo: Array<{ planName: string; price: string | null; features: string[] }>;
    featuresList: Array<{ title: string; description: string | null }>;
    statsNumbers: Array<{ value: string; label: string }>;
  };
  websiteCategory: 'ecommerce' | 'restaurant' | 'saas' | 'agency' | 'landing-page' | 'unknown';
}

/**
 * Check if Puppeteer scraping is available
 * Returns false on Vercel serverless
 */
export function isPuppeteerAvailable(): boolean {
  // Check environment - Vercel sets this
  if (process.env.VERCEL) {
    return false;
  }
  // Check if we're in a serverless environment
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return false;
  }
  // Check if explicitly enabled (for Render)
  if (process.env.ENABLE_PUPPETEER === 'true') {
    return true;
  }
  // For local dev, check if Chrome/Chromium is available
  // For now, disable by default since it requires Chrome installed
  return false;
}

/**
 * Scrape a website using Puppeteer (headless Chrome)
 * This can execute JavaScript and get dynamically loaded content
 */
export async function scrapeWithPuppeteer(url: string): Promise<PuppeteerScrapedData | null> {
  if (!isPuppeteerAvailable()) {
    console.log('[Puppeteer] Not available in this environment');
    return null;
  }

  let browser = null;
  
  try {
    // Dynamic import to avoid bundling issues
    const puppeteer = await import('puppeteer-core');
    
    console.log('[Puppeteer] Launching browser...');
    
    // Get executable path from env or common locations
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || 
      process.env.CHROME_PATH ||
      '/usr/bin/google-chrome-stable' ||
      '/usr/bin/chromium-browser' ||
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ],
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('[Puppeteer] Navigating to:', url);
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait for content to load
    await page.waitForSelector('body', { timeout: 5000 });
    
    // For single-page apps, scroll through the entire page to trigger lazy loading
    await page.evaluate(async () => {
      const scrollHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;
      let currentPosition = 0;
      
      while (currentPosition < scrollHeight) {
        window.scrollTo(0, currentPosition);
        currentPosition += viewportHeight / 2;
        await new Promise(r => setTimeout(r, 200));
      }
      // Scroll back to top
      window.scrollTo(0, 0);
    });
    
    // Wait longer for AJAX content to load (KFC, restaurants, etc.)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to wait for product/pricing elements with more selectors
    try {
      await page.waitForSelector('[class*="product"], [class*="pricing"], [class*="plan"], [class*="card"], [class*="menu-item"], [class*="item-card"], [class*="ins-component"]', { 
        timeout: 5000 
      });
    } catch {
      console.log('[Puppeteer] No product/pricing elements found with standard selectors');
    }

    // First, find menu/product/pricing page links (skip hash URLs for SPAs)
    const menuPageUrls = await page.evaluate((baseUrl) => {
      const links: string[] = [];
      const menuPatterns = [
        /pricing/i, /plans/i, /packages/i, // SaaS pricing pages
        /menu/i, /products/i, /shop/i, /catalog/i, /our-menu/i, 
        /all-products/i, /items/i, /food/i, /deals/i, /offers/i,
        /services/i, /features/i
      ];
      
      document.querySelectorAll('a[href]').forEach((a) => {
        const href = (a as HTMLAnchorElement).href;
        const text = a.textContent?.toLowerCase() || '';
        
        // Skip hash-only URLs (same page anchors) - they don't need navigation
        if (href.includes('#') && new URL(href).pathname === new URL(baseUrl).pathname) {
          return; // Skip hash links to same page
        }
        
        // Check if link text or href matches menu patterns
        const isMenuLink = menuPatterns.some(p => p.test(href) || p.test(text));
        
        if (isMenuLink && href.startsWith(baseUrl) && !links.includes(href)) {
          links.push(href);
        }
      });
      
      return links.slice(0, 3); // Limit to 3 pages to avoid too many requests
    }, new URL(url).origin);
    
    console.log(`[Puppeteer] Found ${menuPageUrls.length} menu page URLs:`, menuPageUrls);

    // Extract data from main page first
    const extractProductsFromPage = async () => {
      return await page.evaluate(() => {
      const data: {
        products: Array<{
          name: string;
          price: string | null;
          image: string | null;
          description: string | null;
          category: string | null;
        }>;
        brandName: string | null;
        logo: string | null;
        title: string | null;
        description: string | null;
      } = {
        products: [],
        brandName: null,
        logo: null,
        title: document.title || null,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') || null,
      };

      // Get brand name
      const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
      data.brandName = ogSiteName || document.title?.split(/[-|]/)[0]?.trim() || null;

      // Get logo
      const logoSelectors = [
        'header img[src*="logo"]',
        'img[alt*="logo" i]',
        'img[class*="logo"]',
        '.logo img',
        'a[href="/"] img',
        'header a img:first-child',
      ];
      for (const sel of logoSelectors) {
        const logo = document.querySelector(sel) as HTMLImageElement;
        if (logo?.src) {
          data.logo = logo.src;
          break;
        }
      }

      // Extract products/pricing plans
      const productSelectors = [
        // KFC / Fast food specific (based on common patterns)
        '[class*="ins-component__item"]', // KFC uses this
        '.ins-component__item',
        '.ins-component__item-wrap',
        '[class*="category-product"]',
        '[class*="item-card"]',
        '[class*="ItemCard"]',
        '[class*="menu-card"]',
        '[class*="MenuCard"]',
        // Menu/food items - various patterns
        '[class*="menu-item"]',
        '[class*="menuItem"]',
        '[class*="MenuItem"]',
        '[class*="food-item"]',
        '[class*="foodItem"]',
        '[class*="FoodItem"]',
        '[class*="dish-card"]',
        '[class*="DishCard"]',
        // Product cards - generic
        '[class*="product-card"]',
        '[class*="productCard"]',
        '[class*="ProductCard"]',
        '[class*="product-item"]',
        '[class*="productItem"]',
        '[class*="ProductItem"]',
        '[data-product]',
        '[data-item]',
        '[data-product-id]',
        '[data-item-id]',
        // E-commerce
        '.product',
        '.product-item',
        '.item-card',
        '.grid-item[class*="product"]',
        // SaaS/Pricing plans - target by section ID
        '#pricing > div > div > div',
        '[id*="pricing"] .grid > div',
        'section[id*="pricing"] .grid > div',
        // SaaS/Pricing plans - by class
        '[class*="pricing-card"]',
        '[class*="price-card"]',
        '[class*="plan-card"]',
        '[class*="pricing"] > div > div',
        '[class*="plans"] > div',
      ];

      const seenNames = new Set<string>();
      
      // Words that indicate this is NOT a product name
      const invalidNamePatterns = [
        /welcome/i, /sign in/i, /log in/i, /register/i,
        /turn one idea/i, /your command/i, /get started/i,
        /learn more/i, /read more/i, /click here/i,
        /contact us/i, /subscribe/i, /newsletter/i
      ];

      for (const selector of productSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => {
            // Find name - also check for plan names
            const nameEl = el.querySelector('h1, h2, h3, h4, h5, [class*="name"], [class*="title"], .title, .name, [class*="plan-name"], [class*="tier-name"]');
            const name = nameEl?.textContent?.trim();
            
            // Skip invalid names
            if (!name || name.length < 2 || name.length > 100 || seenNames.has(name.toLowerCase())) {
              return;
            }
            
            // Skip if name matches invalid patterns (headlines, CTAs, etc.)
            if (invalidNamePatterns.some(p => p.test(name))) {
              return;
            }

            // Find image
            const img = el.querySelector('img') as HTMLImageElement;
            const image = img?.src || img?.getAttribute('data-src') || null;

            // Find price - prefer the actual price, not strikethrough
            // Look for non-strikethrough price first
            let price: string | null = null;
            const priceElements = el.querySelectorAll('[class*="price"], .price, [class*="amount"]');
            for (const priceEl of priceElements) {
              // Skip strikethrough prices
              const isStrikethrough = priceEl.closest('del, s, strike, [class*="old"], [class*="original"], [class*="was"], [class*="strikethrough"]');
              if (isStrikethrough) continue;
              
              const priceText = priceEl.textContent?.trim();
              if (priceText && /[\$€£₹₨]|free|custom/i.test(priceText)) {
                price = priceText;
                break;
              }
            }
            
            // Fallback to any price
            if (!price) {
              const anyPrice = el.querySelector('[class*="price"], .price');
              price = anyPrice?.textContent?.trim() || null;
            }

            // Find description
            const descEl = el.querySelector('[class*="description"], [class*="desc"], [class*="subtitle"], p:not([class*="price"])');
            const description = descEl?.textContent?.trim()?.slice(0, 300) || null;

            // Find category (parent section heading)
            const section = el.closest('section, [class*="category"], [class*="section"]');
            const categoryEl = section?.querySelector('h1, h2, h3');
            const category = categoryEl?.textContent?.trim() || null;

            seenNames.add(name.toLowerCase());
            data.products.push({
              name,
              price,
              image,
              description,
              category,
            });
          });
        } catch {
          // Selector not supported
        }

        if (data.products.length >= 50) break;
      }
      
      // Fallback 1: If no products, try to find menu/food items more aggressively
      if (data.products.length === 0) {
        console.log('[Puppeteer-Debug] No products with standard selectors, trying aggressive fallback...');
        
        // Look for any element that has BOTH an image and a price
        const allCards = document.querySelectorAll('div, article, section, li');
        allCards.forEach((card) => {
          if (data.products.length >= 50) return;
          
          const img = card.querySelector('img') as HTMLImageElement;
          const hasImage = img && img.src && !img.src.includes('logo') && !img.src.includes('icon');
          
          // Check if this card has a price
          const cardText = card.textContent || '';
          const hasPrice = /Rs\.?\s*[\d,]+|₨\s*[\d,]+|\$[\d,]+/i.test(cardText);
          
          if (hasImage && hasPrice) {
            // Find the name (closest heading or title)
            const nameEl = card.querySelector('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="name"]');
            const name = nameEl?.textContent?.trim();
            
            if (name && name.length > 2 && name.length < 100 && !seenNames.has(name.toLowerCase())) {
              // Extract price
              const priceMatch = cardText.match(/Rs\.?\s*[\d,]+|₨\s*[\d,]+|\$[\d,]+/i);
              
              seenNames.add(name.toLowerCase());
              data.products.push({
                name,
                price: priceMatch?.[0] || null,
                image: img.src,
                description: null,
                category: null,
              });
            }
          }
        });
        
        console.log(`[Puppeteer-Debug] Aggressive fallback found ${data.products.length} products`);
      }
      
      // Fallback 2: If still no products, look for pricing section by ID
      // Note: :contains() is not valid CSS - only :has() works in modern browsers
      if (data.products.length === 0) {
        const pricingSection = document.querySelector('#pricing, [id*="pricing"], [class*="pricing"], section[class*="price"]');
        if (pricingSection) {
          // Find all potential plan cards (divs with h3 and price-like text)
          const allDivs = pricingSection.querySelectorAll('.grid > div, .flex > div');
          allDivs.forEach((div) => {
            const h3 = div.querySelector('h3');
            const name = h3?.textContent?.trim();
            
            if (!name || name.length < 2 || name.length > 50 || seenNames.has(name.toLowerCase())) {
              return;
            }
            
            // Look for price text (Free, $XX, Custom)
            const allText = div.textContent || '';
            let price: string | null = null;
            
            // Check for "Free" (not in strikethrough)
            if (/\bFree\b/i.test(allText) && !div.querySelector('s, del, strike, .line-through')?.textContent?.includes('Free')) {
              price = 'Free';
            }
            // Check for dollar amount (prefer non-strikethrough)
            else {
              const priceMatch = allText.match(/\$[\d,]+(?:\.\d{2})?/g);
              if (priceMatch && priceMatch.length > 0) {
                // If multiple prices, take the last one (usually actual price after strikethrough)
                price = priceMatch[priceMatch.length - 1];
              }
            }
            // Check for Custom
            if (!price && /\bCustom\b/i.test(allText)) {
              price = 'Custom';
            }
            
            const descEl = div.querySelector('p');
            const description = descEl?.textContent?.trim()?.slice(0, 200) || null;
            
            seenNames.add(name.toLowerCase());
            data.products.push({
              name,
              price,
              image: null,
              description,
              category: 'Pricing Plans',
            });
          });
        }
      }

      return data;
    });
    };

    // Extract from main page
    const mainPageData = await extractProductsFromPage();
    console.log(`[Puppeteer] Found ${mainPageData.products.length} products on main page`);
    
    // Collect all products with deduplication
    const allProducts = new Map<string, typeof mainPageData.products[0]>();
    mainPageData.products.forEach(p => allProducts.set(p.name.toLowerCase(), p));
    
    // Navigate to menu pages and extract more products
    for (const menuUrl of menuPageUrls) {
      if (allProducts.size >= 20) break; // Limit total products
      
      try {
        console.log(`[Puppeteer] Navigating to menu page: ${menuUrl}`);
        await page.goto(menuUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        
        // Wait for products to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Scroll to load lazy-loaded content
        await page.evaluate(async () => {
          const scrollHeight = document.body.scrollHeight;
          const viewportHeight = window.innerHeight;
          let currentPosition = 0;
          
          while (currentPosition < scrollHeight) {
            window.scrollTo(0, currentPosition);
            currentPosition += viewportHeight;
            await new Promise(r => setTimeout(r, 300));
          }
          window.scrollTo(0, 0);
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const menuPageData = await extractProductsFromPage();
        console.log(`[Puppeteer] Found ${menuPageData.products.length} products on ${menuUrl}`);
        
        menuPageData.products.forEach(p => {
          if (!allProducts.has(p.name.toLowerCase())) {
            allProducts.set(p.name.toLowerCase(), p);
          }
        });
      } catch (e) {
        console.log(`[Puppeteer] Error scraping ${menuUrl}:`, e);
      }
    }
    
    // Convert Map back to array
    const scrapedData = {
      products: Array.from(allProducts.values()),
      brandName: mainPageData.brandName,
      logo: mainPageData.logo,
      title: mainPageData.title,
      description: mainPageData.description,
    };

    console.log(`[Puppeteer] Total products found: ${scrapedData.products.length}`);

    // Get colors using comprehensive extraction (like Cheerio does)
    const colors = await page.evaluate(() => {
      const hexRegex = /#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/g;
      const colorCounts: Record<string, number> = {};
      const cssVarColors: string[] = [];
      
      // Helper to convert rgb/rgba to hex
      const rgbToHex = (rgb: string): string | null => {
        const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return null;
        const [, r, g, b] = match;
        return '#' + [r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('').toUpperCase();
      };
      
      // 1. Extract from CSS variables (highest priority)
      const allStylesheets = document.querySelectorAll('style');
      allStylesheets.forEach(style => {
        const css = style.textContent || '';
        const cssVarRegex = /--(?:primary|brand|main|accent|secondary|theme)[^:]*:\s*(#[0-9A-Fa-f]{6})/gi;
        let match;
        while ((match = cssVarRegex.exec(css)) !== null) {
          cssVarColors.push(match[1].toUpperCase());
        }
        
        // Also extract all hex colors from stylesheets
        const hexMatches = css.match(hexRegex);
        hexMatches?.forEach(color => {
          const upper = color.toUpperCase();
          colorCounts[upper] = (colorCounts[upper] || 0) + 1;
        });
      });
      
      // 2. Extract from inline styles (higher weight)
      document.querySelectorAll('[style]').forEach(el => {
        const style = (el as HTMLElement).getAttribute('style') || '';
        const matches = style.match(hexRegex);
        matches?.forEach(color => {
          const upper = color.toUpperCase();
          colorCounts[upper] = (colorCounts[upper] || 0) + 2; // Higher weight for inline
        });
      });
      
      // 3. Extract from computed styles of prominent elements
      const prominentSelectors = [
        'header', 'nav', '.navbar', '.header',
        'button', '[class*="btn"]', '.btn',
        'a[class*="btn"]', '[class*="cta"]',
        '[class*="primary"]', '[class*="brand"]',
        '.hero', '[class*="hero"]',
        'footer', '.footer'
      ];
      
      prominentSelectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(el => {
            const style = window.getComputedStyle(el);
            const bgColor = rgbToHex(style.backgroundColor);
            const color = rgbToHex(style.color);
            const borderColor = rgbToHex(style.borderColor);
            
            if (bgColor) colorCounts[bgColor] = (colorCounts[bgColor] || 0) + 3;
            if (color) colorCounts[color] = (colorCounts[color] || 0) + 1;
            if (borderColor) colorCounts[borderColor] = (colorCounts[borderColor] || 0) + 1;
          });
        } catch {
          // Selector not supported
        }
      });
      
      // 4. Check meta theme-color
      const themeColor = document.querySelector('meta[name="theme-color"]')?.getAttribute('content');
      if (themeColor && hexRegex.test(themeColor)) {
        cssVarColors.unshift(themeColor.toUpperCase());
      }
      
      // Exclude common neutral colors
      const excludeColors = [
        '#FFFFFF', '#000000', '#FFFFFE', '#FEFEFE',
        '#333333', '#666666', '#999999', '#CCCCCC', 
        '#F5F5F5', '#EEEEEE', '#E5E5E5', '#DDDDDD',
        '#F8F8F8', '#FAFAFA', '#F0F0F0', '#E0E0E0',
        '#111111', '#222222', '#444444', '#555555',
        '#777777', '#888888', '#AAAAAA', '#BBBBBB'
      ];
      
      const sortedColors = Object.entries(colorCounts)
        .filter(([color]) => !excludeColors.includes(color))
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => color);
      
      const primaryFromVars = cssVarColors.find(c => !excludeColors.includes(c));
      
      return {
        primary: primaryFromVars || sortedColors[0] || null,
        secondary: sortedColors[1] || null,
        accent: sortedColors[2] || null,
      };
    });
    
    const primaryColor = colors.primary;
    console.log(`[Puppeteer] Extracted colors:`, colors);

    // Extract landing page content (NEW - critical for SaaS/service sites)
    const landingPageContent = await page.evaluate(() => {
      const content = {
        heroHeadline: null as string | null,
        heroSubheadline: null as string | null,
        ctaText: [] as string[],
        valuePropositions: [] as string[],
        serviceDescriptions: [] as string[],
        pricingInfo: [] as Array<{ planName: string; price: string | null; features: string[] }>,
        featuresList: [] as Array<{ title: string; description: string | null }>,
        statsNumbers: [] as Array<{ value: string; label: string }>,
      };
      
      // 1. Extract Hero Headline (first H1 or hero section)
      const heroSelectors = [
        'section:first-of-type h1', '.hero h1', '[class*="hero"] h1',
        'header + section h1', 'header + div h1', 'main > section:first-child h1',
        'h1'
      ];
      for (const selector of heroSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent) {
          const text = el.textContent.trim();
          if (text.length > 5 && text.length < 200) {
            content.heroHeadline = text;
            break;
          }
        }
      }
      
      // 2. Extract Hero Subheadline
      const subheadlineSelectors = [
        '.hero h2', '.hero p', '[class*="hero"] h2', '[class*="hero"] p',
        'h1 + p', 'h1 + div > p', 'section:first-of-type p'
      ];
      for (const selector of subheadlineSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent) {
          const text = el.textContent.trim();
          if (text.length > 20 && text.length < 300) {
            content.heroSubheadline = text;
            break;
          }
        }
      }
      
      // 3. Extract CTAs
      const ctaSelectors = [
        'a[class*="cta"]', 'button[class*="cta"]',
        '.hero a[class*="btn"]', '.hero button',
        '[class*="hero"] a', '[class*="hero"] button',
        'a[class*="btn-primary"]', 'button[class*="primary"]'
      ];
      const ctaSet = new Set<string>();
      ctaSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length > 2 && text.length < 40) {
            if (!/^(home|about|contact|login|sign in|menu|search)$/i.test(text)) {
              ctaSet.add(text);
            }
          }
        });
      });
      content.ctaText = Array.from(ctaSet).slice(0, 5);
      
      // 4. Extract Value Propositions (look for short benefit statements)
      const allText = document.body.innerText || '';
      const valuePatterns = [
        /(?:build|create|launch|get|start) your [^.!]{10,60}/gi,
        /in (?:just )?(?:\d+|minutes?|seconds?|hours?|days?)[^.!]{0,40}/gi,
        /(?:no|without) (?:coding|technical|experience)[^.!]{0,40}/gi,
        /(?:\d+%|\d+x|\d+\+) [^.!]{5,50}/gi,
        /(?:free|affordable|easy|fast|quick|simple)[^.!]{10,50}/gi,
        /save (?:time|money|\$?\d+)[^.!]{0,40}/gi,
        /(?:trusted by|used by|loved by) [^.!]{5,50}/gi,
        /we (?:build|create|make|design|develop|help)[^.!]{10,60}/gi,
      ];
      const vpSet = new Set<string>();
      valuePatterns.forEach(pattern => {
        const matches = allText.match(pattern);
        matches?.forEach(match => {
          const cleaned = match.trim().replace(/\s+/g, ' ');
          if (cleaned.length > 15 && cleaned.length < 100) {
            vpSet.add(cleaned);
          }
        });
      });
      content.valuePropositions = Array.from(vpSet).slice(0, 8);
      
      // 5. Extract Service Descriptions
      const serviceSelectors = [
        '[class*="service"]', '[class*="what-we-do"]', '[class*="about"]',
        '[class*="features"] > div', '[class*="benefits"] > div'
      ];
      serviceSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(section => {
          const heading = section.querySelector('h2, h3, h4')?.textContent?.trim();
          const desc = section.querySelector('p')?.textContent?.trim();
          if (desc && desc.length > 30 && desc.length < 300) {
            const fullDesc = heading ? `${heading}: ${desc}` : desc;
            if (!content.serviceDescriptions.some(s => s.includes(desc.substring(0, 30)))) {
              content.serviceDescriptions.push(fullDesc);
            }
          }
        });
      });
      content.serviceDescriptions = content.serviceDescriptions.slice(0, 5);
      
      // 6. Extract Features List
      const featureSelectors = [
        '[class*="feature"]', '[class*="benefit"]', '[class*="advantage"]'
      ];
      featureSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const titleEl = el.querySelector('h3, h4, [class*="title"]');
          const descEl = el.querySelector('p');
          const title = titleEl?.textContent?.trim();
          const desc = descEl?.textContent?.trim();
          if (title && title.length > 2 && title.length < 60) {
            if (!content.featuresList.some(f => f.title === title)) {
              content.featuresList.push({
                title,
                description: desc && desc.length > 10 && desc.length < 200 ? desc : null
              });
            }
          }
        });
      });
      content.featuresList = content.featuresList.slice(0, 10);
      
      // 7. Extract Stats/Numbers
      const statPattern = /(\d+[kK]?\+?|\d+,\d+\+?|\d+%)\s*([a-zA-Z\s]{3,30})/g;
      const statSelectors = ['[class*="stat"]', '[class*="counter"]', '[class*="number"]', '[class*="metric"]'];
      statSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const text = el.textContent || '';
          const matches = text.matchAll(statPattern);
          for (const match of matches) {
            content.statsNumbers.push({ value: match[1], label: match[2].trim() });
          }
        });
      });
      content.statsNumbers = content.statsNumbers.slice(0, 6);
      
      return content;
    });
    
    console.log('[Puppeteer] Landing page content:', {
      heroHeadline: landingPageContent.heroHeadline,
      ctaText: landingPageContent.ctaText,
      valuePropositions: landingPageContent.valuePropositions.slice(0, 3),
      features: landingPageContent.featuresList.length,
    });
    
    // Detect website category
    const websiteCategory = await page.evaluate((hasProducts: boolean, productNames: string[]) => {
      const allText = document.body.innerText?.toLowerCase() || '';
      const hasCart = document.querySelector('[class*="cart"], [class*="checkout"], [class*="add-to-cart"]') !== null;
      
      // Check if "products" are actually pricing tiers (SaaS indicator)
      const pricingTierNames = ['starter', 'pro', 'basic', 'premium', 'enterprise', 'free', 'business', 'plus', 'professional', 'team'];
      const productsArePricingTiers = productNames.length > 0 && 
        productNames.every(name => pricingTierNames.some(tier => name.toLowerCase().includes(tier)));
      
      // SaaS indicators - check FIRST before ecommerce
      const saasPatterns = [
        /sign up/i, /get started/i, /free trial/i, /pricing/i, /plans/i,
        /platform/i, /software/i, /dashboard/i, /api/i, /saas/i,
        /per month|\/mo|\/month/i, /annual|yearly/i, /start free/i,
        /build your/i, /create your/i, /launch your/i
      ];
      const saasScore = saasPatterns.filter(p => p.test(allText)).length;
      const isSaas = saasScore >= 2 || productsArePricingTiers;
      
      // Agency indicators
      const agencyPatterns = [
        /agency/i, /we build/i, /we create/i, /we design/i, /we develop/i,
        /our team/i, /portfolio/i, /clients/i, /hire us/i, /get a quote/i,
        /our services/i, /what we do/i
      ];
      const isAgency = agencyPatterns.filter(p => p.test(allText)).length >= 2;
      
      // Restaurant indicators
      const restaurantPatterns = [/menu/i, /order online/i, /delivery/i, /restaurant/i, /food/i, /cuisine/i];
      const isRestaurant = restaurantPatterns.filter(p => p.test(allText)).length >= 2;
      
      // Priority: saas/agency > restaurant > ecommerce
      // SaaS sites often have "products" (pricing tiers) but they're services
      if (isSaas) return 'saas';
      if (isAgency) return 'agency';
      if (isRestaurant) return 'restaurant';
      if (hasCart && hasProducts && !productsArePricingTiers) return 'ecommerce';
      return 'landing-page';
    }, scrapedData.products.length > 0, scrapedData.products.map(p => p.name));
    
    console.log('[Puppeteer] Website category:', websiteCategory);

    await browser.close();
    browser = null;

    // Convert to ScrapedProduct format
    const products: ScrapedProduct[] = scrapedData.products.map(p => {
      // Universal currency detection from price string
      let currency: string | null = null;
      if (p.price) {
        const priceStr = p.price;
        // Check for currency symbols/codes
        if (priceStr.includes('$') && !priceStr.includes('A$') && !priceStr.includes('C$') && !priceStr.includes('NZ$') && !priceStr.includes('S$')) {
          currency = 'USD';
        } else if (priceStr.includes('A$')) {
          currency = 'AUD';
        } else if (priceStr.includes('C$')) {
          currency = 'CAD';
        } else if (priceStr.includes('S$')) {
          currency = 'SGD';
        } else if (priceStr.includes('NZ$')) {
          currency = 'NZD';
        } else if (priceStr.includes('€')) {
          currency = 'EUR';
        } else if (priceStr.includes('£')) {
          currency = 'GBP';
        } else if (priceStr.includes('¥')) {
          currency = 'JPY';
        } else if (priceStr.includes('₹')) {
          currency = 'INR';
        } else if (priceStr.includes('Rs') || priceStr.includes('₨') || priceStr.includes('PKR')) {
          currency = 'PKR';
        } else if (priceStr.includes('₩')) {
          currency = 'KRW';
        } else if (priceStr.includes('฿')) {
          currency = 'THB';
        } else if (priceStr.includes('RM')) {
          currency = 'MYR';
        } else if (priceStr.includes('AED')) {
          currency = 'AED';
        }
      }
      
      return {
        name: p.name,
        price: p.price,
        originalPrice: null,
        currency,
        image: p.image,
        images: p.image ? [p.image] : [],
        description: p.description,
        category: p.category,
        variants: [],
        inStock: true,
        url: null,
      };
    });

    return {
      products,
      brandName: scrapedData.brandName,
      logo: scrapedData.logo,
      primaryColor,
      secondaryColor: colors.secondary,
      accentColor: colors.accent,
      title: scrapedData.title,
      description: scrapedData.description,
      landingPageContent,
      websiteCategory,
    };

  } catch (error) {
    console.error('[Puppeteer] Error:', error);
    if (browser) {
      await browser.close();
    }
    return null;
  }
}
