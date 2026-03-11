/**
 * UNIFIED SCRAPER MODULE
 * Consolidates all scraping strategies into one intelligent extraction layer
 * 
 * Extraction Strategy (in order of reliability):
 * 1. STRUCTURED DATA - JSON-LD, Schema.org (most reliable, ~80% e-commerce sites)
 * 2. EMBEDDED JSON - __NEXT_DATA__, Apollo, Redux state
 * 3. PUPPETEER - Headless Chrome for JS-heavy sites (when available)
 * 4. CSS SELECTORS - Product cards, pricing elements
 * 5. LLM FALLBACK - AI extraction when other methods fail
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI, Cheerio } from 'cheerio';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CheerioElement = Cheerio<any>;

// ============ UNIFIED INTERFACES ============

export interface ScrapedProduct {
  name: string;
  price: string | null;
  originalPrice: string | null;
  currency: string | null;
  image: string | null;
  images: string[];
  description: string | null;
  category: string | null;
  variants: string[];
  inStock: boolean;
  url: string | null;
}

export interface LandingPageContent {
  heroHeadline: string | null;
  heroSubheadline: string | null;
  ctaText: string[];
  valuePropositions: string[];
  serviceDescriptions: string[];
  pricingInfo: Array<{
    planName: string;
    price: string | null;
    features: string[];
  }>;
  testimonials: string[];
  statsNumbers: Array<{ label: string; value: string }>;
  featuresList: Array<{ title: string; description: string | null }>;
}

export interface UnifiedScrapedData {
  url: string;
  
  // Brand Identity
  brandName: string;
  tagline: string | null;
  logo: string | null;
  favicon: string | null;
  
  // Colors
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  allColors: string[];
  
  // Products
  products: ScrapedProduct[];
  productCategories: string[];
  
  // Content
  heroImage: string | null;
  bannerImages: string[];
  allImages: string[];
  
  // Text Content
  headlines: string[];
  descriptions: string[];
  uniqueSellingPoints: string[];
  
  // Landing Page Content
  landingPageContent: LandingPageContent;
  
  // Business Info
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  socialLinks: Record<string, string>;
  
  // Metadata
  metaTitle: string;
  metaDescription: string;
  ogImage: string | null;
  structuredData: unknown[];
  
  // Detection
  isEcommerce: boolean;
  hasProducts: boolean;
  estimatedProductType: 'physical' | 'digital' | 'service';
  websiteCategory: 'ecommerce' | 'restaurant' | 'saas' | 'agency' | 'portfolio' | 'landing-page' | 'corporate' | 'unknown';
  
  // Extraction metadata
  extractionMethod: 'structured-data' | 'embedded-json' | 'puppeteer' | 'css-selectors' | 'llm-fallback' | 'mixed';
  extractionConfidence: number; // 0-1 score
}

export interface ScrapeOptions {
  timeout?: number;
  enablePuppeteer?: boolean;
  enableLLMFallback?: boolean;
  maxProducts?: number;
  scrapeProductPages?: boolean;
}

const DEFAULT_OPTIONS: Required<ScrapeOptions> = {
  timeout: 15000,
  enablePuppeteer: true,
  enableLLMFallback: true,
  maxProducts: 50,
  scrapeProductPages: true,
};

// ============ UNIVERSAL CURRENCY PARSER ============

const CURRENCY_MAP: Record<string, string> = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₹': 'INR',
  '₨': 'PKR',
  'Rs': 'PKR',
  'Rs.': 'PKR',
  'PKR': 'PKR',
  'R': 'ZAR',
  '₩': 'KRW',
  '฿': 'THB',
  '₫': 'VND',
  'kr': 'SEK',
  'CHF': 'CHF',
  'A$': 'AUD',
  'C$': 'CAD',
  'NZ$': 'NZD',
  '₱': 'PHP',
  'RM': 'MYR',
  'S$': 'SGD',
  'AED': 'AED',
  'SAR': 'SAR',
};

function parsePrice(priceText: string | number | null | undefined): { price: string | null; currency: string | null } {
  if (priceText === null || priceText === undefined) {
    return { price: null, currency: null };
  }
  
  const text = String(priceText).trim();
  if (!text) return { price: null, currency: null };
  
  if (typeof priceText === 'number') {
    return { price: String(priceText), currency: null };
  }
  
  let detectedCurrency: string | null = null;
  
  for (const [symbol, code] of Object.entries(CURRENCY_MAP)) {
    if (text.startsWith(symbol) || text.includes(symbol)) {
      detectedCurrency = code;
      break;
    }
  }
  
  const numericMatch = text.match(/[\d,]+(?:\.\d{2})?/);
  const priceValue = numericMatch ? numericMatch[0] : text;
  
  const formattedPrice = detectedCurrency && !text.includes(detectedCurrency)
    ? `${CURRENCY_MAP[Object.keys(CURRENCY_MAP).find(s => text.includes(s)) || ''] || ''}${priceValue}`.trim()
    : text;
  
  return { price: formattedPrice || text, currency: detectedCurrency };
}

// ============ PUPPETEER AVAILABILITY ============

function isPuppeteerAvailable(): boolean {
  if (process.env.VERCEL) return false;
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return false;
  if (process.env.ENABLE_PUPPETEER === 'true') return true;
  return false;
}

// ============ MAIN SCRAPE FUNCTION ============

/**
 * Unified website scraper - combines all extraction strategies
 */
export async function scrapeWebsite(url: string, options: ScrapeOptions = {}): Promise<UnifiedScrapedData> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
  
  console.log(`[UnifiedScraper] Starting scrape for: ${normalizedUrl}`);
  
  let extractionMethod: UnifiedScrapedData['extractionMethod'] = 'css-selectors';
  let extractionConfidence = 0.5;
  
  // Try Puppeteer first if available (best for JS-heavy sites)
  if (opts.enablePuppeteer && isPuppeteerAvailable()) {
    try {
      console.log('[UnifiedScraper] Attempting Puppeteer extraction...');
      const puppeteerData = await scrapeWithPuppeteer(normalizedUrl, opts.timeout);
      
      if (puppeteerData && puppeteerData.products.length > 0) {
        console.log(`[UnifiedScraper] Puppeteer found ${puppeteerData.products.length} products`);
        extractionMethod = 'puppeteer';
        extractionConfidence = 0.85;
        return {
          ...puppeteerData,
          extractionMethod,
          extractionConfidence,
        };
      }
    } catch (e) {
      console.log('[UnifiedScraper] Puppeteer failed, falling back:', e);
    }
  }
  
  // Fetch and parse HTML
  const mainPageData = await fetchAndParse(normalizedUrl, opts.timeout);
  
  // Try extraction strategies in order of reliability
  let products: ScrapedProduct[] = [];
  const seenNames = new Set<string>();
  
  // STRATEGY 1: Structured Data (most reliable)
  const structuredProducts = extractProductsFromStructuredData(mainPageData.$, mainPageData.baseUrl);
  structuredProducts.forEach(p => {
    if (!seenNames.has(p.name.toLowerCase())) {
      seenNames.add(p.name.toLowerCase());
      products.push(p);
    }
  });
  
  if (products.length >= 3) {
    extractionMethod = 'structured-data';
    extractionConfidence = 0.9;
    console.log(`[UnifiedScraper] Found ${products.length} products from structured data`);
  }
  
  // STRATEGY 2: Embedded JSON
  if (products.length < 3) {
    const nextDataProducts = extractProductsFromNextData(mainPageData.$, mainPageData.baseUrl);
    nextDataProducts.forEach(p => {
      if (!seenNames.has(p.name.toLowerCase())) {
        seenNames.add(p.name.toLowerCase());
        products.push(p);
      }
    });
    
    const embeddedProducts = extractProductsFromEmbeddedJSON(mainPageData.$, mainPageData.baseUrl);
    embeddedProducts.forEach(p => {
      if (!seenNames.has(p.name.toLowerCase())) {
        seenNames.add(p.name.toLowerCase());
        products.push(p);
      }
    });
    
    if (products.length >= 3 && extractionMethod !== 'structured-data') {
      extractionMethod = 'embedded-json';
      extractionConfidence = 0.8;
      console.log(`[UnifiedScraper] Found ${products.length} products from embedded JSON`);
    }
  }
  
  // STRATEGY 3: CSS Selectors
  if (products.length < 3) {
    const cssProducts = extractProductsFromCSS(mainPageData.$, mainPageData.baseUrl);
    cssProducts.forEach(p => {
      if (!seenNames.has(p.name.toLowerCase())) {
        seenNames.add(p.name.toLowerCase());
        products.push(p);
      }
    });
    
    if (products.length >= 1) {
      extractionMethod = products.length > structuredProducts.length ? 'css-selectors' : 'mixed';
      extractionConfidence = 0.6;
    }
  }
  
  // Scrape additional product pages if enabled
  if (opts.scrapeProductPages && products.length < opts.maxProducts) {
    const productPageUrls = findProductPageUrls(mainPageData.$, mainPageData.baseUrl);
    
    for (const productPageUrl of productPageUrls.slice(0, 3)) {
      try {
        const productPageData = await fetchAndParse(productPageUrl, opts.timeout);
        const moreProducts = extractAllProducts(productPageData.$, productPageData.baseUrl);
        
        moreProducts.forEach(product => {
          if (!seenNames.has(product.name.toLowerCase()) && products.length < opts.maxProducts) {
            seenNames.add(product.name.toLowerCase());
            products.push(product);
          }
        });
      } catch (e) {
        console.log(`[UnifiedScraper] Could not scrape ${productPageUrl}:`, e);
      }
    }
  }
  
  // Extract all other content
  const brandName = extractBrandName(mainPageData.$, normalizedUrl);
  const tagline = extractTagline(mainPageData.$);
  const logo = extractLogo(mainPageData.$, mainPageData.baseUrl);
  const colors = extractColorsWithPriority(mainPageData.$, mainPageData.html);
  const images = extractImagesWithContext(mainPageData.$, mainPageData.baseUrl);
  const textContent = extractTextContent(mainPageData.$);
  const landingPageContent = extractLandingPageContent(mainPageData.$);
  const contactInfo = extractContactInfo(mainPageData.$, mainPageData.html);
  const structuredData = extractStructuredData(mainPageData.$);
  const isEcommerce = detectEcommerce(mainPageData.$, products);
  const estimatedProductType = detectProductType(mainPageData.$, products, textContent);
  const websiteCategory = detectWebsiteCategory(mainPageData.$, products, textContent, landingPageContent);
  const favicon = extractFavicon(mainPageData.$, mainPageData.baseUrl);
  const ogImage = mainPageData.$('meta[property="og:image"]').attr('content');
  
  // Limit products
  products = products.slice(0, opts.maxProducts);
  
  console.log(`[UnifiedScraper] Complete: ${products.length} products, method: ${extractionMethod}, confidence: ${extractionConfidence}`);
  
  return {
    url: normalizedUrl,
    brandName,
    tagline,
    logo,
    favicon,
    primaryColor: colors.primary,
    secondaryColor: colors.secondary,
    accentColor: colors.accent,
    allColors: colors.all,
    products,
    productCategories: [...new Set(products.map(p => p.category).filter(Boolean))] as string[],
    heroImage: images.hero,
    bannerImages: images.banners,
    allImages: images.all,
    headlines: textContent.headlines,
    descriptions: textContent.descriptions,
    uniqueSellingPoints: textContent.usps,
    landingPageContent,
    contactEmail: contactInfo.email,
    phone: contactInfo.phone,
    address: contactInfo.address,
    socialLinks: contactInfo.social,
    metaTitle: mainPageData.$('title').text().trim() || brandName,
    metaDescription: mainPageData.$('meta[name="description"]').attr('content') || '',
    ogImage: ogImage ? resolveUrl(ogImage, mainPageData.baseUrl) : null,
    structuredData,
    isEcommerce,
    hasProducts: products.length > 0,
    estimatedProductType,
    websiteCategory,
    extractionMethod,
    extractionConfidence,
  };
}

// ============ HELPER FUNCTIONS ============

async function fetchAndParse(url: string, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    return { html, $, baseUrl: new URL(url) };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function resolveUrl(relativeUrl: string | null | undefined, baseUrl: URL): string | null {
  if (!relativeUrl) return null;
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return null;
  }
}

// ============ PUPPETEER SCRAPER ============

async function scrapeWithPuppeteer(url: string, timeout: number): Promise<UnifiedScrapedData | null> {
  let browser = null;
  
  try {
    const puppeteer = await import('puppeteer-core');
    
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || 
      process.env.CHROME_PATH ||
      '/usr/bin/chromium';
    
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process'],
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    await page.goto(url, { waitUntil: 'networkidle2', timeout });
    await page.waitForSelector('body', { timeout: 5000 });
    
    // Scroll to trigger lazy loading
    await page.evaluate(async () => {
      const scrollHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;
      let currentPosition = 0;
      while (currentPosition < scrollHeight) {
        window.scrollTo(0, currentPosition);
        currentPosition += viewportHeight / 2;
        await new Promise(r => setTimeout(r, 200));
      }
      window.scrollTo(0, 0);
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract data from page
    const data = await page.evaluate(() => {
      const result = {
        products: [] as Array<{ name: string; price: string | null; image: string | null; description: string | null; category: string | null }>,
        brandName: null as string | null,
        logo: null as string | null,
        title: document.title || null,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') || null,
        heroHeadline: null as string | null,
        heroSubheadline: null as string | null,
        ctaText: [] as string[],
        primaryColor: null as string | null,
        secondaryColor: null as string | null,
        accentColor: null as string | null,
      };
      
      // Brand name
      const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
      result.brandName = ogSiteName || document.title?.split(/[-|]/)[0]?.trim() || null;
      
      // Logo
      const logoSelectors = ['header img[src*="logo"]', 'img[alt*="logo" i]', 'img[class*="logo"]', '.logo img'];
      for (const sel of logoSelectors) {
        const logo = document.querySelector(sel) as HTMLImageElement;
        if (logo?.src) {
          result.logo = logo.src;
          break;
        }
      }
      
      // Hero content
      const h1 = document.querySelector('h1');
      if (h1) result.heroHeadline = h1.textContent?.trim() || null;
      
      const heroP = document.querySelector('.hero p, [class*="hero"] p, h1 + p');
      if (heroP) result.heroSubheadline = heroP.textContent?.trim() || null;
      
      // Products
      const productSelectors = [
        '[class*="product-card"]', '[class*="product-item"]', '[data-product]',
        '[class*="menu-item"]', '[class*="pricing-card"]', '[class*="plan-card"]'
      ];
      
      const seenNames = new Set<string>();
      const invalidPatterns = [/welcome/i, /sign in/i, /log in/i, /get started/i, /learn more/i];
      
      for (const selector of productSelectors) {
        try {
          document.querySelectorAll(selector).forEach((el) => {
            const nameEl = el.querySelector('h1, h2, h3, h4, h5, [class*="name"], [class*="title"]');
            const name = nameEl?.textContent?.trim();
            
            if (!name || name.length < 2 || name.length > 100 || seenNames.has(name.toLowerCase())) return;
            if (invalidPatterns.some(p => p.test(name))) return;
            
            const img = el.querySelector('img') as HTMLImageElement;
            const image = img?.src || null;
            
            let price: string | null = null;
            const priceElements = el.querySelectorAll('[class*="price"], .price');
            for (const priceEl of priceElements) {
              const isStrikethrough = priceEl.closest('del, s, strike, [class*="old"]');
              if (isStrikethrough) continue;
              const priceText = priceEl.textContent?.trim();
              if (priceText && /[\$€£₹₨]|free|custom/i.test(priceText)) {
                price = priceText;
                break;
              }
            }
            
            const descEl = el.querySelector('[class*="description"], p:not([class*="price"])');
            const description = descEl?.textContent?.trim()?.slice(0, 300) || null;
            
            seenNames.add(name.toLowerCase());
            result.products.push({ name, price, image, description, category: null });
          });
        } catch { /* selector not supported */ }
        
        if (result.products.length >= 50) break;
      }
      
      // Colors
      const hexRegex = /#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/g;
      const colorCounts: Record<string, number> = {};
      
      document.querySelectorAll('style').forEach(style => {
        const css = style.textContent || '';
        const matches = css.match(hexRegex);
        matches?.forEach(color => {
          colorCounts[color.toUpperCase()] = (colorCounts[color.toUpperCase()] || 0) + 1;
        });
      });
      
      const excludeColors = ['#FFFFFF', '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#F5F5F5'];
      const sortedColors = Object.entries(colorCounts)
        .filter(([color]) => !excludeColors.includes(color))
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => color);
      
      result.primaryColor = sortedColors[0] || null;
      result.secondaryColor = sortedColors[1] || null;
      result.accentColor = sortedColors[2] || null;
      
      return result;
    });
    
    await browser.close();
    browser = null;
    
    // Convert to UnifiedScrapedData
    const products: ScrapedProduct[] = data.products.map(p => {
      const { currency } = parsePrice(p.price);
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
      url,
      brandName: data.brandName || new URL(url).hostname.replace('www.', ''),
      tagline: data.heroSubheadline,
      logo: data.logo,
      favicon: null,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor,
      allColors: [data.primaryColor, data.secondaryColor, data.accentColor].filter(Boolean) as string[],
      products,
      productCategories: [],
      heroImage: null,
      bannerImages: [],
      allImages: [],
      headlines: data.heroHeadline ? [data.heroHeadline] : [],
      descriptions: data.heroSubheadline ? [data.heroSubheadline] : [],
      uniqueSellingPoints: [],
      landingPageContent: {
        heroHeadline: data.heroHeadline,
        heroSubheadline: data.heroSubheadline,
        ctaText: data.ctaText,
        valuePropositions: [],
        serviceDescriptions: [],
        pricingInfo: [],
        testimonials: [],
        statsNumbers: [],
        featuresList: [],
      },
      contactEmail: null,
      phone: null,
      address: null,
      socialLinks: {},
      metaTitle: data.title || '',
      metaDescription: data.description || '',
      ogImage: null,
      structuredData: [],
      isEcommerce: products.length > 0,
      hasProducts: products.length > 0,
      estimatedProductType: 'physical',
      websiteCategory: 'unknown',
      extractionMethod: 'puppeteer',
      extractionConfidence: 0.85,
    };
  } catch (error) {
    console.error('[Puppeteer] Error:', error);
    if (browser) await browser.close();
    return null;
  }
}

// ============ STRUCTURED DATA EXTRACTION ============

function extractProductsFromStructuredData($: CheerioAPI, baseUrl: URL): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  
  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      const data = JSON.parse($(script).html() || '');
      const items = Array.isArray(data) ? data : [data];
      
      items.forEach(item => {
        if (item['@type'] === 'Product' || item.type === 'Product') {
          products.push({
            name: item.name || '',
            price: item.offers?.price?.toString() || item.price?.toString() || null,
            originalPrice: null,
            currency: item.offers?.priceCurrency || item.priceCurrency || null,
            image: resolveUrl(item.image, baseUrl),
            images: Array.isArray(item.image) ? item.image.map((i: string) => resolveUrl(i, baseUrl)).filter(Boolean) : [],
            description: item.description || null,
            category: item.category || null,
            variants: [],
            inStock: item.offers?.availability !== 'OutOfStock',
            url: resolveUrl(item.url, baseUrl),
          });
        }
        
        if (item['@type'] === 'ItemList' && item.itemListElement) {
          item.itemListElement.forEach((listItem: { item?: { name?: string; offers?: { price?: string | number; priceCurrency?: string }; image?: string; description?: string; url?: string } }) => {
            if (listItem.item) {
              products.push({
                name: listItem.item.name || '',
                price: listItem.item.offers?.price?.toString() || null,
                originalPrice: null,
                currency: listItem.item.offers?.priceCurrency || null,
                image: resolveUrl(listItem.item.image, baseUrl),
                images: [],
                description: listItem.item.description || null,
                category: null,
                variants: [],
                inStock: true,
                url: resolveUrl(listItem.item.url, baseUrl),
              });
            }
          });
        }
      });
    } catch { /* Invalid JSON */ }
  });
  
  return products;
}

// ============ EMBEDDED JSON EXTRACTION ============

function extractProductsFromNextData($: CheerioAPI, baseUrl: URL): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  
  try {
    const nextDataScript = $('#__NEXT_DATA__').html();
    if (!nextDataScript) return products;
    
    const nextData = JSON.parse(nextDataScript);
    
    const findProducts = (obj: unknown, depth = 0): void => {
      if (depth > 10 || !obj) return;
      
      if (Array.isArray(obj)) {
        obj.forEach(item => findProducts(item, depth + 1));
        return;
      }
      
      if (typeof obj !== 'object') return;
      
      const record = obj as Record<string, unknown>;
      const hasName = typeof record.name === 'string' || typeof record.title === 'string' || typeof record.productName === 'string';
      const hasPrice = record.price !== undefined || record.amount !== undefined || record.formattedPrice !== undefined;
      const hasImage = typeof record.image === 'string' || typeof record.imageUrl === 'string' || typeof record.thumbnail === 'string';
      
      if (hasName && (hasPrice || hasImage)) {
        const name = (record.name || record.title || record.productName) as string;
        if (name && name.length > 2 && name.length < 200) {
          const rawPrice = (record.formattedPrice || record.price || record.amount) as string | number | null;
          const { price: priceStr, currency } = parsePrice(rawPrice);
          const image = (record.image || record.imageUrl || record.thumbnail) as string | undefined;
          const resolvedImage = image ? resolveUrl(image, baseUrl) : null;
          
          if (!products.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            products.push({
              name,
              price: priceStr,
              originalPrice: null,
              currency,
              image: resolvedImage,
              images: resolvedImage ? [resolvedImage] : [],
              description: typeof record.description === 'string' ? record.description.slice(0, 300) : null,
              category: typeof record.category === 'string' ? record.category : null,
              variants: [],
              inStock: true,
              url: typeof record.url === 'string' ? resolveUrl(record.url, baseUrl) : null,
            });
          }
        }
      }
      
      Object.values(record).forEach(val => findProducts(val, depth + 1));
    };
    
    findProducts(nextData);
  } catch (e) {
    console.log('[UnifiedScraper] Error parsing __NEXT_DATA__:', e);
  }
  
  return products;
}

function extractProductsFromEmbeddedJSON($: CheerioAPI, baseUrl: URL): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  
  const patterns = [
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/,
    /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});/,
    /window\.__APOLLO_STATE__\s*=\s*(\{[\s\S]*?\});/,
    /window\.APP_DATA\s*=\s*(\{[\s\S]*?\});/,
    /"products"\s*:\s*(\[[\s\S]*?\])/,
    /"items"\s*:\s*(\[[\s\S]*?\])/,
    /"menuItems"\s*:\s*(\[[\s\S]*?\])/,
  ];
  
  $('script').each((_, script) => {
    const content = $(script).html() || '';
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        try {
          const data = JSON.parse(match[1]);
          const items = Array.isArray(data) ? data : (data.products || data.items || data.menuItems || []);
          
          if (Array.isArray(items)) {
            for (const item of items) {
              if (typeof item === 'object' && item !== null) {
                const record = item as Record<string, unknown>;
                const name = (record.name || record.title || record.productName) as string;
                
                if (name && name.length > 2 && name.length < 200) {
                  const rawPrice = (record.formattedPrice || record.price || record.amount) as string | number | null;
                  const { price: priceStr, currency } = parsePrice(rawPrice);
                  const image = (record.image || record.imageUrl || record.thumbnail) as string | undefined;
                  const resolvedImage = image ? resolveUrl(image, baseUrl) : null;
                  
                  if (!products.some(p => p.name.toLowerCase() === name.toLowerCase())) {
                    products.push({
                      name,
                      price: priceStr,
                      originalPrice: null,
                      currency,
                      image: resolvedImage,
                      images: resolvedImage ? [resolvedImage] : [],
                      description: typeof record.description === 'string' ? record.description.slice(0, 300) : null,
                      category: typeof record.category === 'string' ? record.category : null,
                      variants: [],
                      inStock: true,
                      url: typeof record.url === 'string' ? resolveUrl(record.url, baseUrl) : null,
                    });
                  }
                }
              }
            }
          }
        } catch { /* JSON parse failed */ }
      }
    }
  });
  
  return products;
}

// ============ CSS SELECTOR EXTRACTION ============

function extractProductsFromCSS($: CheerioAPI, baseUrl: URL): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  const seenNames = new Set<string>();
  
  const productContainerSelectors = [
    '[class*="product-card"]', '[class*="product-item"]', '[class*="product_card"]',
    '[data-product]', '[data-product-id]', '[itemtype*="Product"]',
    '.product-card', '.product-grid-item', '.product-item', '.product',
    '[class*="ProductItem"]', '.ProductItem', '.product-block',
    '.ins-component__item', '[id^="product-"]',
  ];
  
  for (const selector of productContainerSelectors) {
    try {
      $(selector).each((_, el) => {
        const product = extractProductFromElement($, $(el), baseUrl);
        if (product && !seenNames.has(product.name.toLowerCase())) {
          seenNames.add(product.name.toLowerCase());
          products.push(product);
        }
      });
    } catch { /* Selector might not be valid */ }
  }
  
  return products;
}

function extractProductFromElement($: CheerioAPI, el: CheerioElement, baseUrl: URL): ScrapedProduct | null {
  const nameSelectors = [
    '.ins-component__title-inner', '.ins-component__title',
    'h1', 'h2', 'h3', 'h4',
    '[class*="title"]', '[class*="name"]', '[class*="product-title"]', '[class*="product-name"]',
    '.product-title', '.product-name', 'a[class*="product"]', 'a[aria-label]',
  ];
  
  let name: string | null = null;
  for (const selector of nameSelectors) {
    const nameEl = el.find(selector).first();
    if (nameEl.length) {
      const text = nameEl.text().trim();
      if (text && text.length > 1 && text.length < 200) {
        name = text;
        break;
      }
      if (selector === 'a[aria-label]') {
        const ariaLabel = nameEl.attr('aria-label');
        if (ariaLabel && ariaLabel.length > 2 && ariaLabel.length < 200) {
          name = ariaLabel;
          break;
        }
      }
    }
  }
  
  if (!name || name.length < 2 || name.length > 200) return null;
  
  // Price extraction
  const priceSelectors = [
    '.ins-component__price-value', '.ins-component__price-amount',
    '[class*="price"]', '[data-hook*="price"]', '.price', '.amount',
  ];
  
  let price: string | null = null;
  let originalPrice: string | null = null;
  
  for (const selector of priceSelectors) {
    el.find(selector).each((_, priceEl) => {
      const text = $(priceEl).text().trim();
      if (text && /[\d.,]+/.test(text)) {
        const isOriginal = $(priceEl).closest('[class*="original"], [class*="was"], del, s').length > 0;
        if (isOriginal) {
          if (!originalPrice) originalPrice = text;
        } else {
          if (!price) price = text;
        }
      }
    });
    if (price) break;
  }
  
  // Image extraction
  const imgSelectors = [
    '.ins-component__bg-image img', '.ins-picture img',
    'img[class*="product"]', 'img[data-product]', 'picture img', 'img',
  ];
  
  let image: string | null = null;
  const images: string[] = [];
  
  for (const selector of imgSelectors) {
    const imgEl = el.find(selector).first();
    if (imgEl.length) {
      const src = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy-src');
      const resolved = resolveUrl(src, baseUrl);
      if (resolved && !resolved.includes('placeholder') && !resolved.includes('loading')) {
        if (!image) image = resolved;
        if (!images.includes(resolved)) images.push(resolved);
      }
    }
  }
  
  // Description
  let description: string | null = null;
  const descSelectors = ['[class*="description"]', '[class*="excerpt"]', 'p'];
  for (const selector of descSelectors) {
    const descEl = el.find(selector).first();
    const text = descEl.text().trim();
    if (text && text.length > 20 && text !== name) {
      description = text.slice(0, 300);
      break;
    }
  }
  
  // Product URL
  const linkEl = el.find('a[href]').first();
  const productUrl = linkEl.length ? resolveUrl(linkEl.attr('href'), baseUrl) : null;
  
  // Currency
  const { currency } = parsePrice(price);
  
  return {
    name,
    price,
    originalPrice,
    currency,
    image,
    images,
    description,
    category: null,
    variants: [],
    inStock: true,
    url: productUrl,
  };
}

function extractAllProducts($: CheerioAPI, baseUrl: URL): ScrapedProduct[] {
  const allProducts: ScrapedProduct[] = [];
  const seenNames = new Set<string>();
  
  // Try all methods
  const structuredProducts = extractProductsFromStructuredData($, baseUrl);
  structuredProducts.forEach(p => {
    if (!seenNames.has(p.name.toLowerCase())) {
      seenNames.add(p.name.toLowerCase());
      allProducts.push(p);
    }
  });
  
  const nextDataProducts = extractProductsFromNextData($, baseUrl);
  nextDataProducts.forEach(p => {
    if (!seenNames.has(p.name.toLowerCase())) {
      seenNames.add(p.name.toLowerCase());
      allProducts.push(p);
    }
  });
  
  const embeddedProducts = extractProductsFromEmbeddedJSON($, baseUrl);
  embeddedProducts.forEach(p => {
    if (!seenNames.has(p.name.toLowerCase())) {
      seenNames.add(p.name.toLowerCase());
      allProducts.push(p);
    }
  });
  
  const cssProducts = extractProductsFromCSS($, baseUrl);
  cssProducts.forEach(p => {
    if (!seenNames.has(p.name.toLowerCase())) {
      seenNames.add(p.name.toLowerCase());
      allProducts.push(p);
    }
  });
  
  return allProducts;
}

function findProductPageUrls($: CheerioAPI, baseUrl: URL): string[] {
  const urls: string[] = [];
  const patterns = [
    /shop/i, /products/i, /store/i, /catalog/i, /collection/i,
    /all-products/i, /buy/i, /order/i, /menu/i
  ];
  
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    
    const text = $(el).text().toLowerCase();
    const hrefLower = href.toLowerCase();
    
    if (patterns.some(p => p.test(hrefLower) || p.test(text))) {
      const resolved = resolveUrl(href, baseUrl);
      if (resolved && !urls.includes(resolved) && resolved.startsWith(baseUrl.origin)) {
        urls.push(resolved);
      }
    }
  });
  
  return urls;
}

// ============ BRAND & CONTENT EXTRACTION ============

function extractBrandName($: CheerioAPI, url: string): string {
  const ogSiteName = $('meta[property="og:site_name"]').attr('content');
  if (ogSiteName) return ogSiteName;
  
  const title = $('title').text().trim();
  const titleParts = title.split(/[-|–—]/);
  if (titleParts.length > 0 && titleParts[0].trim().length > 1) {
    return titleParts[0].trim();
  }
  
  const logoAlt = $('img[class*="logo"], header img').first().attr('alt');
  if (logoAlt && logoAlt.length < 50) return logoAlt;
  
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const domainName = hostname.split('.')[0];
    return domainName.charAt(0).toUpperCase() + domainName.slice(1);
  } catch {
    return 'Unknown Brand';
  }
}

function extractTagline($: CheerioAPI): string | null {
  const selectors = [
    '[class*="tagline"]', '[class*="slogan"]', '[class*="subtitle"]',
    'header p', '.hero p', 'meta[name="description"]',
  ];
  
  for (const selector of selectors) {
    const el = $(selector).first();
    const text = el.text().trim() || el.attr('content');
    if (text && text.length > 10 && text.length < 150) {
      return text;
    }
  }
  
  return null;
}

function extractLogo($: CheerioAPI, baseUrl: URL): string | null {
  const selectors = [
    'img[class*="logo"]', 'img[alt*="logo" i]', 'img[src*="logo"]',
    '.logo img', '#logo img', 'header img:first-of-type', '[class*="brand"] img',
  ];
  
  for (const selector of selectors) {
    const img = $(selector).first();
    const src = img.attr('src');
    if (src) {
      return resolveUrl(src, baseUrl);
    }
  }
  
  return null;
}

function extractFavicon($: CheerioAPI, baseUrl: URL): string | null {
  const selectors = ['link[rel="icon"]', 'link[rel="shortcut icon"]', 'link[rel="apple-touch-icon"]'];
  
  for (const selector of selectors) {
    const href = $(selector).first().attr('href');
    if (href) {
      return resolveUrl(href, baseUrl);
    }
  }
  
  return resolveUrl('/favicon.ico', baseUrl);
}

interface ColorExtraction {
  primary: string | null;
  secondary: string | null;
  accent: string | null;
  all: string[];
}

function extractColorsWithPriority($: CheerioAPI, html: string): ColorExtraction {
  const colorCounts: Record<string, number> = {};
  const hexRegex = /#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/g;
  
  const cssVarColors: string[] = [];
  
  // 1. Look for CSS variables (highest priority)
  const cssVarRegex = /--(?:primary|brand|main|accent|secondary|theme)[^:]*:\s*(#[0-9A-Fa-f]{6})/gi;
  let match;
  while ((match = cssVarRegex.exec(html)) !== null) {
    cssVarColors.push(match[1].toUpperCase());
  }
  
  // 2. Look for Lightspeed/company.site theme colors in embedded state
  const lightspeedColorRegex = /"(?:primaryColor|accentColor|brandColor|themeColor|buttonColor)"\s*:\s*"(#[0-9A-Fa-f]{6})"/gi;
  while ((match = lightspeedColorRegex.exec(html)) !== null) {
    cssVarColors.push(match[1].toUpperCase());
  }
  
  // 3. Look for theme-color meta tag
  const themeColorMeta = $('meta[name="theme-color"]').attr('content');
  if (themeColorMeta && /^#[0-9A-Fa-f]{6}$/i.test(themeColorMeta)) {
    cssVarColors.unshift(themeColorMeta.toUpperCase());
  }
  
  // 4. Look for colors in window.initialState (Lightspeed stores)
  const stateColorRegex = /color['"]\s*:\s*['"](#[0-9A-Fa-f]{6})['"]/gi;
  while ((match = stateColorRegex.exec(html)) !== null) {
    const color = match[1].toUpperCase();
    colorCounts[color] = (colorCounts[color] || 0) + 3; // High weight for state colors
  }
  
  // 5. Look for button/CTA background colors (often brand colors)
  $('button, [class*="btn"], [class*="cta"], a[class*="button"]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const bgMatch = style.match(/background(?:-color)?:\s*(#[0-9A-Fa-f]{6})/i);
    if (bgMatch) {
      const color = bgMatch[1].toUpperCase();
      colorCounts[color] = (colorCounts[color] || 0) + 5; // Very high weight for button colors
    }
  });
  
  // 6. Extract from inline styles
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const matches = style.match(hexRegex);
    matches?.forEach(color => {
      const upper = color.toUpperCase();
      colorCounts[upper] = (colorCounts[upper] || 0) + 2;
    });
  });
  
  // 7. Extract from stylesheets
  $('style').each((_, styleEl) => {
    const css = $(styleEl).html() || '';
    const matches = css.match(hexRegex);
    matches?.forEach(color => {
      const upper = color.toUpperCase();
      colorCounts[upper] = (colorCounts[upper] || 0) + 1;
    });
  });
  
  // Colors to exclude (neutrals)
  const excludeColors = [
    '#FFFFFF', '#000000', '#FFFFF', '#FEFEFE', '#FDFDFD',
    '#333333', '#666666', '#999999', '#CCCCCC', '#DDDDDD',
    '#F5F5F5', '#EEEEEE', '#E5E5E5', '#F0F0F0', '#FAFAFA',
    '#111111', '#222222', '#444444', '#555555', '#777777',
    '#888888', '#AAAAAA', '#BBBBBB', '#F8F8F8', '#E0E0E0',
  ];
  
  const sortedColors = Object.entries(colorCounts)
    .filter(([color]) => !excludeColors.includes(color))
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);
  
  const primaryFromVars = cssVarColors.find(c => !excludeColors.includes(c));
  
  return {
    primary: primaryFromVars || sortedColors[0] || null,
    secondary: sortedColors[1] || cssVarColors[1] || null,
    accent: sortedColors[2] || cssVarColors[2] || null,
    all: [...new Set([...cssVarColors, ...sortedColors])].slice(0, 15),
  };
}

interface ImageExtraction {
  hero: string | null;
  banners: string[];
  all: string[];
}

function extractImagesWithContext($: CheerioAPI, baseUrl: URL): ImageExtraction {
  const all: string[] = [];
  let hero: string | null = null;
  const banners: string[] = [];
  
  const heroSelectors = ['.hero img', '[class*="hero"] img', '[class*="banner"] img', 'section:first-of-type img', 'header img'];
  
  for (const selector of heroSelectors) {
    const img = $(selector).first();
    if (img.length) {
      hero = resolveUrl(img.attr('src'), baseUrl);
      if (hero) break;
    }
  }
  
  $('[class*="banner"] img, [class*="slider"] img, [class*="carousel"] img').each((_, img) => {
    const src = resolveUrl($(img).attr('src'), baseUrl);
    if (src && !banners.includes(src)) {
      banners.push(src);
    }
  });
  
  $('img').each((_, img) => {
    const src = resolveUrl($(img).attr('src') || $(img).attr('data-src'), baseUrl);
    if (src && !all.includes(src)) {
      const width = parseInt($(img).attr('width') || '100');
      const height = parseInt($(img).attr('height') || '100');
      if (width >= 50 && height >= 50) {
        all.push(src);
      }
    }
  });
  
  return { hero, banners, all: all.slice(0, 30) };
}

interface TextContent {
  headlines: string[];
  descriptions: string[];
  usps: string[];
}

function extractTextContent($: CheerioAPI): TextContent {
  const headlines: string[] = [];
  const descriptions: string[] = [];
  const usps: string[] = [];
  
  $('h1, h2, h3').each((_, h) => {
    const text = $(h).text().trim();
    if (text && text.length > 3 && text.length < 200) {
      headlines.push(text);
    }
  });
  
  $('p').each((_, p) => {
    const text = $(p).text().trim();
    if (text && text.length > 40 && text.length < 500) {
      descriptions.push(text);
    }
  });
  
  const uspSelectors = ['[class*="feature"]', '[class*="benefit"]', '[class*="usp"]', '[class*="highlight"]', 'li'];
  
  uspSelectors.forEach(selector => {
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 10 && text.length < 100 && usps.length < 10) {
        if (!usps.includes(text)) {
          usps.push(text);
        }
      }
    });
  });
  
  return {
    headlines: headlines.slice(0, 10),
    descriptions: descriptions.slice(0, 10),
    usps: usps.slice(0, 10),
  };
}

interface ContactInfo {
  email: string | null;
  phone: string | null;
  address: string | null;
  social: Record<string, string>;
}

function extractContactInfo($: CheerioAPI, html: string): ContactInfo {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = html.match(emailRegex);
  const email = emails?.[0] || null;
  
  const phoneRegex = /(?:\+92|0)?[\s.-]?(?:3\d{2}|[1-9]\d{2})[\s.-]?\d{7}|\+?[\d\s.-]{10,}/g;
  const phones = html.match(phoneRegex);
  const phone = phones?.[0]?.trim() || null;
  
  const social: Record<string, string> = {};
  const socialPatterns: Record<string, RegExp> = {
    facebook: /facebook\.com\/[^\s"'<>]+/i,
    instagram: /instagram\.com\/[^\s"'<>]+/i,
    twitter: /(?:twitter|x)\.com\/[^\s"'<>]+/i,
    linkedin: /linkedin\.com\/[^\s"'<>]+/i,
    youtube: /youtube\.com\/[^\s"'<>]+/i,
    tiktok: /tiktok\.com\/[^\s"'<>]+/i,
  };
  
  Object.entries(socialPatterns).forEach(([platform, regex]) => {
    const match = html.match(regex);
    if (match) {
      social[platform] = `https://${match[0]}`;
    }
  });
  
  return { email, phone, address: null, social };
}

function extractStructuredData($: CheerioAPI): unknown[] {
  const data: unknown[] = [];
  
  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      data.push(JSON.parse($(script).html() || ''));
    } catch { /* Invalid JSON */ }
  });
  
  return data;
}

function extractLandingPageContent($: CheerioAPI): LandingPageContent {
  const content: LandingPageContent = {
    heroHeadline: null,
    heroSubheadline: null,
    ctaText: [],
    valuePropositions: [],
    serviceDescriptions: [],
    pricingInfo: [],
    testimonials: [],
    statsNumbers: [],
    featuresList: [],
  };
  
  // Hero Section
  const heroSelectors = [
    'section:first-of-type', '.hero', '[class*="hero"]', '[class*="banner"]',
    'header + section', 'header + div', '.jumbotron', '[class*="landing"]',
  ];
  
  for (const selector of heroSelectors) {
    const heroSection = $(selector).first();
    if (heroSection.length) {
      const h1 = heroSection.find('h1').first();
      if (h1.length) {
        content.heroHeadline = h1.text().trim();
      }
      
      const subheadline = heroSection.find('h2, h1 + p, h1 + div > p').first();
      if (subheadline.length && !content.heroSubheadline) {
        const text = subheadline.text().trim();
        if (text.length > 10 && text.length < 300) {
          content.heroSubheadline = text;
        }
      }
      
      if (content.heroHeadline) break;
    }
  }
  
  if (!content.heroHeadline) {
    const firstH1 = $('h1').first();
    if (firstH1.length) {
      content.heroHeadline = firstH1.text().trim();
    }
  }
  
  // CTAs
  const ctaSelectors = [
    'a[class*="cta"]', 'button[class*="cta"]',
    'a[class*="btn-primary"]', 'button[class*="btn-primary"]',
    '.hero a[class*="btn"]', '.hero button',
    'a.btn', 'button.btn',
  ];
  
  const ctaTexts = new Set<string>();
  ctaSelectors.forEach(selector => {
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 2 && text.length < 50) {
        if (!/^(home|about|contact|login|sign in|menu|search)$/i.test(text)) {
          ctaTexts.add(text);
        }
      }
    });
  });
  content.ctaText = Array.from(ctaTexts).slice(0, 5);
  
  // Value Propositions
  const allTextContent = $('body').text();
  const valuePatterns = [
    /we (?:build|create|make|design|develop|help|deliver|provide)[^.!]+/gi,
    /(?:build|create|launch|get|start) your [^.!]+/gi,
    /in (?:just )?(?:\d+|minutes?|seconds?|hours?|days?)[^.!]*/gi,
    /(?:no|without) (?:coding|technical|experience)[^.!]*/gi,
    /(?:\d+%|\d+x|\d+\+) [^.!]+/gi,
    /(?:free|affordable|easy|fast|quick|simple)[^.!]{10,60}/gi,
    /save (?:time|money|\$?\d+)[^.!]*/gi,
    /(?:trusted by|used by|loved by) [^.!]+/gi,
  ];
  
  valuePatterns.forEach(pattern => {
    const matches = allTextContent.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.trim().replace(/\s+/g, ' ');
        if (cleaned.length > 15 && cleaned.length < 150) {
          if (!content.valuePropositions.includes(cleaned)) {
            content.valuePropositions.push(cleaned);
          }
        }
      });
    }
  });
  content.valuePropositions = content.valuePropositions.slice(0, 8);
  
  // Service Descriptions
  const serviceSelectors = [
    '[class*="service"]', '[class*="what-we-do"]', '[class*="offerings"]',
    '[class*="solutions"]', '[class*="features"]', '[class*="about"]',
  ];
  
  serviceSelectors.forEach(selector => {
    $(selector).each((_, section) => {
      const heading = $(section).find('h2, h3').first().text().trim();
      const desc = $(section).find('p').first().text().trim();
      
      if (desc && desc.length > 30 && desc.length < 400) {
        const fullDesc = heading ? `${heading}: ${desc}` : desc;
        if (!content.serviceDescriptions.some(s => s.includes(desc.substring(0, 30)))) {
          content.serviceDescriptions.push(fullDesc);
        }
      }
    });
  });
  content.serviceDescriptions = content.serviceDescriptions.slice(0, 5);
  
  // Pricing Info
  const pricingSelectors = [
    '[class*="pricing"]', '[class*="plans"]', '[class*="packages"]',
    '#pricing', '#plans', 'section[id*="pricing"]',
  ];
  
  pricingSelectors.forEach(selector => {
    $(selector).find('[class*="card"], [class*="plan"], [class*="tier"], > div > div').each((_, card) => {
      const planName = $(card).find('h3, h4, [class*="name"], [class*="title"]').first().text().trim();
      
      let price: string | null = null;
      const priceEl = $(card).find('[class*="price"], [class*="amount"]').first();
      if (priceEl.length) {
        price = priceEl.text().trim();
      } else {
        const cardText = $(card).text();
        const priceMatch = cardText.match(/\$[\d,]+(?:\.\d{2})?(?:\/\w+)?|free|custom/i);
        if (priceMatch) price = priceMatch[0];
      }
      
      const features: string[] = [];
      $(card).find('li, [class*="feature"]').each((_, li) => {
        const text = $(li).text().trim();
        if (text && text.length > 3 && text.length < 100) {
          features.push(text);
        }
      });
      
      if (planName && (price || features.length > 0)) {
        if (planName.length > 1 && planName.length < 50) {
          content.pricingInfo.push({
            planName,
            price,
            features: features.slice(0, 10),
          });
        }
      }
    });
  });
  content.pricingInfo = content.pricingInfo.slice(0, 5);
  
  // Testimonials
  const testimonialSelectors = [
    '[class*="testimonial"]', '[class*="review"]', '[class*="quote"]',
    'blockquote', '[class*="feedback"]',
  ];
  
  testimonialSelectors.forEach(selector => {
    $(selector).each((_, el) => {
      const text = $(el).find('p, [class*="text"], [class*="content"]').first().text().trim();
      if (text && text.length > 20 && text.length < 500) {
        if (!content.testimonials.some(t => t.includes(text.substring(0, 30)))) {
          content.testimonials.push(text);
        }
      }
    });
  });
  content.testimonials = content.testimonials.slice(0, 3);
  
  // Stats/Numbers
  const statPattern = /(\d+[kK]?\+?|\d+,\d+\+?|\d+%)\s*([a-zA-Z\s]+)/g;
  const statsSelectors = ['[class*="stat"]', '[class*="counter"]', '[class*="number"]', '[class*="metric"]'];
  
  statsSelectors.forEach(selector => {
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      const matches = text.matchAll(statPattern);
      for (const match of matches) {
        const value = match[1];
        const label = match[2].trim();
        if (label.length > 2 && label.length < 50) {
          content.statsNumbers.push({ value, label });
        }
      }
    });
  });
  content.statsNumbers = content.statsNumbers.slice(0, 6);
  
  // Features List
  const featureSelectors = [
    '[class*="feature"]', '[class*="benefit"]', '[class*="advantage"]',
    '[class*="capability"]', '[class*="highlights"]',
  ];
  
  featureSelectors.forEach(selector => {
    $(selector).each((_, el) => {
      const titleEl = $(el).find('h3, h4, [class*="title"], [class*="heading"]').first();
      const descEl = $(el).find('p, [class*="desc"], [class*="text"]').first();
      
      const title = titleEl.text().trim();
      const description = descEl.text().trim();
      
      if (title && title.length > 2 && title.length < 80) {
        if (!content.featuresList.some(f => f.title === title)) {
          content.featuresList.push({
            title,
            description: description.length > 10 && description.length < 300 ? description : null,
          });
        }
      }
    });
  });
  content.featuresList = content.featuresList.slice(0, 10);
  
  return content;
}

// ============ DETECTION FUNCTIONS ============

function detectEcommerce($: CheerioAPI, products: ScrapedProduct[]): boolean {
  const indicators = [
    products.length > 0,
    $('[class*="cart"]').length > 0,
    $('[class*="checkout"]').length > 0,
    $('[class*="add-to-cart"]').length > 0,
    $('[class*="buy"]').length > 0,
    $('[class*="price"]').length > 0,
    $('[class*="shop"]').length > 0,
  ];
  
  return indicators.filter(Boolean).length >= 2;
}

function detectProductType(
  $: CheerioAPI, 
  products: ScrapedProduct[], 
  textContent: TextContent
): 'physical' | 'digital' | 'service' {
  const allText = [
    ...textContent.headlines,
    ...textContent.descriptions,
    ...products.map(p => p.name + ' ' + (p.description || '')),
  ].join(' ').toLowerCase();
  
  const physicalIndicators = [
    /shipping/i, /delivery/i, /weight/i, /size/i, /dimensions/i,
    /package/i, /box/i, /bottle/i, /jar/i, /pack/i,
    /gram|kg|ml|liter|oz|lb/i,
  ];
  
  const digitalIndicators = [
    /download/i, /instant access/i, /pdf/i, /ebook/i, /course/i,
    /subscription/i, /license/i, /software/i, /app/i,
  ];
  
  const serviceIndicators = [
    /consultation/i, /appointment/i, /session/i, /service/i,
    /hour/i, /booking/i, /schedule/i, /hire/i,
  ];
  
  const physicalScore = physicalIndicators.filter(r => r.test(allText)).length;
  const digitalScore = digitalIndicators.filter(r => r.test(allText)).length;
  const serviceScore = serviceIndicators.filter(r => r.test(allText)).length;
  
  if (physicalScore >= digitalScore && physicalScore >= serviceScore) {
    return 'physical';
  } else if (digitalScore >= serviceScore) {
    return 'digital';
  } else {
    return 'service';
  }
}

function detectWebsiteCategory(
  $: CheerioAPI,
  products: ScrapedProduct[],
  textContent: TextContent,
  landingContent: LandingPageContent
): 'ecommerce' | 'restaurant' | 'saas' | 'agency' | 'portfolio' | 'landing-page' | 'corporate' | 'unknown' {
  
  const allText = [
    ...textContent.headlines,
    ...textContent.descriptions,
    landingContent.heroHeadline || '',
    landingContent.heroSubheadline || '',
    ...landingContent.serviceDescriptions,
  ].join(' ').toLowerCase();
  
  const hasCart = $('[class*="cart"], [class*="checkout"], [data-cart]').length > 0;
  const hasAddToCart = $('[class*="add-to-cart"], button:contains("Add to Cart")').length > 0;
  const hasPricing = landingContent.pricingInfo.length > 0;
  const hasProducts = products.length > 0;
  
  // Restaurant indicators
  const restaurantPatterns = [
    /menu/i, /order online/i, /delivery/i, /dine-in/i, /takeaway/i,
    /restaurant/i, /cafe/i, /food/i, /cuisine/i, /dish/i,
    /reservation/i, /table for/i, /hungry/i,
  ];
  const isRestaurant = restaurantPatterns.filter(p => p.test(allText)).length >= 2;
  
  // SaaS indicators
  const saasPatterns = [
    /sign up/i, /get started/i, /free trial/i, /pricing/i, /plans/i,
    /platform/i, /software/i, /app/i, /dashboard/i, /analytics/i,
    /integration/i, /api/i, /automation/i, /saas/i, /cloud/i,
    /per month|\/mo|\/month/i, /annual|yearly/i,
  ];
  const isSaas = saasPatterns.filter(p => p.test(allText)).length >= 3 || 
    (hasPricing && !hasProducts);
  
  // Agency indicators  
  const agencyPatterns = [
    /agency/i, /we build/i, /we create/i, /we design/i, /we develop/i,
    /our team/i, /our work/i, /portfolio/i, /case stud/i, /clients/i,
    /contact us/i, /hire us/i, /get a quote/i, /let's talk/i,
    /web development/i, /marketing/i, /branding/i, /consulting/i,
  ];
  const isAgency = agencyPatterns.filter(p => p.test(allText)).length >= 3;
  
  // Portfolio indicators
  const portfolioPatterns = [
    /my work/i, /my projects/i, /about me/i, /hire me/i,
    /freelancer/i, /designer/i, /developer/i, /photographer/i,
    /resume/i, /cv/i,
  ];
  const isPortfolio = portfolioPatterns.filter(p => p.test(allText)).length >= 2;
  
  // Ecommerce check
  if (hasCart || hasAddToCart || (hasProducts && products.some(p => p.price))) {
    if (isRestaurant) return 'restaurant';
    return 'ecommerce';
  }
  
  if (isRestaurant) return 'restaurant';
  if (isSaas) return 'saas';
  if (isAgency) return 'agency';
  if (isPortfolio) return 'portfolio';
  
  // Landing page (has hero, CTA but not much else)
  if (landingContent.heroHeadline && landingContent.ctaText.length > 0) {
    return 'landing-page';
  }
  
  return 'unknown';
}

// ============ LEGACY COMPATIBILITY ============

// Re-export with old names for backward compatibility
export { scrapeWebsite as enhancedScrapeWebsite };
export type { UnifiedScrapedData as EnhancedScrapedData };
