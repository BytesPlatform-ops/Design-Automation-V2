import { JSDOM } from 'jsdom';

export interface ScrapedWebsiteData {
  url: string;
  title: string;
  description: string;
  favicon: string | null;
  logo: string | null;
  images: string[];
  colors: string[];
  headings: string[];
  paragraphs: string[];
  links: { text: string; href: string }[];
  metaData: Record<string, string>;
  ogData: {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
  };
  structuredData: unknown[];
  contactInfo: {
    emails: string[];
    phones: string[];
    addresses: string[];
  };
  socialLinks: string[];
  products: Array<{
    name: string;
    price?: string;
    image?: string;
    description?: string;
  }>;
}

/**
 * Scrape a website and extract relevant brand/marketing data
 */
export async function scrapeWebsite(url: string): Promise<ScrapedWebsiteData> {
  // Normalize URL
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
  
  // Fetch the page
  const response = await fetch(normalizedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BrandAnalyzerBot/1.0; +https://example.com/bot)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url: normalizedUrl });
  const document = dom.window.document;

  // Extract base URL for resolving relative URLs
  const baseUrl = new URL(normalizedUrl);

  // Helper to resolve URLs
  const resolveUrl = (relativeUrl: string | null): string | null => {
    if (!relativeUrl) return null;
    try {
      return new URL(relativeUrl, baseUrl).href;
    } catch {
      return null;
    }
  };

  // Extract title
  const title = document.querySelector('title')?.textContent?.trim() || '';

  // Extract meta description
  const description = 
    document.querySelector('meta[name="description"]')?.getAttribute('content') ||
    document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    '';

  // Extract favicon
  const faviconLink = 
    document.querySelector('link[rel="icon"]')?.getAttribute('href') ||
    document.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') ||
    '/favicon.ico';
  const favicon = resolveUrl(faviconLink);

  // Extract logo (common patterns)
  const logoSelectors = [
    'img[class*="logo"]',
    'img[alt*="logo"]',
    'img[src*="logo"]',
    '.logo img',
    '#logo img',
    'header img:first-of-type',
    'nav img:first-of-type',
  ];
  let logo: string | null = null;
  for (const selector of logoSelectors) {
    const logoEl = document.querySelector(selector) as HTMLImageElement;
    if (logoEl?.src) {
      logo = resolveUrl(logoEl.src);
      if (logo) break;
    }
  }

  // Extract images (top images, excluding tiny icons)
  const images: string[] = [];
  const imgElements = document.querySelectorAll('img');
  imgElements.forEach((img) => {
    const src = img.getAttribute('src');
    const width = parseInt(img.getAttribute('width') || '100');
    const height = parseInt(img.getAttribute('height') || '100');
    
    // Skip tiny images (likely icons)
    if (width < 50 || height < 50) return;
    
    const resolved = resolveUrl(src);
    if (resolved && !images.includes(resolved)) {
      images.push(resolved);
    }
  });

  // Extract colors from inline styles and stylesheets (basic extraction)
  const colors: string[] = [];
  const colorRegex = /#[0-9A-Fa-f]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)/g;
  
  // From inline styles
  document.querySelectorAll('[style]').forEach((el) => {
    const style = el.getAttribute('style') || '';
    const matches = style.match(colorRegex);
    if (matches) {
      matches.forEach((c) => {
        if (!colors.includes(c)) colors.push(c);
      });
    }
  });
  
  // From internal stylesheets (limit to first 5000 chars for performance)
  document.querySelectorAll('style').forEach((styleEl) => {
    const css = (styleEl.textContent || '').slice(0, 5000);
    const matches = css.match(colorRegex);
    if (matches) {
      matches.forEach((c) => {
        if (!colors.includes(c) && colors.length < 20) colors.push(c);
      });
    }
  });

  // Extract headings
  const headings: string[] = [];
  document.querySelectorAll('h1, h2, h3').forEach((h) => {
    const text = h.textContent?.trim();
    if (text && headings.length < 20) {
      headings.push(text);
    }
  });

  // Extract meaningful paragraphs
  const paragraphs: string[] = [];
  document.querySelectorAll('p').forEach((p) => {
    const text = p.textContent?.trim();
    if (text && text.length > 30 && paragraphs.length < 15) {
      paragraphs.push(text.slice(0, 500));
    }
  });

  // Extract links with text
  const links: { text: string; href: string }[] = [];
  document.querySelectorAll('a[href]').forEach((a) => {
    const text = a.textContent?.trim();
    const href = a.getAttribute('href');
    if (text && href && !href.startsWith('#') && links.length < 30) {
      const resolved = resolveUrl(href);
      if (resolved) {
        links.push({ text: text.slice(0, 100), href: resolved });
      }
    }
  });

  // Extract meta data
  const metaData: Record<string, string> = {};
  document.querySelectorAll('meta[name], meta[property]').forEach((meta) => {
    const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
    const content = meta.getAttribute('content') || '';
    if (name && content) {
      metaData[name] = content;
    }
  });

  // Extract OpenGraph data
  const ogData = {
    title: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || undefined,
    description: document.querySelector('meta[property="og:description"]')?.getAttribute('content') || undefined,
    image: resolveUrl(document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null) || undefined,
    siteName: document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || undefined,
  };

  // Extract structured data (JSON-LD)
  const structuredData: unknown[] = [];
  document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    try {
      const data = JSON.parse(script.textContent || '');
      structuredData.push(data);
    } catch {
      // Invalid JSON, skip
    }
  });

  // Extract contact info using regex
  const pageText = document.body?.textContent || '';
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;
  
  const emails = [...new Set(pageText.match(emailRegex) || [])].slice(0, 5);
  const phones = [...new Set(pageText.match(phoneRegex) || [])].slice(0, 3);
  const addresses: string[] = []; // Would need more sophisticated extraction

  // Extract social links
  const socialPatterns = [
    'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 
    'linkedin.com', 'youtube.com', 'tiktok.com', 'pinterest.com'
  ];
  const socialLinks: string[] = [];
  links.forEach(({ href }) => {
    if (socialPatterns.some((pattern) => href.includes(pattern)) && !socialLinks.includes(href)) {
      socialLinks.push(href);
    }
  });

  // Extract products (basic extraction from common patterns)
  const products: Array<{
    name: string;
    price?: string;
    image?: string;
    description?: string;
  }> = [];
  
  // Look for product cards/items
  const productSelectors = [
    '[class*="product"]',
    '[class*="item"]',
    '[data-product]',
    '.card',
  ];
  
  for (const selector of productSelectors) {
    if (products.length >= 10) break;
    
    document.querySelectorAll(selector).forEach((el) => {
      if (products.length >= 10) return;
      
      const nameEl = el.querySelector('h2, h3, h4, [class*="title"], [class*="name"]');
      const priceEl = el.querySelector('[class*="price"], .price');
      const imgEl = el.querySelector('img') as HTMLImageElement;
      const descEl = el.querySelector('p, [class*="description"]');
      
      const name = nameEl?.textContent?.trim();
      if (name && name.length > 2 && name.length < 100) {
        products.push({
          name,
          price: priceEl?.textContent?.trim()?.slice(0, 50),
          image: resolveUrl(imgEl?.src) || undefined,
          description: descEl?.textContent?.trim()?.slice(0, 200),
        });
      }
    });
  }

  return {
    url: normalizedUrl,
    title,
    description,
    favicon,
    logo,
    images: images.slice(0, 20),
    colors: colors.slice(0, 15),
    headings,
    paragraphs,
    links: links.slice(0, 20),
    metaData,
    ogData,
    structuredData,
    contactInfo: { emails, phones, addresses },
    socialLinks,
    products,
  };
}
