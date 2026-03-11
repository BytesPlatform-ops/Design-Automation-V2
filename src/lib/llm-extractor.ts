/**
 * LLM-powered semantic extraction for universal website scraping
 * This approach works on ANY website by using AI to understand page meaning
 * rather than relying on CSS selectors
 */

import OpenAI from 'openai';
import * as cheerio from 'cheerio';

const openai = new OpenAI();

export interface LLMExtractedProduct {
  name: string;
  price: string | null;
  currency: string | null;
  description: string | null;
  image: string | null;
  category: string | null;
}

export interface LLMExtractedBrand {
  name: string;
  tagline: string | null;
  industry: string;
  description: string | null;
}

export interface LLMExtractionResult {
  brand: LLMExtractedBrand;
  products: LLMExtractedProduct[];
  colors: {
    primary: string | null;
    secondary: string | null;
    accent: string | null;
  };
  websiteType: 'ecommerce' | 'restaurant' | 'saas' | 'agency' | 'portfolio' | 'landing-page' | 'corporate' | 'unknown';
  heroContent: {
    headline: string | null;
    subheadline: string | null;
    ctaText: string | null;
  };
  valuePropositions: string[];
  confidence: number; // 0-1 score of extraction quality
}

/**
 * Convert HTML to clean, readable text for LLM processing
 * Removes scripts, styles, and excessive whitespace
 */
export function htmlToCleanText(html: string, maxLength = 15000): string {
  const $ = cheerio.load(html);
  
  // Remove non-content elements
  $('script, style, noscript, iframe, svg, nav, footer, header').remove();
  $('[style*="display:none"], [style*="display: none"], .hidden, [hidden]').remove();
  
  // Extract structured data separately (we'll use this)
  const structuredData: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = $(el).html();
      if (json) structuredData.push(json);
    } catch { /* ignore */ }
  });
  
  // Get main content areas
  const mainContent = $('main, article, [role="main"], .main-content, #content, .content').first();
  const contentRoot = mainContent.length ? mainContent : $('body');
  
  // Extract text with structure preserved
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractText = (el: cheerio.Cheerio<any>): string => {
    const lines: string[] = [];
    
    el.find('h1, h2, h3, h4, h5, h6').each((_, heading) => {
      const text = $(heading).text().trim();
      if (text) lines.push(`## ${text}`);
    });
    
    el.find('p, li, span, div').each((_, p) => {
      const text = $(p).clone().children().remove().end().text().trim();
      if (text && text.length > 10) lines.push(text);
    });
    
    return lines.join('\n');
  };
  
  let text = extractText(contentRoot);
  
  // Add structured data context
  if (structuredData.length > 0) {
    text = `=== STRUCTURED DATA ===\n${structuredData.join('\n')}\n\n=== PAGE CONTENT ===\n${text}`;
  }
  
  // Truncate if too long
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '\n... [truncated]';
  }
  
  return text;
}

/**
 * Extract images from HTML with context
 */
export function extractImagesWithContext(html: string, baseUrl: string): Array<{ src: string; alt: string; context: string }> {
  const $ = cheerio.load(html);
  const images: Array<{ src: string; alt: string; context: string }> = [];
  const base = new URL(baseUrl);
  
  $('img').each((_, img) => {
    const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy-src');
    if (!src) return;
    
    // Resolve URL
    let fullUrl: string;
    try {
      fullUrl = new URL(src, base).href;
    } catch {
      return;
    }
    
    // Skip tiny images, icons, tracking pixels
    const width = parseInt($(img).attr('width') || '0');
    const height = parseInt($(img).attr('height') || '0');
    if ((width > 0 && width < 50) || (height > 0 && height < 50)) return;
    if (src.includes('tracking') || src.includes('pixel') || src.includes('1x1')) return;
    
    // Get context from surrounding elements
    const parent = $(img).parent();
    const context = parent.text().trim().substring(0, 100) || $(img).attr('alt') || '';
    
    images.push({
      src: fullUrl,
      alt: $(img).attr('alt') || '',
      context,
    });
  });
  
  return images.slice(0, 20); // Limit to 20 images
}

/**
 * Use LLM to semantically extract products and brand info from any website
 * This is the key innovation - works on ANY website structure
 */
export async function llmSemanticExtraction(
  html: string,
  url: string,
  existingProducts: LLMExtractedProduct[] = []
): Promise<LLMExtractionResult> {
  const cleanText = htmlToCleanText(html);
  const images = extractImagesWithContext(html, url);
  
  const prompt = `Analyze this website content and extract structured information for ad generation.

URL: ${url}
DOMAIN: ${new URL(url).hostname}

=== WEBSITE CONTENT ===
${cleanText}

=== IMAGES FOUND ===
${images.slice(0, 10).map((img, i) => `${i + 1}. ${img.alt || 'No alt'} | Context: ${img.context} | URL: ${img.src}`).join('\n')}

=== EXISTING PRODUCTS (from structured data) ===
${existingProducts.length > 0 ? existingProducts.map(p => `- ${p.name}: ${p.price || 'No price'}`).join('\n') : 'None found yet'}

=== YOUR TASK ===
Extract the following information. Be accurate - only include information clearly present on the page.

Return JSON:
{
  "brand": {
    "name": "Brand/company name",
    "tagline": "Tagline or slogan if present",
    "industry": "Specific industry (e.g., 'Fast Food Restaurant', 'SaaS Analytics', 'Cleaning Services')",
    "description": "What does this business do? One sentence."
  },
  "products": [
    {
      "name": "Product or service name",
      "price": "Price with currency symbol or null",
      "currency": "Currency code (USD, EUR, PKR, etc.) or null",
      "description": "Brief description",
      "image": "Best matching image URL from the images list or null",
      "category": "Product category if identifiable"
    }
  ],
  "colors": {
    "primary": "Dominant brand color as hex (#XXXXXX) or null",
    "secondary": "Secondary brand color as hex or null", 
    "accent": "Accent/CTA color as hex or null"
  },
  "websiteType": "ecommerce|restaurant|saas|agency|portfolio|landing-page|corporate|unknown",
  "heroContent": {
    "headline": "Main hero headline",
    "subheadline": "Hero subheadline or tagline",
    "ctaText": "Main call-to-action button text"
  },
  "valuePropositions": ["Key selling point 1", "Key selling point 2"],
  "confidence": 0.8
}

RULES:
1. For restaurants/food: products are menu items (dishes, meals)
2. For SaaS: products are the main platform/tool, NOT pricing tiers
3. For agencies: products are their service offerings
4. Match product images from the images list when possible
5. Extract REAL colors if visible in content/branding clues
6. confidence: 0-1 based on how much relevant info you found`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for cost-efficiency on extraction
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting structured data from websites. Return valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content) as LLMExtractionResult;
    
    // Merge with existing products if we found more
    if (existingProducts.length > 0 && result.products.length === 0) {
      result.products = existingProducts;
    }
    
    console.log(`[LLM-Extraction] Extracted ${result.products.length} products, type: ${result.websiteType}, confidence: ${result.confidence}`);
    
    return result;
    
  } catch (error) {
    console.error('[LLM-Extraction] Error:', error);
    
    // Return minimal fallback
    return {
      brand: {
        name: new URL(url).hostname.replace('www.', '').split('.')[0],
        tagline: null,
        industry: 'Unknown',
        description: null,
      },
      products: existingProducts,
      colors: { primary: null, secondary: null, accent: null },
      websiteType: 'unknown',
      heroContent: { headline: null, subheadline: null, ctaText: null },
      valuePropositions: [],
      confidence: 0,
    };
  }
}

/**
 * Retry extraction with more focused prompt for low-confidence results
 */
export async function retryWithFocus(
  html: string,
  url: string,
  focusArea: 'products' | 'brand' | 'services'
): Promise<Partial<LLMExtractionResult>> {
  const cleanText = htmlToCleanText(html, 8000);
  
  const focusPrompts = {
    products: `Find ALL products/items for sale on this page. Look for:
- Product cards with names and prices
- Menu items (for restaurants)
- Service packages
- Subscription plans
Return JSON: { "products": [...] }`,
    brand: `Identify the brand/company information:
- Official brand name
- Tagline or slogan
- What industry are they in?
- Brand colors if identifiable
Return JSON: { "brand": {...}, "colors": {...} }`,
    services: `List the services this company offers:
- Service names and descriptions
- Key features or benefits
- Pricing if available
Return JSON: { "products": [...], "valuePropositions": [...] }`,
  };

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Extract specific data from website. Return valid JSON only.' },
        { role: 'user', content: `URL: ${url}\n\n${cleanText}\n\n${focusPrompts[focusArea]}` },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0]?.message?.content || '{}');
  } catch {
    return {};
  }
}
