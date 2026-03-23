/**
 * Puppeteer-based scraper for JS-heavy websites (SPAs, React apps, etc.)
 * Works on Render, Railway, local dev - NOT on Vercel serverless
 *
 * This scraper renders the page with a real browser, then extracts
 * structured text content for AI-powered extraction.
 */

import type { ScrapedProduct } from './enhanced-scraper';

export interface PuppeteerScrapedData {
  products: ScrapedProduct[];
  brandName: string | null;
  logo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  title: string | null;
  description: string | null;
  // Landing page content
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
  // NEW: Structured page content for AI extraction
  pageContent: string;
  // Extracted nav links for subpage discovery (from rendered page)
  navLinks: Array<{ href: string; text: string; isInNav: boolean }>;
}

/**
 * Check if Puppeteer scraping is available
 */
export function isPuppeteerAvailable(): boolean {
  if (process.env.VERCEL) return false;
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return false;
  if (process.env.ENABLE_PUPPETEER === 'true') return true;
  return false;
}

/**
 * Scrape a website using Puppeteer (headless Chrome)
 * Renders JS, scrolls for lazy-loading, then extracts structured content for AI.
 */
export async function scrapeWithPuppeteer(url: string): Promise<PuppeteerScrapedData | null> {
  if (!isPuppeteerAvailable()) {
    console.log('[Puppeteer] Not available in this environment');
    return null;
  }

  let browser = null;

  try {
    const puppeteer = await import('puppeteer-core');

    console.log('[Puppeteer] Launching browser...');

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
      process.env.CHROME_PATH ||
      '/usr/bin/google-chrome-stable';

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
    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('[Puppeteer] Navigating to:', url);

    // Navigate with retry
    let navigated = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: attempt === 0 ? 30000 : 45000,
        });
        navigated = true;
        break;
      } catch (e) {
        console.log(`[Puppeteer] Navigation attempt ${attempt + 1} failed:`, e);
        if (attempt === 1) throw e;
      }
    }

    if (!navigated) throw new Error('Failed to navigate after retries');

    await page.waitForSelector('body', { timeout: 5000 });

    // Scroll through the page to trigger lazy loading
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

    // Wait for lazy-loaded content
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract everything from the rendered page
    const extractedData = await page.evaluate(() => {
      // ---- Helper Functions ----
      const seenText = new Set<string>();
      const MAX_LINES = 500;
      let lineCount = 0;

      function getCleanText(el: Element): string {
        return (el.textContent || '').trim().replace(/\s+/g, ' ');
      }

      // ---- 1. BASIC META ----
      const title = document.title || null;
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || null;
      const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
      const brandName = ogSiteName || (title ? title.split(/[-|–—:]/)[0].trim() : null);

      // ---- 2. LOGO ----
      let logo: string | null = null;
      const logoSelectors = [
        'header img[src*="logo"]', 'img[alt*="logo" i]', 'img[class*="logo"]',
        '.logo img', 'a[href="/"] img', 'header a img:first-child', 'nav img:first-of-type',
      ];
      for (const sel of logoSelectors) {
        const el = document.querySelector(sel) as HTMLImageElement;
        if (el?.src) { logo = el.src; break; }
      }

      // ---- 3. COLORS (from computed styles) ----
      const hexRegex = /#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/g;
      const colorCounts: Record<string, number> = {};
      const cssVarColors: string[] = [];

      const rgbToHex = (rgb: string): string | null => {
        const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return null;
        const [, r, g, b] = match;
        return '#' + [r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('').toUpperCase();
      };

      // CSS variables
      document.querySelectorAll('style').forEach(style => {
        const css = style.textContent || '';
        const cssVarRegex = /--(?:primary|brand|main|accent|secondary|theme)[^:]*:\s*(#[0-9A-Fa-f]{6})/gi;
        let match;
        while ((match = cssVarRegex.exec(css)) !== null) {
          cssVarColors.push(match[1].toUpperCase());
        }
        const hexMatches = css.match(hexRegex);
        hexMatches?.forEach(color => {
          const upper = color.toUpperCase();
          colorCounts[upper] = (colorCounts[upper] || 0) + 1;
        });
      });

      // Computed styles from prominent elements
      const prominentSelectors = [
        'header', 'nav', 'button', '[class*="btn"]',
        '[class*="cta"]', '[class*="primary"]', '.hero', '[class*="hero"]', 'footer',
      ];
      prominentSelectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(el => {
            const style = window.getComputedStyle(el);
            const bgColor = rgbToHex(style.backgroundColor);
            const color = rgbToHex(style.color);
            if (bgColor) colorCounts[bgColor] = (colorCounts[bgColor] || 0) + 3;
            if (color) colorCounts[color] = (colorCounts[color] || 0) + 1;
          });
        } catch { /* ignore */ }
      });

      // Theme color meta
      const themeColor = document.querySelector('meta[name="theme-color"]')?.getAttribute('content');
      if (themeColor && hexRegex.test(themeColor)) {
        cssVarColors.unshift(themeColor.toUpperCase());
      }

      const excludeColors = new Set([
        '#FFFFFF', '#000000', '#FFFFFE', '#FEFEFE',
        '#333333', '#666666', '#999999', '#CCCCCC',
        '#F5F5F5', '#EEEEEE', '#E5E5E5', '#DDDDDD',
        '#F8F8F8', '#FAFAFA', '#F0F0F0', '#E0E0E0',
        '#111111', '#222222', '#444444', '#555555',
        '#777777', '#888888', '#AAAAAA', '#BBBBBB',
      ]);

      const sortedColors = Object.entries(colorCounts)
        .filter(([color]) => !excludeColors.has(color))
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => color);

      const primaryFromVars = cssVarColors.find(c => !excludeColors.has(c));
      const primaryColor = primaryFromVars || sortedColors[0] || null;
      const secondaryColor = sortedColors[primaryFromVars ? 0 : 1] || null;
      const accentColor = sortedColors[primaryFromVars ? 1 : 2] || null;

      // ---- 4. STRUCTURED PAGE CONTENT (for AI) ----
      const contentLines: string[] = [];
      const skipTags = new Set(['script', 'style', 'noscript', 'svg', 'iframe', 'link', 'meta', 'head']);

      // Meta section
      contentLines.push('=== PAGE META ===');
      if (title) contentLines.push(`Title: ${title}`);
      if (description) contentLines.push(`Description: ${description}`);
      if (ogSiteName) contentLines.push(`Site Name: ${ogSiteName}`);

      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
      const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
      if (ogTitle && ogTitle !== title) contentLines.push(`OG Title: ${ogTitle}`);
      if (ogDesc && ogDesc !== description) contentLines.push(`OG Description: ${ogDesc}`);

      // Structured data
      document.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
        try {
          const data = JSON.parse(el.textContent || '');
          contentLines.push('\n=== STRUCTURED DATA ===');
          contentLines.push(JSON.stringify(data, null, 1).slice(0, 3000));
        } catch { /* skip */ }
      });

      // Page body content
      contentLines.push('\n=== PAGE CONTENT ===');

      function processElement(el: Element, depth: number = 0) {
        if (lineCount >= MAX_LINES) return;
        const tag = el.tagName?.toLowerCase();
        if (!tag || skipTags.has(tag)) return;

        // Headings
        if (/^h[1-6]$/.test(tag)) {
          const text = getCleanText(el);
          if (text && text.length > 2 && text.length < 200 && !seenText.has(text)) {
            seenText.add(text);
            const level = parseInt(tag[1]);
            const indent = '  '.repeat(Math.max(0, level - 1));
            contentLines.push(`${indent}[${tag.toUpperCase()}] ${text}`);
            lineCount++;
          }
          return;
        }

        // Paragraphs
        if (tag === 'p') {
          const text = getCleanText(el);
          if (text && text.length > 15 && text.length < 600 && !seenText.has(text)) {
            seenText.add(text);
            contentLines.push(`[P] ${text}`);
            lineCount++;
          }
          return;
        }

        // List items
        if (tag === 'li') {
          const text = getCleanText(el);
          if (text && text.length > 2 && text.length < 200 && !seenText.has(text)) {
            seenText.add(text);
            contentLines.push(`  - ${text}`);
            lineCount++;
          }
          return;
        }

        // Buttons / CTAs
        if (tag === 'button' || (tag === 'a' && (el.className || '').match(/btn|cta|button/i))) {
          const text = getCleanText(el);
          if (text && text.length > 1 && text.length < 50 && !seenText.has(text)) {
            seenText.add(text);
            contentLines.push(`[BUTTON] ${text}`);
            lineCount++;
          }
          return;
        }

        // Images
        if (tag === 'img') {
          const img = el as HTMLImageElement;
          const alt = img.alt?.trim();
          if (alt && alt.length > 3 && !seenText.has(alt)) {
            seenText.add(alt);
            contentLines.push(`[IMG: ${alt}] ${img.src || ''}`);
            lineCount++;
          }
          return;
        }

        // Table rows
        if (tag === 'tr') {
          const cells: string[] = [];
          el.querySelectorAll('td, th').forEach(cell => {
            const text = getCleanText(cell);
            if (text) cells.push(text);
          });
          if (cells.length > 0) {
            const row = `[ROW] ${cells.join(' | ')}`;
            if (!seenText.has(row)) {
              seenText.add(row);
              contentLines.push(row);
              lineCount++;
            }
          }
          return;
        }

        // Price-like spans
        if ((tag === 'span' || tag === 'strong' || tag === 'b') && depth > 2) {
          const text = getCleanText(el);
          if (text && /[\$€£¥₹₨]|price|cost/i.test(text) && text.length < 50 && !seenText.has(text)) {
            seenText.add(text);
            contentLines.push(`[PRICE] ${text}`);
            lineCount++;
          }
          return;
        }

        // Recurse into children
        Array.from(el.children).forEach(child => processElement(child, depth + 1));
      }

      Array.from(document.body.children).forEach(child => processElement(child, 0));

      // Images section
      contentLines.push('\n=== KEY IMAGES ===');
      const imgEntries: string[] = [];
      document.querySelectorAll('img').forEach(img => {
        const imgEl = img as HTMLImageElement;
        if (imgEl.src && !imgEl.src.startsWith('data:image/gif') && !imgEl.src.includes('pixel') && imgEntries.length < 25) {
          const alt = imgEl.alt?.trim();
          imgEntries.push(alt ? `[IMG] ${imgEl.src} (${alt})` : `[IMG] ${imgEl.src}`);
        }
      });
      contentLines.push(imgEntries.join('\n'));

      // Navigation
      contentLines.push('\n=== NAVIGATION ===');
      const navLinkTexts: string[] = [];
      document.querySelectorAll('nav a, header a, [role="navigation"] a').forEach(a => {
        const text = getCleanText(a);
        const href = (a as HTMLAnchorElement).href;
        if (text && text.length > 1 && text.length < 50 && href && navLinkTexts.length < 20) {
          navLinkTexts.push(`${text} → ${href}`);
        }
      });
      contentLines.push(navLinkTexts.join('\n'));

      // Extract ALL page links for subpage discovery (from rendered DOM)
      const pageLinks: Array<{ href: string; text: string; isInNav: boolean }> = [];
      const seenHrefs = new Set<string>();
      document.querySelectorAll('a[href]').forEach(a => {
        const aEl = a as HTMLAnchorElement;
        const href = aEl.href;
        const text = getCleanText(a);
        if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || seenHrefs.has(href)) return;
        seenHrefs.add(href);
        const isInNav = !!a.closest('nav, header, [role="navigation"]');
        pageLinks.push({ href, text: text || '', isInNav });
      });

      // Truncate
      let pageContent = contentLines.join('\n');
      if (pageContent.length > 30000) {
        pageContent = pageContent.slice(0, 30000) + '\n... [content truncated]';
      }

      return {
        brandName,
        logo,
        title,
        description,
        primaryColor,
        secondaryColor,
        accentColor,
        pageContent,
        navLinks: pageLinks,
      };
    });

    await browser.close();
    browser = null;

    console.log(`[Puppeteer] Page content extracted: ${extractedData.pageContent.length} chars`);

    return {
      products: [],        // AI will extract from pageContent
      brandName: extractedData.brandName,
      logo: extractedData.logo,
      primaryColor: extractedData.primaryColor,
      secondaryColor: extractedData.secondaryColor,
      accentColor: extractedData.accentColor,
      title: extractedData.title,
      description: extractedData.description,
      landingPageContent: {
        heroHeadline: null,      // AI will extract
        heroSubheadline: null,
        ctaText: [],
        valuePropositions: [],
        serviceDescriptions: [],
        pricingInfo: [],
        featuresList: [],
        statsNumbers: [],
      },
      websiteCategory: 'unknown', // AI will determine
      pageContent: extractedData.pageContent,
      navLinks: extractedData.navLinks || [],
    };

  } catch (error) {
    console.error('[Puppeteer] Error:', error);
    if (browser) {
      await browser.close();
    }
    return null;
  }
}
