import { JSDOM } from 'jsdom';

export interface ScrapedProduct {
  name: string;
  price: string | null;
  originalPrice: string | null; // For discounted items
  currency: string | null;
  image: string | null;
  images: string[]; // Multiple product images
  description: string | null;
  category: string | null;
  variants: string[]; // Size variants like 250g, 500g
  inStock: boolean;
  url: string | null;
}

export interface EnhancedScrapedData {
  url: string;
  
  // Brand Identity
  brandName: string;
  tagline: string | null;
  logo: string | null;
  favicon: string | null;
  
  // Colors (prioritized by frequency/importance)
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
}

/**
 * Enhanced website scraper with better product extraction
 */
export async function enhancedScrapeWebsite(url: string): Promise<EnhancedScrapedData> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
  
  // Fetch main page
  const mainPageData = await fetchAndParse(normalizedUrl);
  
  // Try to find and scrape product/shop pages for more products
  const productPageUrls = findProductPageUrls(mainPageData.document, mainPageData.baseUrl);
  
  let allProducts = extractProducts(mainPageData.document, mainPageData.baseUrl);
  
  // Scrape additional product pages (limit to 3 to avoid too many requests)
  for (const productPageUrl of productPageUrls.slice(0, 3)) {
    try {
      const productPageData = await fetchAndParse(productPageUrl);
      const moreProducts = extractProducts(productPageData.document, productPageData.baseUrl);
      
      // Merge products, avoiding duplicates
      moreProducts.forEach(product => {
        if (!allProducts.some(p => p.name === product.name && p.price === product.price)) {
          allProducts.push(product);
        }
      });
    } catch (e) {
      console.log(`[EnhancedScraper] Could not scrape ${productPageUrl}:`, e);
    }
  }
  
  // Extract brand identity
  const brandName = extractBrandName(mainPageData.document, normalizedUrl);
  const tagline = extractTagline(mainPageData.document);
  const logo = extractLogo(mainPageData.document, mainPageData.baseUrl);
  
  // Extract colors with priority
  const colors = extractColorsWithPriority(mainPageData.document, mainPageData.html);
  
  // Extract images
  const images = extractImagesWithContext(mainPageData.document, mainPageData.baseUrl);
  
  // Extract text content
  const textContent = extractTextContent(mainPageData.document);
  
  // Extract contact info
  const contactInfo = extractContactInfo(mainPageData.document, mainPageData.html);
  
  // Extract structured data
  const structuredData = extractStructuredData(mainPageData.document);
  
  // Detect business type
  const isEcommerce = detectEcommerce(mainPageData.document, allProducts);
  const estimatedProductType = detectProductType(mainPageData.document, allProducts, textContent);
  
  // Extract favicon
  const favicon = extractFavicon(mainPageData.document, mainPageData.baseUrl);
  
  // Extract OG data
  const ogImage = mainPageData.document.querySelector('meta[property="og:image"]')?.getAttribute('content');
  
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
    
    products: allProducts,
    productCategories: [...new Set(allProducts.map(p => p.category).filter(Boolean))] as string[],
    
    heroImage: images.hero,
    bannerImages: images.banners,
    allImages: images.all,
    
    headlines: textContent.headlines,
    descriptions: textContent.descriptions,
    uniqueSellingPoints: textContent.usps,
    
    contactEmail: contactInfo.email,
    phone: contactInfo.phone,
    address: contactInfo.address,
    socialLinks: contactInfo.social,
    
    metaTitle: mainPageData.document.querySelector('title')?.textContent?.trim() || brandName,
    metaDescription: mainPageData.document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    ogImage: ogImage ? resolveUrl(ogImage, mainPageData.baseUrl) : null,
    structuredData,
    
    isEcommerce,
    hasProducts: allProducts.length > 0,
    estimatedProductType,
  };
}

// ============ HELPER FUNCTIONS ============

async function fetchAndParse(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  
  return {
    html,
    document: dom.window.document,
    baseUrl: new URL(url),
  };
}

function resolveUrl(relativeUrl: string | null | undefined, baseUrl: URL): string | null {
  if (!relativeUrl) return null;
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return null;
  }
}

function findProductPageUrls(document: Document, baseUrl: URL): string[] {
  const urls: string[] = [];
  const patterns = [
    /shop/i, /products/i, /store/i, /catalog/i, /collection/i,
    /all-products/i, /buy/i, /order/i
  ];
  
  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    
    const text = a.textContent?.toLowerCase() || '';
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

function extractProducts(document: Document, baseUrl: URL): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  const seenNames = new Set<string>();
  
  // Enhanced product selectors for various e-commerce platforms
  const productContainerSelectors = [
    // Generic
    '[class*="product-card"]',
    '[class*="product-item"]',
    '[class*="product_card"]',
    '[class*="product_item"]',
    '[data-product]',
    '[data-product-id]',
    '[itemtype*="Product"]',
    
    // Shopify
    '.product-card',
    '.product-grid-item',
    '.product-item',
    
    // WooCommerce
    '.product',
    '.wc-product',
    
    // Wix
    '[data-hook="product-item"]',
    '[class*="ProductItem"]',
    
    // Squarespace
    '.ProductItem',
    '.product-block',
    
    // Generic cards that might be products
    '.card[class*="product"]',
    '.item[class*="product"]',
    
    // Ecwid/Lightspeed (company.site)
    '.grid-product',
    '.ec-product',
    '.ins-component__item',
    '[id^="product-"]',
    '.ins-component__item-wrap',
  ];
  
  // Try each selector
  for (const selector of productContainerSelectors) {
    try {
      document.querySelectorAll(selector).forEach(el => {
        const product = extractProductFromElement(el, baseUrl);
        if (product && !seenNames.has(product.name.toLowerCase())) {
          seenNames.add(product.name.toLowerCase());
          products.push(product);
        }
      });
    } catch {
      // Selector might not be valid, skip
    }
  }
  
  // Try Lightspeed/Ecwid embedded state (company.site)
  if (products.length < 3) {
    const lightspeedProducts = extractProductsFromLightspeedState(document, baseUrl);
    lightspeedProducts.forEach(p => {
      if (!seenNames.has(p.name.toLowerCase())) {
        seenNames.add(p.name.toLowerCase());
        products.push(p);
      }
    });
  }
  
  // If no products found, try structured data
  if (products.length === 0) {
    const structuredProducts = extractProductsFromStructuredData(document, baseUrl);
    structuredProducts.forEach(p => {
      if (!seenNames.has(p.name.toLowerCase())) {
        seenNames.add(p.name.toLowerCase());
        products.push(p);
      }
    });
  }
  
  // If still no products, try a more aggressive approach
  if (products.length === 0) {
    const aggressiveProducts = extractProductsAggressive(document, baseUrl);
    aggressiveProducts.forEach(p => {
      if (!seenNames.has(p.name.toLowerCase())) {
        seenNames.add(p.name.toLowerCase());
        products.push(p);
      }
    });
  }
  
  return products;
}

function extractProductFromElement(el: Element, baseUrl: URL): ScrapedProduct | null {
  // Name extraction - try multiple selectors
  const nameSelectors = [
    // Lightspeed/company.site specific
    '.ins-component__title-inner',
    '.ins-component__title',
    // Generic
    'h1', 'h2', 'h3', 'h4',
    '[class*="title"]',
    '[class*="name"]',
    '[class*="product-title"]',
    '[class*="product-name"]',
    '[data-hook="product-item-name"]',
    '.product-title',
    '.product-name',
    'a[class*="product"]',
    // Also check aria-label on links
    'a[aria-label]',
  ];
  
  let name: string | null = null;
  for (const selector of nameSelectors) {
    const nameEl = el.querySelector(selector);
    if (nameEl?.textContent?.trim()) {
      name = nameEl.textContent.trim();
      break;
    }
    // Check aria-label for Lightspeed links
    if (selector === 'a[aria-label]' && nameEl) {
      const ariaLabel = nameEl.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.length > 2 && ariaLabel.length < 200) {
        name = ariaLabel;
        break;
      }
    }
  }
  
  if (!name || name.length < 2 || name.length > 200) return null;
  
  // Price extraction
  const priceSelectors = [
    // Lightspeed/company.site specific
    '.ins-component__price-value',
    '.ins-component__price-amount',
    // Generic
    '[class*="price"]',
    '[data-hook*="price"]',
    '.price',
    '.amount',
    '[class*="cost"]',
  ];
  
  let price: string | null = null;
  let originalPrice: string | null = null;
  
  for (const selector of priceSelectors) {
    const priceEls = el.querySelectorAll(selector);
    priceEls.forEach(priceEl => {
      const text = priceEl.textContent?.trim();
      if (text && /[\d.,]+/.test(text)) {
        // Check if it's a "was" price (original/crossed out)
        if (priceEl.closest('[class*="original"]') || 
            priceEl.closest('[class*="was"]') ||
            priceEl.closest('del') ||
            priceEl.closest('s')) {
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
    // Lightspeed/company.site specific
    '.ins-component__bg-image img',
    '.ins-picture img',
    // Generic
    'img[class*="product"]',
    'img[data-product]',
    'picture img',
    'img',
  ];
  
  let image: string | null = null;
  const images: string[] = [];
  
  for (const selector of imgSelectors) {
    const imgEl = el.querySelector(selector) as HTMLImageElement;
    if (imgEl) {
      // Try different src attributes
      const src = imgEl.getAttribute('src') || 
                  imgEl.getAttribute('data-src') || 
                  imgEl.getAttribute('data-lazy-src') ||
                  imgEl.getAttribute('data-original');
      
      const resolved = resolveUrl(src, baseUrl);
      if (resolved && !resolved.includes('placeholder') && !resolved.includes('loading')) {
        if (!image) image = resolved;
        if (!images.includes(resolved)) images.push(resolved);
      }
    }
  }
  
  // Description
  const descSelectors = [
    '[class*="description"]',
    '[class*="excerpt"]',
    'p',
  ];
  
  let description: string | null = null;
  for (const selector of descSelectors) {
    const descEl = el.querySelector(selector);
    const text = descEl?.textContent?.trim();
    if (text && text.length > 20 && text !== name) {
      description = text.slice(0, 300);
      break;
    }
  }
  
  // Product URL
  const linkEl = el.querySelector('a[href]');
  const productUrl = linkEl ? resolveUrl(linkEl.getAttribute('href'), baseUrl) : null;
  
  // Extract currency from price
  let currency: string | null = null;
  const priceStr = price as string | null;
  if (priceStr) {
    if (priceStr.includes('Rs') || priceStr.includes('₨')) currency = 'PKR';
    else if (priceStr.includes('$')) currency = 'USD';
    else if (priceStr.includes('€')) currency = 'EUR';
    else if (priceStr.includes('£')) currency = 'GBP';
    else if (priceStr.includes('₹')) currency = 'INR';
  }
  
  return {
    name,
    price,
    originalPrice,
    currency,
    image,
    images,
    description,
    category: null, // Would need more context
    variants: [],
    inStock: true, // Default assumption
    url: productUrl,
  };
}

function extractProductsFromStructuredData(document: Document, baseUrl: URL): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  
  document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    try {
      const data = JSON.parse(script.textContent || '');
      
      // Handle array of items
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
        
        // Handle ItemList with products
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
    } catch {
      // Invalid JSON
    }
  });
  
  return products;
}

/**
 * Extract products from Lightspeed/Ecwid embedded state (company.site)
 * These sites embed product data in window.initialState
 */
function extractProductsFromLightspeedState(document: Document, baseUrl: URL): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  
  // Look for the initialState script
  const scripts = document.querySelectorAll('script');
  
  for (const script of scripts) {
    const content = script.textContent || '';
    
    // Look for window.initialState pattern
    const stateMatch = content.match(/window\.initialState\s*=\s*"([\s\S]+?)";/);
    if (stateMatch) {
      try {
        // The state is a JSON string that's been escaped - need careful unescaping
        // First, use JSON.parse to handle the outer string escaping
        let jsonStr: string;
        try {
          // Wrap in quotes and parse as a JSON string to handle escape sequences
          jsonStr = JSON.parse('"' + stateMatch[1] + '"');
        } catch {
          // Fallback: manual unescaping
          jsonStr = stateMatch[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');
        }
        
        const state = JSON.parse(jsonStr);
        
        // Navigate to tile data which contains store products
        if (state.tile?.tileList) {
          for (const tile of state.tile.tileList) {
            // Look for STORE type tiles
            if (tile.type === 'STORE' && tile.externalContent?.storeData?.products) {
              const storeProducts = tile.externalContent.storeData.products;
              
              for (const p of storeProducts) {
                if (p.name && p.enabled !== false) {
                  products.push({
                    name: p.name,
                    price: p.formattedPrice || (p.price ? `${p.price}Rs` : null),
                    originalPrice: null,
                    currency: 'PKR', // Default for company.site PK
                    image: p.thumbnailImageUrl || p.imageUrl || null,
                    images: [
                      p.thumbnailImageUrl,
                      p.imageUrl,
                      p.fullImageUrl,
                      p.alternativeProductImage?.imageUrl,
                    ].filter(Boolean) as string[],
                    description: p.description ? stripHtml(p.description) : null,
                    category: null,
                    variants: [],
                    inStock: p.inStock !== false,
                    url: p.url || null,
                  });
                }
              }
            }
          }
        }
      } catch {
        // Silently ignore - DOM extraction is the primary method, this is just a bonus
      }
    }
  }
  
  return products;
}

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

function extractProductsAggressive(document: Document, baseUrl: URL): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  
  // Look for any element that has both a heading and a price nearby
  const priceRegex = /(?:Rs\.?|₨|PKR|\$|€|£|₹)\s*[\d,]+(?:\.\d{2})?|[\d,]+(?:\.\d{2})?\s*(?:Rs\.?|₨|PKR|\$|€|£|₹)/i;
  
  document.querySelectorAll('*').forEach(el => {
    const text = el.textContent || '';
    if (priceRegex.test(text)) {
      // Found a price, look for a product name nearby
      const parent = el.parentElement?.parentElement;
      if (parent) {
        const heading = parent.querySelector('h1, h2, h3, h4, h5, h6');
        const name = heading?.textContent?.trim();
        
        if (name && name.length > 2 && name.length < 100) {
          const priceMatch = text.match(priceRegex);
          const img = parent.querySelector('img') as HTMLImageElement;
          
          products.push({
            name,
            price: priceMatch?.[0] || null,
            originalPrice: null,
            currency: null,
            image: resolveUrl(img?.src, baseUrl),
            images: [],
            description: null,
            category: null,
            variants: [],
            inStock: true,
            url: null,
          });
        }
      }
    }
  });
  
  return products.slice(0, 20); // Limit aggressive extraction
}

function extractBrandName(document: Document, url: string): string {
  // Try OG site name first
  const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
  if (ogSiteName) return ogSiteName;
  
  // Try title, often contains brand name
  const title = document.querySelector('title')?.textContent?.trim() || '';
  
  // Common patterns: "Brand Name - Tagline" or "Brand Name | Something"
  const titleParts = title.split(/[-|–—]/);
  if (titleParts.length > 0 && titleParts[0].trim().length > 1) {
    return titleParts[0].trim();
  }
  
  // Try logo alt text
  const logoAlt = document.querySelector('img[class*="logo"], header img')?.getAttribute('alt');
  if (logoAlt && logoAlt.length < 50) return logoAlt;
  
  // Fall back to domain name
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const domainName = hostname.split('.')[0];
    return domainName.charAt(0).toUpperCase() + domainName.slice(1);
  } catch {
    return 'Unknown Brand';
  }
}

function extractTagline(document: Document): string | null {
  // Look for tagline in common locations
  const selectors = [
    '[class*="tagline"]',
    '[class*="slogan"]',
    '[class*="subtitle"]',
    'header p',
    '.hero p',
    'meta[name="description"]',
  ];
  
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim() || el?.getAttribute('content');
    if (text && text.length > 10 && text.length < 150) {
      return text;
    }
  }
  
  return null;
}

function extractLogo(document: Document, baseUrl: URL): string | null {
  const selectors = [
    'img[class*="logo"]',
    'img[alt*="logo" i]',
    'img[src*="logo"]',
    '.logo img',
    '#logo img',
    'header img:first-of-type',
    '[class*="brand"] img',
  ];
  
  for (const selector of selectors) {
    const img = document.querySelector(selector) as HTMLImageElement;
    if (img?.src) {
      return resolveUrl(img.src, baseUrl);
    }
  }
  
  return null;
}

function extractFavicon(document: Document, baseUrl: URL): string | null {
  const selectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
  ];
  
  for (const selector of selectors) {
    const link = document.querySelector(selector);
    const href = link?.getAttribute('href');
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

function extractColorsWithPriority(document: Document, html: string): ColorExtraction {
  const colorCounts: Record<string, number> = {};
  const hexRegex = /#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/g;
  
  // Extract from CSS variables (often primary colors)
  const cssVarColors: string[] = [];
  const cssVarRegex = /--(?:primary|brand|main|accent|secondary)[^:]*:\s*(#[0-9A-Fa-f]{6})/gi;
  let match;
  while ((match = cssVarRegex.exec(html)) !== null) {
    cssVarColors.push(match[1].toUpperCase());
  }
  
  // Extract from inline styles (higher priority)
  document.querySelectorAll('[style]').forEach(el => {
    const style = el.getAttribute('style') || '';
    const matches = style.match(hexRegex);
    matches?.forEach(color => {
      const upper = color.toUpperCase();
      colorCounts[upper] = (colorCounts[upper] || 0) + 2; // Higher weight
    });
  });
  
  // Extract from stylesheets
  document.querySelectorAll('style').forEach(styleEl => {
    const css = styleEl.textContent || '';
    const matches = css.match(hexRegex);
    matches?.forEach(color => {
      const upper = color.toUpperCase();
      colorCounts[upper] = (colorCounts[upper] || 0) + 1;
    });
  });
  
  // Filter out common non-brand colors
  const excludeColors = ['#FFFFFF', '#000000', '#FFFFF', '#333333', '#666666', '#999999', '#CCCCCC', '#F5F5F5', '#EEEEEE'];
  
  const sortedColors = Object.entries(colorCounts)
    .filter(([color]) => !excludeColors.includes(color))
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);
  
  // Prioritize CSS variable colors
  const primaryFromVars = cssVarColors.find(c => !excludeColors.includes(c));
  
  return {
    primary: primaryFromVars || sortedColors[0] || null,
    secondary: sortedColors[1] || null,
    accent: sortedColors[2] || null,
    all: [...new Set([...cssVarColors, ...sortedColors])].slice(0, 15),
  };
}

interface ImageExtraction {
  hero: string | null;
  banners: string[];
  all: string[];
}

function extractImagesWithContext(document: Document, baseUrl: URL): ImageExtraction {
  const all: string[] = [];
  let hero: string | null = null;
  const banners: string[] = [];
  
  // Find hero image
  const heroSelectors = [
    '.hero img',
    '[class*="hero"] img',
    '[class*="banner"] img',
    'section:first-of-type img',
    'header img',
  ];
  
  for (const selector of heroSelectors) {
    const img = document.querySelector(selector) as HTMLImageElement;
    if (img?.src) {
      hero = resolveUrl(img.src, baseUrl);
      if (hero) break;
    }
  }
  
  // Find banner images
  document.querySelectorAll('[class*="banner"] img, [class*="slider"] img, [class*="carousel"] img').forEach(img => {
    const src = resolveUrl((img as HTMLImageElement).src, baseUrl);
    if (src && !banners.includes(src)) {
      banners.push(src);
    }
  });
  
  // Collect all meaningful images
  document.querySelectorAll('img').forEach(img => {
    const src = resolveUrl(img.getAttribute('src') || img.getAttribute('data-src'), baseUrl);
    if (src && !all.includes(src)) {
      // Skip tiny images, icons, and tracking pixels
      const width = parseInt(img.getAttribute('width') || '100');
      const height = parseInt(img.getAttribute('height') || '100');
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

function extractTextContent(document: Document): TextContent {
  const headlines: string[] = [];
  const descriptions: string[] = [];
  const usps: string[] = [];
  
  // Extract headlines
  document.querySelectorAll('h1, h2, h3').forEach(h => {
    const text = h.textContent?.trim();
    if (text && text.length > 3 && text.length < 200) {
      headlines.push(text);
    }
  });
  
  // Extract descriptions
  document.querySelectorAll('p').forEach(p => {
    const text = p.textContent?.trim();
    if (text && text.length > 40 && text.length < 500) {
      descriptions.push(text);
    }
  });
  
  // Try to identify USPs
  const uspSelectors = [
    '[class*="feature"]',
    '[class*="benefit"]',
    '[class*="usp"]',
    '[class*="highlight"]',
    'li',
  ];
  
  uspSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      const text = el.textContent?.trim();
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

function extractContactInfo(document: Document, html: string): ContactInfo {
  // Email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = html.match(emailRegex);
  const email = emails?.[0] || null;
  
  // Phone
  const phoneRegex = /(?:\+92|0)?[\s.-]?(?:3\d{2}|[1-9]\d{2})[\s.-]?\d{7}|\+?[\d\s.-]{10,}/g;
  const phones = html.match(phoneRegex);
  const phone = phones?.[0]?.trim() || null;
  
  // Social links
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

function extractStructuredData(document: Document): unknown[] {
  const data: unknown[] = [];
  
  document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    try {
      data.push(JSON.parse(script.textContent || ''));
    } catch {
      // Invalid JSON
    }
  });
  
  return data;
}

function detectEcommerce(document: Document, products: ScrapedProduct[]): boolean {
  // Check for e-commerce indicators
  const indicators = [
    products.length > 0,
    !!document.querySelector('[class*="cart"]'),
    !!document.querySelector('[class*="checkout"]'),
    !!document.querySelector('[class*="add-to-cart"]'),
    !!document.querySelector('[class*="buy"]'),
    !!document.querySelector('[class*="price"]'),
    !!document.querySelector('[class*="shop"]'),
  ];
  
  return indicators.filter(Boolean).length >= 2;
}

function detectProductType(
  document: Document, 
  products: ScrapedProduct[], 
  textContent: TextContent
): 'physical' | 'digital' | 'service' {
  const allText = [
    ...textContent.headlines,
    ...textContent.descriptions,
    ...products.map(p => p.name + ' ' + (p.description || '')),
  ].join(' ').toLowerCase();
  
  // Physical product indicators
  const physicalIndicators = [
    /shipping/i, /delivery/i, /weight/i, /size/i, /dimensions/i,
    /package/i, /box/i, /bottle/i, /jar/i, /pack/i,
    /gram|kg|ml|liter|oz|lb/i,
  ];
  
  // Digital product indicators
  const digitalIndicators = [
    /download/i, /instant access/i, /pdf/i, /ebook/i, /course/i,
    /subscription/i, /license/i, /software/i, /app/i,
  ];
  
  // Service indicators
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
