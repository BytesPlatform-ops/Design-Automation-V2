import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';

// ============================================================
// INTERFACES
// ============================================================

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

  // Products (populated from schema.org if available, otherwise empty - AI fills in)
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
  landingPageContent: {
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
  };

  // Contact
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  socialLinks: Record<string, string>;

  // Meta
  metaTitle: string;
  metaDescription: string;
  ogImage: string | null;
  structuredData: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Detection (may be empty - AI will determine)
  isEcommerce: boolean;
  hasProducts: boolean;
  estimatedProductType: 'physical' | 'digital' | 'service';
  websiteCategory: string;

  // NEW: Structured page content for AI extraction
  pageContent: string;

  // Discovered subpage URLs for multi-page scraping
  discoveredSubpages: string[];
}

// ============================================================
// MAIN SCRAPING FUNCTION
// ============================================================

export async function enhancedScrapeWebsite(url: string): Promise<EnhancedScrapedData> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
  console.log('[Scraper] Fetching:', normalizedUrl);

  const response = await fetch(normalizedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const baseUrl = new URL(normalizedUrl);

  // Extract basic meta
  const brandName = extractBrandName($, baseUrl);
  const tagline = $('meta[name="description"]').attr('content')?.trim() || null;
  const logo = extractLogo($, baseUrl);
  const favicon = resolveUrl($('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href'), baseUrl);
  const colors = extractColors($);
  const ogImage = resolveUrl($('meta[property="og:image"]').attr('content'), baseUrl);

  // Extract schema.org structured data
  const structuredData = extractSchemaOrg($);
  const schemaProducts = extractProductsFromSchema(structuredData, baseUrl);

  // Extract structured page content for AI
  const pageContent = extractPageContent($, baseUrl);

  // Extract basic headlines
  const headlines: string[] = [];
  $('h1, h2').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 3 && text.length < 200 && headlines.length < 10) {
      headlines.push(text);
    }
  });

  // Extract all meaningful images
  const allImages: string[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    const resolved = resolveUrl(src, baseUrl);
    if (resolved && !resolved.includes('pixel') && !resolved.includes('tracker') && !resolved.startsWith('data:')) {
      allImages.push(resolved);
    }
  });

  console.log('[Scraper] Extracted:', {
    brandName,
    hasLogo: !!logo,
    colors: `${colors.primary || 'none'} / ${colors.secondary || 'none'}`,
    schemaProducts: schemaProducts.length,
    pageContentLength: pageContent.length,
    headlines: headlines.length,
  });

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
    products: schemaProducts, // Only schema.org products - AI extracts the rest
    productCategories: [],
    heroImage: ogImage || allImages[0] || null,
    bannerImages: [],
    allImages: allImages.slice(0, 30),
    headlines,
    descriptions: [],
    uniqueSellingPoints: [],
    landingPageContent: {
      heroHeadline: headlines[0] || null,
      heroSubheadline: null,
      ctaText: [],
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
    metaTitle: $('title').text().trim(),
    metaDescription: $('meta[name="description"]').attr('content')?.trim() || '',
    ogImage,
    structuredData,
    isEcommerce: false,       // AI will determine
    hasProducts: schemaProducts.length > 0,
    estimatedProductType: 'physical', // AI will determine
    websiteCategory: 'unknown',      // AI will determine
    pageContent,
    discoveredSubpages: discoverProductPages($, baseUrl),
  };
}

// ============================================================
// BRAND NAME EXTRACTION
// ============================================================

function extractBrandName($: CheerioAPI, baseUrl: URL): string {
  // Priority 1: og:site_name (most reliable)
  const ogSiteName = $('meta[property="og:site_name"]').attr('content')?.trim();
  if (ogSiteName) return ogSiteName;

  // Priority 2: Title tag (first part before separator)
  const title = $('title').text().trim();
  if (title) {
    const parts = title.split(/[-|–—:]/);
    const firstPart = parts[0].trim();
    if (firstPart && firstPart.length < 40) return firstPart;
  }

  // Priority 3: Logo alt text
  const logoAlt = $('img[class*="logo"], img[alt*="logo" i], .logo img, header a img').first().attr('alt')?.trim();
  if (logoAlt && logoAlt.length < 40 && !/logo/i.test(logoAlt)) return logoAlt;

  // Priority 4: Domain name
  const domain = baseUrl.hostname.replace('www.', '').split('.')[0];
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

// ============================================================
// LOGO EXTRACTION (with SVG support)
// ============================================================

function extractLogo($: CheerioAPI, baseUrl: URL): string | null {
  const selectors = [
    'img[class*="logo"]',
    'img[alt*="logo" i]',
    'img[src*="logo"]',
    '.logo img',
    '#logo img',
    'header img:first-of-type',
    '[class*="brand"] img',
    'a[href="/"] img',
    'header a img:first-child',
    'nav img:first-of-type',
  ];

  for (const selector of selectors) {
    const el = $(selector).first();
    const src = el.attr('src') || el.attr('data-src');
    if (src) {
      return resolveUrl(src, baseUrl);
    }
  }

  // Try SVG logos
  const svgLogo = $('header svg, .logo svg, [class*="logo"] svg, a[href="/"] svg').first();
  if (svgLogo.length) {
    // Return the SVG as a data URI if it's small enough
    const svgHtml = $.html(svgLogo);
    if (svgHtml && svgHtml.length < 10000) {
      return `data:image/svg+xml,${encodeURIComponent(svgHtml)}`;
    }
  }

  return null;
}

// ============================================================
// COLOR EXTRACTION (generic - CSS variables + stylesheets)
// ============================================================

function extractColors($: CheerioAPI): { primary: string | null; secondary: string | null; accent: string | null; all: string[] } {
  const hexRegex = /#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/g;
  const colorCounts: Record<string, number> = {};
  const cssVarColors: string[] = [];

  // Neutral colors to exclude
  const neutrals = new Set([
    '#FFFFFF', '#000000', '#FFFFFE', '#FEFEFE',
    '#333333', '#666666', '#999999', '#CCCCCC',
    '#F5F5F5', '#EEEEEE', '#E5E5E5', '#DDDDDD',
    '#F8F8F8', '#FAFAFA', '#F0F0F0', '#E0E0E0',
    '#111111', '#222222', '#444444', '#555555',
    '#777777', '#888888', '#AAAAAA', '#BBBBBB',
  ]);

  // 1. CSS variables (highest priority - these are intentional brand colors)
  $('style').each((_, el) => {
    const css = $(el).html() || '';
    const cssVarRegex = /--(?:primary|brand|main|accent|secondary|theme|color-primary|color-accent|color-brand)[^:]*:\s*(#[0-9A-Fa-f]{6})/gi;
    let match;
    while ((match = cssVarRegex.exec(css)) !== null) {
      cssVarColors.push(match[1].toUpperCase());
    }

    // All hex colors from stylesheets
    const hexMatches = css.match(hexRegex);
    hexMatches?.forEach(color => {
      const upper = color.toUpperCase();
      colorCounts[upper] = (colorCounts[upper] || 0) + 1;
    });
  });

  // 2. Inline styles (higher weight - intentional styling)
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const matches = style.match(hexRegex);
    matches?.forEach(color => {
      const upper = color.toUpperCase();
      colorCounts[upper] = (colorCounts[upper] || 0) + 2;
    });
  });

  // 3. Meta theme-color
  const themeColor = $('meta[name="theme-color"]').attr('content')?.trim();
  if (themeColor && hexRegex.test(themeColor)) {
    cssVarColors.unshift(themeColor.toUpperCase());
  }

  // Sort by frequency, exclude neutrals
  const sortedColors = Object.entries(colorCounts)
    .filter(([color]) => !neutrals.has(color))
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);

  const primaryFromVars = cssVarColors.find(c => !neutrals.has(c));

  return {
    primary: primaryFromVars || sortedColors[0] || null,
    secondary: sortedColors[primaryFromVars ? 0 : 1] || null,
    accent: sortedColors[primaryFromVars ? 1 : 2] || null,
    all: [...new Set([...cssVarColors, ...sortedColors])].slice(0, 10),
  };
}

// ============================================================
// SCHEMA.ORG EXTRACTION (standards-based, most reliable)
// ============================================================

function extractSchemaOrg($: CheerioAPI): any[] { // eslint-disable-line @typescript-eslint/no-explicit-any
  const schemas: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '');
      if (Array.isArray(data)) {
        schemas.push(...data);
      } else {
        schemas.push(data);
      }
    } catch {
      // Invalid JSON, skip
    }
  });
  return schemas;
}

function extractProductsFromSchema(schemas: any[], baseUrl: URL): ScrapedProduct[] { // eslint-disable-line @typescript-eslint/no-explicit-any
  const products: ScrapedProduct[] = [];
  const seen = new Set<string>();

  function processItem(item: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!item || typeof item !== 'object') return;

    const type = item['@type'];
    if (type === 'Product' || type === 'MenuItem' || type === 'FoodMenuItem' ||
        (Array.isArray(type) && type.some((t: string) => ['Product', 'MenuItem'].includes(t)))) {
      const name = item.name?.toString()?.trim();
      if (!name || seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());

      // Extract price from offers
      let price: string | null = null;
      let currency: string | null = null;
      const offers = item.offers || item.offer;
      if (offers) {
        const offer = Array.isArray(offers) ? offers[0] : offers;
        if (offer?.price) {
          price = offer.price.toString();
          currency = offer.priceCurrency || null;
        }
      }

      // Extract image
      let image: string | null = null;
      if (typeof item.image === 'string') {
        image = item.image;
      } else if (Array.isArray(item.image) && item.image.length > 0) {
        image = typeof item.image[0] === 'string' ? item.image[0] : item.image[0]?.url || null;
      } else if (item.image?.url) {
        image = item.image.url;
      }
      if (image) {
        image = resolveUrl(image, baseUrl);
        // Validate it looks like an actual image URL, not a product page
        if (image && !image.startsWith('data:') &&
            !/\.(jpe?g|png|gif|webp|avif|bmp|tiff?|svg)(\?|$)/i.test(image) &&
            !/\/(image|img|photo|media|cdn|static|upload|asset)/i.test(image)) {
          // URL doesn't look like an image — skip it
          image = null;
        }
      }

      products.push({
        name,
        price,
        originalPrice: null,
        currency,
        image,
        images: image ? [image] : [],
        description: item.description?.toString()?.trim()?.slice(0, 300) || null,
        category: item.category?.toString() || null,
        variants: [],
        inStock: true,
        url: item.url || null,
      });
    }

    // Recurse into @graph and other nested structures
    if (item['@graph'] && Array.isArray(item['@graph'])) {
      item['@graph'].forEach(processItem);
    }
    if (item.itemListElement && Array.isArray(item.itemListElement)) {
      item.itemListElement.forEach((li: any) => processItem(li.item || li)); // eslint-disable-line @typescript-eslint/no-explicit-any
    }
    if (item.hasMenu?.hasMenuSection) {
      const sections = Array.isArray(item.hasMenu.hasMenuSection)
        ? item.hasMenu.hasMenuSection
        : [item.hasMenu.hasMenuSection];
      sections.forEach((section: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const items = section.hasMenuItem || [];
        (Array.isArray(items) ? items : [items]).forEach(processItem);
      });
    }
  }

  schemas.forEach(processItem);
  return products.slice(0, 30);
}

// ============================================================
// PAGE CONTENT EXTRACTION (structured text for AI)
// ============================================================

/**
 * Extracts a structured, AI-friendly text representation of the page.
 * This replaces all hardcoded CSS selectors - the AI reads this text
 * and extracts products, services, pricing, features, etc.
 */
function extractPageContent($: CheerioAPI, baseUrl: URL): string {
  const sections: string[] = [];

  // 1. META INFORMATION
  sections.push('=== PAGE META ===');
  const title = $('title').text().trim();
  const description = $('meta[name="description"]').attr('content')?.trim();
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
  const ogDesc = $('meta[property="og:description"]').attr('content')?.trim();
  const ogSiteName = $('meta[property="og:site_name"]').attr('content')?.trim();
  const keywords = $('meta[name="keywords"]').attr('content')?.trim();

  if (title) sections.push(`Title: ${title}`);
  if (description) sections.push(`Description: ${description}`);
  if (ogSiteName) sections.push(`Site Name: ${ogSiteName}`);
  if (ogTitle && ogTitle !== title) sections.push(`OG Title: ${ogTitle}`);
  if (ogDesc && ogDesc !== description) sections.push(`OG Description: ${ogDesc}`);
  if (keywords) sections.push(`Keywords: ${keywords}`);

  // 2. STRUCTURED DATA (JSON-LD) - compact representation
  const jsonLdScripts = $('script[type="application/ld+json"]');
  if (jsonLdScripts.length > 0) {
    sections.push('\n=== STRUCTURED DATA (Schema.org) ===');
    jsonLdScripts.each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '');
        const compact = JSON.stringify(data, null, 1);
        sections.push(compact.slice(0, 3000));
      } catch {
        // Skip invalid JSON
      }
    });
  }

  // 3. PAGE BODY CONTENT - structured text hierarchy
  sections.push('\n=== PAGE CONTENT ===');
  const bodyContent = extractTextHierarchy($);
  sections.push(bodyContent);

  // 4. KEY IMAGES with context
  sections.push('\n=== KEY IMAGES ===');
  const images: string[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || '';
    const alt = $(el).attr('alt') || '';
    if (src && !src.startsWith('data:image/gif') && !src.includes('pixel') && !src.includes('tracker')) {
      const fullSrc = resolveUrl(src, baseUrl) || src;
      const entry = alt ? `[IMG] ${fullSrc} (${alt})` : `[IMG] ${fullSrc}`;
      if (!images.some(i => i.includes(fullSrc))) {
        images.push(entry);
      }
    }
  });
  sections.push(images.slice(0, 25).join('\n'));

  // 5. NAVIGATION LINKS (helps AI understand site structure)
  sections.push('\n=== NAVIGATION ===');
  const navLinks: string[] = [];
  $('nav a, header a, [role="navigation"] a').each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    const href = $(el).attr('href') || '';
    if (text && text.length > 1 && text.length < 50 && href && !href.startsWith('#')) {
      const entry = `${text} → ${href}`;
      if (!navLinks.includes(entry)) {
        navLinks.push(entry);
      }
    }
  });
  sections.push(navLinks.slice(0, 20).join('\n'));

  // Truncate to ~30KB to stay within AI context limits
  let result = sections.join('\n');
  if (result.length > 30000) {
    result = result.slice(0, 30000) + '\n... [content truncated for length]';
  }

  return result;
}

/**
 * Walk through the DOM and extract text in a structured hierarchy.
 * This gives the AI a clean view of the page content without HTML noise.
 */
function extractTextHierarchy($: CheerioAPI): string {
  const lines: string[] = [];
  const skipTags = new Set(['script', 'style', 'noscript', 'svg', 'iframe', 'link', 'meta', 'head', 'br', 'hr']);
  const seenText = new Set<string>();
  let lineCount = 0;
  const MAX_LINES = 500;

  function processElement(el: any, depth: number = 0) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (lineCount >= MAX_LINES) return;

    const tagName = el.tagName?.toLowerCase();
    if (!tagName || skipTags.has(tagName)) return;

    const $el = $(el);

    // Headings
    if (/^h[1-6]$/.test(tagName)) {
      const text = $el.text().trim().replace(/\s+/g, ' ');
      if (text && text.length > 2 && text.length < 200 && !seenText.has(text)) {
        seenText.add(text);
        const level = parseInt(tagName[1]);
        const indent = '  '.repeat(Math.max(0, level - 1));
        lines.push(`${indent}[${tagName.toUpperCase()}] ${text}`);
        lineCount++;
      }
      return; // Don't recurse into headings
    }

    // Paragraphs
    if (tagName === 'p') {
      const text = $el.text().trim().replace(/\s+/g, ' ');
      if (text && text.length > 15 && text.length < 600 && !seenText.has(text)) {
        seenText.add(text);
        lines.push(`[P] ${text}`);
        lineCount++;
      }
      return;
    }

    // List items
    if (tagName === 'li') {
      const text = $el.clone().children('ul, ol').remove().end().text().trim().replace(/\s+/g, ' ');
      if (text && text.length > 2 && text.length < 200 && !seenText.has(text)) {
        seenText.add(text);
        lines.push(`  - ${text}`);
        lineCount++;
      }
      // Still recurse for nested lists
      $el.children('ul, ol').children().each((_, child) => processElement(child, depth + 1));
      return;
    }

    // Buttons and CTA links
    if (tagName === 'button' || (tagName === 'a' && ($el.attr('class') || '').match(/btn|cta|button/i))) {
      const text = $el.text().trim().replace(/\s+/g, ' ');
      if (text && text.length > 1 && text.length < 50 && !seenText.has(text)) {
        seenText.add(text);
        lines.push(`[BUTTON] ${text}`);
        lineCount++;
      }
      return;
    }

    // Images with alt text (inline context)
    if (tagName === 'img') {
      const alt = $el.attr('alt')?.trim();
      const src = $el.attr('src') || $el.attr('data-src') || '';
      if (alt && alt.length > 3 && !seenText.has(alt)) {
        seenText.add(alt);
        lines.push(`[IMG: ${alt}] ${src}`);
        lineCount++;
      }
      return;
    }

    // Table rows (for pricing tables)
    if (tagName === 'tr') {
      const cells: string[] = [];
      $el.children('td, th').each((_, cell) => {
        const text = $(cell).text().trim().replace(/\s+/g, ' ');
        if (text) cells.push(text);
      });
      if (cells.length > 0) {
        const row = `[ROW] ${cells.join(' | ')}`;
        if (!seenText.has(row)) {
          seenText.add(row);
          lines.push(row);
          lineCount++;
        }
      }
      return;
    }

    // Spans and small elements with price-like content (capture inline data)
    if ((tagName === 'span' || tagName === 'strong' || tagName === 'b') && depth > 2) {
      const text = $el.text().trim();
      if (text && /[\$€£¥₹₨]|price|cost/i.test(text) && text.length < 50 && !seenText.has(text)) {
        seenText.add(text);
        lines.push(`[PRICE] ${text}`);
        lineCount++;
      }
      return;
    }

    // Recurse into children for container elements
    $el.children().each((_, child) => {
      processElement(child, depth + 1);
    });
  }

  $('body').children().each((_, child) => {
    processElement(child, 0);
  });

  return lines.join('\n');
}

// ============================================================
// SUBPAGE DISCOVERY & SCRAPING
// ============================================================

/**
 * Discovers product-rich subpages from navigation links.
 * Instead of blind crawling, we look at nav links and pick the ones
 * most likely to contain products/menu items.
 */
const PRODUCT_PAGE_PATTERNS = [
  // Restaurant/Food
  /\/menu/i, /\/food/i, /\/dishes/i, /\/order/i, /\/delivery/i,
  // Ecommerce
  /\/products/i, /\/shop/i, /\/store/i, /\/catalog/i, /\/collections/i, /\/categories/i,
  // Services
  /\/services/i, /\/solutions/i, /\/offerings/i, /\/what-we-do/i,
  // Pricing
  /\/pricing/i, /\/plans/i, /\/packages/i,
];

const NAV_TEXT_PATTERNS = [
  /^menu$/i, /^our menu$/i, /^food menu$/i, /^full menu$/i,
  /^products$/i, /^shop$/i, /^store$/i, /^all products$/i, /^catalog$/i,
  /^services$/i, /^our services$/i, /^what we do$/i, /^solutions$/i,
  /^pricing$/i, /^plans$/i, /^packages$/i,
  /^collections$/i, /^categories$/i,
];

export function discoverProductPages($: CheerioAPI, baseUrl: URL): string[] {
  const candidates: Array<{ url: string; score: number }> = [];
  const seen = new Set<string>();

  // Check all links on the page (nav + body)
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href === '#' || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    const text = $(el).text().trim().replace(/\s+/g, ' ');
    const resolved = resolveUrl(href, baseUrl);
    if (!resolved) return;

    // Must be same domain
    try {
      const linkUrl = new URL(resolved);
      if (linkUrl.hostname !== baseUrl.hostname) return;
      // Skip the landing page itself
      if (linkUrl.pathname === '/' || linkUrl.pathname === baseUrl.pathname) return;
      // Skip anchors, auth, legal pages
      if (/\/(login|signup|register|sign-in|sign-up|privacy|terms|contact|about|blog|careers|faq)/i.test(linkUrl.pathname)) return;

      const normalizedUrl = `${linkUrl.origin}${linkUrl.pathname}`;
      if (seen.has(normalizedUrl)) return;
      seen.add(normalizedUrl);

      let score = 0;

      // Score based on URL pattern
      for (const pattern of PRODUCT_PAGE_PATTERNS) {
        if (pattern.test(linkUrl.pathname)) {
          score += 10;
          break;
        }
      }

      // Score based on link text
      for (const pattern of NAV_TEXT_PATTERNS) {
        if (pattern.test(text)) {
          score += 15; // Link text is stronger signal
          break;
        }
      }

      // Bonus if it's in the main navigation
      const isInNav = $(el).closest('nav, header, [role="navigation"]').length > 0;
      if (isInNav && score > 0) score += 5;

      // Prefer shorter paths (top-level pages like /menu vs /menu/item/123)
      const pathDepth = linkUrl.pathname.split('/').filter(Boolean).length;
      if (pathDepth <= 2 && score > 0) score += 3;

      if (score > 0) {
        candidates.push({ url: normalizedUrl, score });
      }
    } catch {
      return;
    }
  });

  // Sort by score, take top 3
  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(c => c.url);
}

/**
 * Discovers product pages from pre-extracted links (e.g. from Puppeteer's rendered page).
 * Same scoring logic as discoverProductPages but takes raw link objects instead of Cheerio $.
 */
export function discoverProductPagesFromLinks(
  links: Array<{ href: string; text: string; isInNav: boolean }>,
  baseUrl: URL
): string[] {
  const candidates: Array<{ url: string; score: number }> = [];
  const seen = new Set<string>();

  for (const link of links) {
    try {
      const linkUrl = new URL(link.href);
      if (linkUrl.hostname !== baseUrl.hostname) continue;
      if (linkUrl.pathname === '/' || linkUrl.pathname === baseUrl.pathname) continue;
      if (/\/(login|signup|register|sign-in|sign-up|privacy|terms|contact|about|blog|careers|faq)/i.test(linkUrl.pathname)) continue;

      const normalizedUrl = `${linkUrl.origin}${linkUrl.pathname}`;
      if (seen.has(normalizedUrl)) continue;
      seen.add(normalizedUrl);

      let score = 0;

      for (const pattern of PRODUCT_PAGE_PATTERNS) {
        if (pattern.test(linkUrl.pathname)) {
          score += 10;
          break;
        }
      }

      for (const pattern of NAV_TEXT_PATTERNS) {
        if (pattern.test(link.text)) {
          score += 15;
          break;
        }
      }

      if (link.isInNav && score > 0) score += 5;

      const pathDepth = linkUrl.pathname.split('/').filter(Boolean).length;
      if (pathDepth <= 2 && score > 0) score += 3;

      if (score > 0) {
        candidates.push({ url: normalizedUrl, score });
      }
    } catch {
      continue;
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(c => c.url);
}

/**
 * Scrapes a subpage for additional products/content.
 * Lighter than the main scrape — only extracts products and page content.
 */
export async function scrapeSubpage(url: string, baseUrl: URL): Promise<{
  products: ScrapedProduct[];
  pageContent: string;
}> {
  try {
    console.log('[Scraper] Fetching subpage:', url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000), // 15s timeout per subpage
    });

    if (!response.ok) {
      console.log(`[Scraper] Subpage failed: ${response.status}`);
      return { products: [], pageContent: '' };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract schema.org products from subpage
    const structuredData = extractSchemaOrg($);
    const products = extractProductsFromSchema(structuredData, baseUrl);

    // Extract page content for AI (lighter version — skip meta, images, nav)
    const lines: string[] = [];
    lines.push(`\n=== SUBPAGE: ${url} ===`);

    // Just get structured data and text content
    if (structuredData.length > 0) {
      lines.push('--- Schema.org Data ---');
      try {
        lines.push(JSON.stringify(structuredData, null, 1).slice(0, 3000));
      } catch { /* skip */ }
    }

    lines.push('--- Page Text ---');
    const bodyContent = extractTextHierarchy($);
    lines.push(bodyContent);

    // Also get images from subpage
    lines.push('--- Subpage Images ---');
    const images: string[] = [];
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      const alt = $(el).attr('alt') || '';
      if (src && !src.startsWith('data:image/gif') && !src.includes('pixel') && images.length < 15) {
        const fullSrc = resolveUrl(src, baseUrl) || src;
        images.push(alt ? `[IMG] ${fullSrc} (${alt})` : `[IMG] ${fullSrc}`);
      }
    });
    lines.push(images.join('\n'));

    const pageContent = lines.join('\n');
    console.log(`[Scraper] Subpage extracted: ${products.length} schema products, ${pageContent.length} chars content`);

    return { products, pageContent };
  } catch (error) {
    console.log(`[Scraper] Subpage error for ${url}:`, error instanceof Error ? error.message : error);
    return { products: [], pageContent: '' };
  }
}

// ============================================================
// UTILITY
// ============================================================

function resolveUrl(src: string | null | undefined, baseUrl: URL): string | null {
  if (!src) return null;
  try {
    if (src.startsWith('data:')) return src;
    return new URL(src, baseUrl).href;
  } catch {
    return null;
  }
}
