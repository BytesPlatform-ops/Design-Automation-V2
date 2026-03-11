/**
 * @deprecated This module is deprecated in favor of unified-scraper.ts
 * The unified scraper combines all extraction strategies into one module.
 * This file is kept for backward compatibility but will be removed in a future version.
 * 
 * Migration: import { scrapeWebsite, UnifiedScrapedData } from './unified-scraper';
 */

import * as cheerio from 'cheerio';

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
 * Scrape a website and extract relevant brand/marketing data (using Cheerio)
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
  const $ = cheerio.load(html);

  // Extract base URL for resolving relative URLs
  const baseUrl = new URL(normalizedUrl);

  // Helper to resolve URLs
  const resolveUrl = (relativeUrl: string | null | undefined): string | null => {
    if (!relativeUrl) return null;
    try {
      return new URL(relativeUrl, baseUrl).href;
    } catch {
      return null;
    }
  };

  // Extract title
  const title = $('title').text().trim() || '';

  // Extract meta description
  const description = 
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    '';

  // Extract favicon
  const faviconLink = 
    $('link[rel="icon"]').attr('href') ||
    $('link[rel="shortcut icon"]').attr('href') ||
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
    const logoEl = $(selector).first();
    if (logoEl.length && logoEl.attr('src')) {
      logo = resolveUrl(logoEl.attr('src'));
      if (logo) break;
    }
  }

  // Extract images (top images, excluding tiny icons)
  const images: string[] = [];
  $('img').each((_, img) => {
    const src = $(img).attr('src');
    const width = parseInt($(img).attr('width') || '100');
    const height = parseInt($(img).attr('height') || '100');
    
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
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const matches = style.match(colorRegex);
    if (matches) {
      matches.forEach((c) => {
        if (!colors.includes(c)) colors.push(c);
      });
    }
  });
  
  // From internal stylesheets (limit to first 5000 chars for performance)
  $('style').each((_, styleEl) => {
    const css = ($(styleEl).html() || '').slice(0, 5000);
    const matches = css.match(colorRegex);
    if (matches) {
      matches.forEach((c) => {
        if (!colors.includes(c) && colors.length < 20) colors.push(c);
      });
    }
  });

  // Extract headings
  const headings: string[] = [];
  $('h1, h2, h3').each((_, h) => {
    const text = $(h).text().trim();
    if (text && headings.length < 20) {
      headings.push(text);
    }
  });

  // Extract meaningful paragraphs
  const paragraphs: string[] = [];
  $('p').each((_, p) => {
    const text = $(p).text().trim();
    if (text && text.length > 30 && paragraphs.length < 15) {
      paragraphs.push(text.slice(0, 500));
    }
  });

  // Extract links with text
  const links: { text: string; href: string }[] = [];
  $('a[href]').each((_, a) => {
    const text = $(a).text().trim();
    const href = $(a).attr('href');
    if (text && href && !href.startsWith('#') && links.length < 30) {
      const resolved = resolveUrl(href);
      if (resolved) {
        links.push({ text: text.slice(0, 100), href: resolved });
      }
    }
  });

  // Extract meta data
  const metaData: Record<string, string> = {};
  $('meta[name], meta[property]').each((_, meta) => {
    const name = $(meta).attr('name') || $(meta).attr('property') || '';
    const content = $(meta).attr('content') || '';
    if (name && content) {
      metaData[name] = content;
    }
  });

  // Extract OpenGraph data
  const ogData = {
    title: $('meta[property="og:title"]').attr('content') || undefined,
    description: $('meta[property="og:description"]').attr('content') || undefined,
    image: resolveUrl($('meta[property="og:image"]').attr('content')) || undefined,
    siteName: $('meta[property="og:site_name"]').attr('content') || undefined,
  };

  // Extract structured data (JSON-LD)
  const structuredData: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, script) => {
    try {
      const data = JSON.parse($(script).html() || '');
      structuredData.push(data);
    } catch {
      // Invalid JSON, skip
    }
  });

  // Extract contact info using regex
  const pageText = $('body').text() || '';
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
    
    $(selector).each((_, el) => {
      if (products.length >= 10) return;
      
      const nameEl = $(el).find('h2, h3, h4, [class*="title"], [class*="name"]').first();
      const priceEl = $(el).find('[class*="price"], .price').first();
      const imgEl = $(el).find('img').first();
      const descEl = $(el).find('p, [class*="description"]').first();
      
      const name = nameEl.text().trim();
      if (name && name.length > 2 && name.length < 100) {
        products.push({
          name,
          price: priceEl.text().trim().slice(0, 50) || undefined,
          image: resolveUrl(imgEl.attr('src')) || undefined,
          description: descEl.text().trim().slice(0, 200) || undefined,
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
