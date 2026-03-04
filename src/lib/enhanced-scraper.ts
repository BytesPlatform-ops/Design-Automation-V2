import * as cheerio from 'cheerio';
import type { CheerioAPI, Cheerio } from 'cheerio';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CheerioElement = Cheerio<any>;

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

export interface EnhancedScrapedData {
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
 * Enhanced website scraper using Cheerio (serverless compatible)
 */
export async function enhancedScrapeWebsite(url: string): Promise<EnhancedScrapedData> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
  
  // Fetch main page
  const mainPageData = await fetchAndParse(normalizedUrl);
  
  // Try to find and scrape product/shop pages
  const productPageUrls = findProductPageUrls(mainPageData.$, mainPageData.baseUrl);
  
  let allProducts = extractProducts(mainPageData.$, mainPageData.baseUrl);
  
  // Scrape additional product pages (limit to 3)
  for (const productPageUrl of productPageUrls.slice(0, 3)) {
    try {
      const productPageData = await fetchAndParse(productPageUrl);
      const moreProducts = extractProducts(productPageData.$, productPageData.baseUrl);
      
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
  const brandName = extractBrandName(mainPageData.$, normalizedUrl);
  const tagline = extractTagline(mainPageData.$);
  const logo = extractLogo(mainPageData.$, mainPageData.baseUrl);
  
  // Extract colors
  const colors = extractColorsWithPriority(mainPageData.$, mainPageData.html);
  
  // Extract images
  const images = extractImagesWithContext(mainPageData.$, mainPageData.baseUrl);
  
  // Extract text content
  const textContent = extractTextContent(mainPageData.$);
  
  // Extract contact info
  const contactInfo = extractContactInfo(mainPageData.$, mainPageData.html);
  
  // Extract structured data
  const structuredData = extractStructuredData(mainPageData.$);
  
  // Detect business type
  const isEcommerce = detectEcommerce(mainPageData.$, allProducts);
  const estimatedProductType = detectProductType(mainPageData.$, allProducts, textContent);
  
  // Extract favicon
  const favicon = extractFavicon(mainPageData.$, mainPageData.baseUrl);
  
  // Extract OG data
  const ogImage = mainPageData.$('meta[property="og:image"]').attr('content');
  
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
    
    metaTitle: mainPageData.$('title').text().trim() || brandName,
    metaDescription: mainPageData.$('meta[name="description"]').attr('content') || '',
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
  const $ = cheerio.load(html);
  
  return {
    html,
    $,
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

function findProductPageUrls($: CheerioAPI, baseUrl: URL): string[] {
  const urls: string[] = [];
  const patterns = [
    /shop/i, /products/i, /store/i, /catalog/i, /collection/i,
    /all-products/i, /buy/i, /order/i
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

function extractProducts($: CheerioAPI, baseUrl: URL): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  const seenNames = new Set<string>();
  
  // Product container selectors
  const productContainerSelectors = [
    '[class*="product-card"]',
    '[class*="product-item"]',
    '[class*="product_card"]',
    '[class*="product_item"]',
    '[data-product]',
    '[data-product-id]',
    '[itemtype*="Product"]',
    '.product-card',
    '.product-grid-item',
    '.product-item',
    '.product',
    '.wc-product',
    '[data-hook="product-item"]',
    '[class*="ProductItem"]',
    '.ProductItem',
    '.product-block',
    '.card[class*="product"]',
    '.item[class*="product"]',
    '.grid-product',
    '.ec-product',
    '.ins-component__item',
    '[id^="product-"]',
    '.ins-component__item-wrap',
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
    } catch {
      // Selector might not be valid
    }
  }
  
  // Try Lightspeed/Ecwid embedded state
  if (products.length < 3) {
    const lightspeedProducts = extractProductsFromLightspeedState($, baseUrl);
    lightspeedProducts.forEach(p => {
      if (!seenNames.has(p.name.toLowerCase())) {
        seenNames.add(p.name.toLowerCase());
        products.push(p);
      }
    });
  }
  
  // Try structured data
  if (products.length === 0) {
    const structuredProducts = extractProductsFromStructuredData($, baseUrl);
    structuredProducts.forEach(p => {
      if (!seenNames.has(p.name.toLowerCase())) {
        seenNames.add(p.name.toLowerCase());
        products.push(p);
      }
    });
  }
  
  // Aggressive approach
  if (products.length === 0) {
    const aggressiveProducts = extractProductsAggressive($, baseUrl);
    aggressiveProducts.forEach(p => {
      if (!seenNames.has(p.name.toLowerCase())) {
        seenNames.add(p.name.toLowerCase());
        products.push(p);
      }
    });
  }
  
  return products;
}

function extractProductFromElement($: CheerioAPI, el: CheerioElement, baseUrl: URL): ScrapedProduct | null {
  const nameSelectors = [
    '.ins-component__title-inner',
    '.ins-component__title',
    'h1', 'h2', 'h3', 'h4',
    '[class*="title"]',
    '[class*="name"]',
    '[class*="product-title"]',
    '[class*="product-name"]',
    '[data-hook="product-item-name"]',
    '.product-title',
    '.product-name',
    'a[class*="product"]',
    'a[aria-label]',
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
      // Check aria-label
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
    '.ins-component__price-value',
    '.ins-component__price-amount',
    '[class*="price"]',
    '[data-hook*="price"]',
    '.price',
    '.amount',
    '[class*="cost"]',
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
    '.ins-component__bg-image img',
    '.ins-picture img',
    'img[class*="product"]',
    'img[data-product]',
    'picture img',
    'img',
  ];
  
  let image: string | null = null;
  const images: string[] = [];
  
  for (const selector of imgSelectors) {
    const imgEl = el.find(selector).first();
    if (imgEl.length) {
      const src = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy-src') || imgEl.attr('data-original');
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
    category: null,
    variants: [],
    inStock: true,
    url: productUrl,
  };
}

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
    } catch {
      // Invalid JSON
    }
  });
  
  return products;
}

function extractProductsFromLightspeedState($: CheerioAPI, baseUrl: URL): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  
  $('script').each((_, script) => {
    const content = $(script).html() || '';
    
    const stateMatch = content.match(/window\.initialState\s*=\s*"([\s\S]+?)";/);
    if (stateMatch) {
      try {
        let jsonStr: string;
        try {
          jsonStr = JSON.parse('"' + stateMatch[1] + '"');
        } catch {
          jsonStr = stateMatch[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\');
        }
        
        const state = JSON.parse(jsonStr);
        
        if (state.tile?.tileList) {
          for (const tile of state.tile.tileList) {
            if (tile.type === 'STORE' && tile.externalContent?.storeData?.products) {
              for (const p of tile.externalContent.storeData.products) {
                if (p.name && p.enabled !== false) {
                  products.push({
                    name: p.name,
                    price: p.formattedPrice || (p.price ? `${p.price}Rs` : null),
                    originalPrice: null,
                    currency: 'PKR',
                    image: p.thumbnailImageUrl || p.imageUrl || null,
                    images: [p.thumbnailImageUrl, p.imageUrl, p.fullImageUrl, p.alternativeProductImage?.imageUrl].filter(Boolean) as string[],
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
        // Ignore errors
      }
    }
  });
  
  return products;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
}

function extractProductsAggressive($: CheerioAPI, baseUrl: URL): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  const priceRegex = /(?:Rs\.?|₨|PKR|\$|€|£|₹)\s*[\d,]+(?:\.\d{2})?|[\d,]+(?:\.\d{2})?\s*(?:Rs\.?|₨|PKR|\$|€|£|₹)/i;
  
  $('*').each((_, el) => {
    const text = $(el).text();
    if (priceRegex.test(text)) {
      const parent = $(el).parent().parent();
      const heading = parent.find('h1, h2, h3, h4, h5, h6').first();
      const name = heading.text().trim();
      
      if (name && name.length > 2 && name.length < 100) {
        const priceMatch = text.match(priceRegex);
        const img = parent.find('img').first();
        
        products.push({
          name,
          price: priceMatch?.[0] || null,
          originalPrice: null,
          currency: null,
          image: resolveUrl(img.attr('src'), baseUrl),
          images: [],
          description: null,
          category: null,
          variants: [],
          inStock: true,
          url: null,
        });
      }
    }
  });
  
  return products.slice(0, 20);
}

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
    '[class*="tagline"]',
    '[class*="slogan"]',
    '[class*="subtitle"]',
    'header p',
    '.hero p',
    'meta[name="description"]',
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
    'img[class*="logo"]',
    'img[alt*="logo" i]',
    'img[src*="logo"]',
    '.logo img',
    '#logo img',
    'header img:first-of-type',
    '[class*="brand"] img',
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
  const selectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
  ];
  
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
  
  // CSS variables
  const cssVarColors: string[] = [];
  const cssVarRegex = /--(?:primary|brand|main|accent|secondary)[^:]*:\s*(#[0-9A-Fa-f]{6})/gi;
  let match;
  while ((match = cssVarRegex.exec(html)) !== null) {
    cssVarColors.push(match[1].toUpperCase());
  }
  
  // Inline styles
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const matches = style.match(hexRegex);
    matches?.forEach(color => {
      const upper = color.toUpperCase();
      colorCounts[upper] = (colorCounts[upper] || 0) + 2;
    });
  });
  
  // Stylesheets
  $('style').each((_, styleEl) => {
    const css = $(styleEl).html() || '';
    const matches = css.match(hexRegex);
    matches?.forEach(color => {
      const upper = color.toUpperCase();
      colorCounts[upper] = (colorCounts[upper] || 0) + 1;
    });
  });
  
  const excludeColors = ['#FFFFFF', '#000000', '#FFFFF', '#333333', '#666666', '#999999', '#CCCCCC', '#F5F5F5', '#EEEEEE'];
  
  const sortedColors = Object.entries(colorCounts)
    .filter(([color]) => !excludeColors.includes(color))
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);
  
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
    } catch {
      // Invalid JSON
    }
  });
  
  return data;
}

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
