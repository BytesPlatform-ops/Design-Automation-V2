import { NextResponse } from 'next/server';
import { enhancedScrapeWebsite, EnhancedScrapedData, scrapeSubpage, discoverProductPagesFromLinks } from '@/lib/enhanced-scraper';
import { scrapeWithPuppeteer, isPuppeteerAvailable } from '@/lib/puppeteer-scraper';
import OpenAI from 'openai';

const openai = new OpenAI();

export interface URLBrandAnalysis {
  // Brand Identity
  brandName: string;
  tagline: string;
  industry: string;

  // Visual Identity
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  suggestedFontStyle: 'modern' | 'classic' | 'playful' | 'elegant' | 'bold';

  // Messaging
  brandVoice: string;
  targetAudience: string;
  uniqueSellingPoints: string[];
  keyMessages: string[];

  // Products (enhanced)
  products: Array<{
    name: string;
    price: string | null;
    description: string;
    image: string | null;
    keyFeatures: string[];
    suggestedAdAngle: string;
  }>;

  // Business Detection
  productType: 'physical' | 'digital' | 'service';
  serviceSubType?: 'food-restaurant' | 'saas-platform' | 'intangible';
  isEcommerce: boolean;

  // Ad Generation Context
  adRecommendations: {
    bestPlatforms: string[];
    suggestedTones: string[];
    visualStyle: string;
    callToAction: string;
  };
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log('[URL-Scrape] Starting scrape for:', url);

    // Step 1: Scrape the website (Puppeteer for JS-heavy sites, Cheerio fallback)
    let scrapedData: EnhancedScrapedData;

    if (isPuppeteerAvailable()) {
      console.log('[URL-Scrape] Puppeteer available, using headless browser...');
      const puppeteerData = await scrapeWithPuppeteer(url);

      if (puppeteerData) {
        console.log(`[URL-Scrape] Puppeteer scraped, page content: ${puppeteerData.pageContent.length} chars`);

        // Convert to EnhancedScrapedData format
        scrapedData = {
          url,
          brandName: puppeteerData.brandName || new URL(url).hostname.replace('www.', ''),
          tagline: null,
          logo: puppeteerData.logo,
          favicon: null,
          primaryColor: puppeteerData.primaryColor,
          secondaryColor: puppeteerData.secondaryColor,
          accentColor: puppeteerData.accentColor,
          allColors: [puppeteerData.primaryColor, puppeteerData.secondaryColor, puppeteerData.accentColor].filter(Boolean) as string[],
          products: [],
          productCategories: [],
          heroImage: null,
          bannerImages: [],
          allImages: [],
          headlines: [],
          descriptions: [],
          uniqueSellingPoints: [],
          landingPageContent: {
            ...puppeteerData.landingPageContent,
            testimonials: [],
          },
          contactEmail: null,
          phone: null,
          address: null,
          socialLinks: {},
          metaTitle: puppeteerData.title || '',
          metaDescription: puppeteerData.description || '',
          ogImage: null,
          structuredData: [],
          isEcommerce: false,
          hasProducts: false,
          estimatedProductType: 'physical',
          websiteCategory: 'unknown',
          pageContent: puppeteerData.pageContent,
          discoveredSubpages: [], // Will be populated below
        };

        // Use links extracted from Puppeteer's rendered DOM for subpage discovery.
        // This works on SPAs where plain fetch/Cheerio would get empty nav links.
        if (puppeteerData.navLinks && puppeteerData.navLinks.length > 0) {
          const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
          scrapedData.discoveredSubpages = discoverProductPagesFromLinks(
            puppeteerData.navLinks,
            new URL(normalizedUrl)
          );
          console.log('[URL-Scrape] Puppeteer subpage discovery:', scrapedData.discoveredSubpages);
        } else {
          console.log('[URL-Scrape] Puppeteer returned no nav links for subpage discovery');
        }
      } else {
        console.log('[URL-Scrape] Puppeteer failed, falling back to Cheerio...');
        scrapedData = await enhancedScrapeWebsite(url);
      }
    } else {
      console.log('[URL-Scrape] Puppeteer not available, using Cheerio...');
      scrapedData = await enhancedScrapeWebsite(url);
    }

    console.log('[URL-Scrape] Scraped data:', {
      brandName: scrapedData.brandName,
      hasLogo: !!scrapedData.logo,
      primaryColor: scrapedData.primaryColor,
      schemaProducts: scrapedData.products.length,
      pageContentLength: scrapedData.pageContent?.length || 0,
    });

    // Step 1.5: Discover and scrape product-rich subpages
    const baseUrl = new URL(url.startsWith('http') ? url : `https://${url}`);

    // Use subpages already discovered during the initial scrape (no double-fetch)
    const subpageUrls = scrapedData.discoveredSubpages || [];
    console.log('[URL-Scrape] Discovered subpages:', subpageUrls);

    // Scrape subpages in parallel (max 3, with timeout)
    if (subpageUrls.length > 0) {
      console.log(`[URL-Scrape] Scraping ${subpageUrls.length} subpages for additional products...`);
      const subpageResults = await Promise.allSettled(
        subpageUrls.map(spUrl => scrapeSubpage(spUrl, baseUrl))
      );

      let subpageProducts = 0;
      let subpageContent = '';

      for (const result of subpageResults) {
        if (result.status === 'fulfilled') {
          const { products, pageContent } = result.value;

          // Merge subpage schema.org products (deduplicate by name)
          const existingNames = new Set(scrapedData.products.map(p => p.name.toLowerCase()));
          for (const product of products) {
            if (!existingNames.has(product.name.toLowerCase())) {
              existingNames.add(product.name.toLowerCase());
              scrapedData.products.push(product);
              subpageProducts++;
            }
          }

          // Append subpage content for AI analysis
          if (pageContent) {
            subpageContent += '\n' + pageContent;
          }
        }
      }

      // Append subpage content to main page content (within limits)
      if (subpageContent) {
        const mainContentLength = scrapedData.pageContent?.length || 0;
        const availableSpace = 50000 - mainContentLength; // Increased limit for multi-page
        if (availableSpace > 0) {
          scrapedData.pageContent = (scrapedData.pageContent || '') + subpageContent.slice(0, availableSpace);
        }
      }

      console.log(`[URL-Scrape] Subpage scraping done: +${subpageProducts} new products, content now ${scrapedData.pageContent?.length || 0} chars`);
    }

    // Step 2: AI-powered extraction + analysis (single call)
    const analysis = await extractAndAnalyze(scrapedData);

    return NextResponse.json({
      success: true,
      scrapedData,
      analysis,
    });

  } catch (error) {
    console.error('[URL-Scrape] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape website' },
      { status: 500 }
    );
  }
}

/**
 * AI-powered extraction + analysis in ONE call.
 *
 * Instead of using hardcoded CSS selectors, we send the structured page content
 * to GPT-4o-mini and let it extract products, services, features, pricing,
 * category, and brand analysis all at once.
 *
 * This works on ANY website regardless of its HTML structure.
 */
async function extractAndAnalyze(data: EnhancedScrapedData): Promise<URLBrandAnalysis> {
  const pageContent = data.pageContent || '';

  // If we have schema.org products, include them as hints
  const schemaProductHints = data.products.length > 0
    ? `\n=== PRODUCTS FOUND VIA SCHEMA.ORG (high confidence) ===\n${data.products.slice(0, 15).map((p, i) =>
      `${i + 1}. ${p.name} - ${p.price ? `${p.currency || ''} ${p.price}` : 'No price'} ${p.image ? '[has image]' : ''} ${p.description ? `- ${p.description.slice(0, 100)}` : ''}`
    ).join('\n')}`
    : '';

  const prompt = `You are a website analyst for an ad generation platform. Your job is to analyze a website and extract everything needed to create personalized marketing ads.

=== WEBSITE INFO ===
URL: ${data.url}
Brand Name (from meta): ${data.brandName}
Colors Detected: Primary=${data.primaryColor || 'unknown'}, Secondary=${data.secondaryColor || 'unknown'}, Accent=${data.accentColor || 'unknown'}
Logo Found: ${data.logo ? 'Yes' : 'No'}
${schemaProductHints}

=== FULL PAGE CONTENT (extracted from website) ===
${pageContent}

=== YOUR TASK ===
Analyze the page content above and extract:

1. **WEBSITE CATEGORY**: What type of website is this?
   - ecommerce (sells physical products with cart/checkout)
   - restaurant (food/delivery business)
   - saas (software/platform with pricing plans)
   - agency (service company - design, marketing, consulting, IT, etc.)
   - portfolio (personal/freelancer showcase)
   - landing-page (single product/service landing page)
   - corporate (company website)

2. **PRODUCTS/SERVICES**: What does this business sell or offer?
   - For ecommerce/restaurant: Extract actual products with names, prices, descriptions
   - For SaaS: The MAIN product/platform (NOT pricing tier names like "Starter", "Pro", "Enterprise")
   - For agencies/services: Their service offerings
   - For each product/service, suggest an ad angle

3. **BRAND ANALYSIS**: Voice, audience, USPs, key messages
   - USPs must come from ACTUAL content on the page
   - Do NOT invent generic selling points

4. **IMAGES**: Match product images from the [IMG] entries in the page content to products
   - Image URLs MUST be actual image files (ending in .jpg, .jpeg, .png, .webp, .gif, or from CDN domains like wixstatic, cloudinary, shopify, etc.)
   - NEVER use product page URLs as images (e.g. /products/some-product-p12345 is NOT an image)
   - If no real image URL can be found for a product, set image to null

CRITICAL RULES:
- ONLY use information from the page content above. Do NOT hallucinate.
- Pricing plan names (Starter, Basic, Pro, Premium, Enterprise, Free, Business, Growth, Team) are NOT products.
  The actual product is what the website DOES (described in hero/headlines).
- For SaaS sites: if you see pricing plans, the product is the PLATFORM itself.
  Example: A website builder with Starter/Pro/Enterprise plans → product is "Website Builder"
- Extract REAL prices where available (including currency symbols as shown on page)
- Do not default any currency. Use whatever currency symbols appear on the page.
- Match images to products by looking at [IMG] entries near product descriptions
- Keep product count reasonable: 1-5 for services, up to 20 for ecommerce/restaurants
- NOTE: Content may include SUBPAGES (marked with === SUBPAGE: url ===). Extract products from ALL pages.
- BRAND NAME: Return the actual brand name (e.g. "KFC", "Nike", "Spotify"), NOT the page title or tagline.
- COLOR VALIDATION: The detected colors (Primary=${data.primaryColor || 'unknown'}, Secondary=${data.secondaryColor || 'unknown'}, Accent=${data.accentColor || 'unknown'}) were auto-extracted from CSS and may be WRONG. Generic blues (#1A73E8, #3B82F6, etc.) are often just link colors, NOT brand colors. You MUST return the brand's ACTUAL colors. If the detected colors don't match the brand identity, CORRECT them.

Respond with this exact JSON structure:
{
  "brandName": "from page or meta",
  "tagline": "from hero/subheadline on page",
  "industry": "specific industry",
  "websiteCategory": "ecommerce|restaurant|saas|agency|portfolio|landing-page|corporate",
  "primaryColor": "brand's ACTUAL primary color hex — detected ${data.primaryColor || 'unknown'}, correct if wrong",
  "secondaryColor": "brand's ACTUAL secondary color hex — detected ${data.secondaryColor || 'unknown'}, correct if wrong",
  "accentColor": "brand's ACTUAL accent/CTA color hex — detected ${data.accentColor || 'unknown'}, correct if wrong (generic blues are usually wrong)",
  "suggestedFontStyle": "modern|classic|playful|elegant|bold",
  "brandVoice": "tone description",
  "targetAudience": "who are their customers",
  "uniqueSellingPoints": ["from actual page content only"],
  "keyMessages": ["from headlines/descriptions"],
  "products": [
    {
      "name": "actual product/service name",
      "price": "price with currency symbol or null",
      "description": "from page content",
      "image": "URL from [IMG] entries that matches this product, or null",
      "keyFeatures": ["for services - key benefits/features"],
      "suggestedAdAngle": "compelling angle for advertising this"
    }
  ],
  "productType": "physical|digital|service",
  "serviceSubType": "food-restaurant|saas-platform|intangible (only if service)",
  "isEcommerce": true/false,
  "adRecommendations": {
    "bestPlatforms": ["Instagram", "Facebook"],
    "suggestedTones": ["professional"],
    "visualStyle": "style description matching brand",
    "callToAction": "CTA text from page or appropriate one"
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert website analyst for an ad generation platform. You extract products, services, brand identity, and marketing insights from website content.

STRICT RULES:
1. NEVER hallucinate - only use data from the provided page content
2. Pricing tier names (Starter, Pro, Enterprise, etc.) are NOT products - they are pricing plans
3. The actual product/service is what the hero headline describes
4. USPs must come from real page content, not generic marketing phrases
5. Match product images to products using the [IMG] entries
6. Detect currency from actual symbols on the page - do NOT assume any default currency
7. Respond with valid JSON only.`,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content);

    // Build the final analysis
    const analysis: URLBrandAnalysis = {
      brandName: result.brandName || data.brandName,
      tagline: result.tagline || data.tagline || '',
      industry: result.industry || 'General',
      // AI colors take priority — it validates and corrects scraped colors
      primaryColor: result.primaryColor || data.primaryColor || '#3B82F6',
      secondaryColor: result.secondaryColor || data.secondaryColor || '#1E40AF',
      accentColor: result.accentColor || data.accentColor || '#F59E0B',
      suggestedFontStyle: result.suggestedFontStyle || 'modern',
      brandVoice: result.brandVoice || 'Professional',
      targetAudience: result.targetAudience || 'General consumers',
      uniqueSellingPoints: result.uniqueSellingPoints || [],
      keyMessages: result.keyMessages || [],
      products: [],
      productType: result.productType || 'physical',
      serviceSubType: result.serviceSubType,
      isEcommerce: result.isEcommerce || false,
      adRecommendations: result.adRecommendations || {
        bestPlatforms: ['Instagram', 'Facebook'],
        suggestedTones: ['professional'],
        visualStyle: 'Clean and modern',
        callToAction: 'Learn More',
      },
    };

    // Helper: validate that a URL actually points to an image, not a page
    const isImageUrl = (url: string | null | undefined): string | null => {
      if (!url || url === 'null') return null;
      // Data URLs are fine
      if (url.startsWith('data:image/')) return url;
      // Must be http(s)
      if (!url.startsWith('http')) return null;
      // Check for image extensions or CDN/media paths
      if (/\.(jpe?g|png|gif|webp|avif|bmp|tiff?|svg)(\?|$)/i.test(url)) return url;
      if (/\/(image|img|photo|media|cdn|static|upload|asset)/i.test(url)) return url;
      // Reject if it looks like a product page
      if (/\/products?\//i.test(url) && !/\.(jpe?g|png|gif|webp)/i.test(url)) return null;
      // Wix, Shopify, Cloudinary CDN patterns
      if (/wixstatic|shopify|cloudinary|imgix|unsplash|pexels/i.test(url)) return url;
      // Default: allow (might be a CDN URL without extension)
      return url;
    };

    // Merge products: prefer schema.org products (they have verified structure),
    // then add AI-extracted products that aren't duplicates
    const finalProducts: URLBrandAnalysis['products'] = [];
    const seenNames = new Set<string>();

    // Schema.org products first (highest confidence)
    for (const sp of data.products.slice(0, 15)) {
      const aiProduct = (result.products || []).find((p: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
        p.name?.toLowerCase() === sp.name.toLowerCase() ||
        sp.name.toLowerCase().includes(p.name?.toLowerCase() || '') ||
        (p.name?.toLowerCase() || '').includes(sp.name.toLowerCase())
      );

      seenNames.add(sp.name.toLowerCase());
      finalProducts.push({
        name: sp.name,
        price: sp.price ? `${sp.currency ? sp.currency + ' ' : ''}${sp.price}` : null,
        description: aiProduct?.description || sp.description || `${sp.name}`,
        image: isImageUrl(sp.image) || isImageUrl(aiProduct?.image) || null,
        keyFeatures: aiProduct?.keyFeatures || [],
        suggestedAdAngle: aiProduct?.suggestedAdAngle || `Discover ${sp.name}`,
      });
    }

    // AI-extracted products (for things not in schema.org)
    for (const aiProd of (result.products || [])) {
      if (!seenNames.has(aiProd.name?.toLowerCase())) {
        seenNames.add(aiProd.name?.toLowerCase());
        finalProducts.push({
          name: aiProd.name,
          price: aiProd.price || null,
          description: aiProd.description || '',
          image: isImageUrl(aiProd.image) || null,
          keyFeatures: aiProd.keyFeatures || [],
          suggestedAdAngle: aiProd.suggestedAdAngle || `Discover ${aiProd.name}`,
        });
      }
    }

    analysis.products = finalProducts;

    // Update scrapedData fields based on AI analysis
    if (result.websiteCategory) {
      data.websiteCategory = result.websiteCategory;
    }
    data.isEcommerce = analysis.isEcommerce;
    data.hasProducts = analysis.products.length > 0;
    data.estimatedProductType = analysis.productType;

    console.log(`[URL-Scrape] AI extracted: ${analysis.products.length} products, category: ${result.websiteCategory}, type: ${analysis.productType}`);

    return analysis;

  } catch (error) {
    console.error('[URL-Scrape] AI extraction failed:', error);
    return buildFallbackAnalysis(data);
  }
}

/**
 * Fallback analysis when AI fails - uses whatever meta data we have
 */
function buildFallbackAnalysis(data: EnhancedScrapedData): URLBrandAnalysis {
  const products = data.products.map(p => ({
    name: p.name,
    price: p.price,
    description: p.description || `${p.name}`,
    image: p.image,
    keyFeatures: [] as string[],
    suggestedAdAngle: `Discover ${p.name}`,
  }));

  // If no products at all, create a generic one from brand name
  if (products.length === 0) {
    products.push({
      name: `${data.brandName} Services`,
      price: null,
      description: data.metaDescription || data.tagline || `Products and services from ${data.brandName}`,
      image: data.ogImage || null,
      keyFeatures: [],
      suggestedAdAngle: `Discover what ${data.brandName} has to offer`,
    });
  }

  return {
    brandName: data.brandName,
    tagline: data.tagline || `Quality from ${data.brandName}`,
    industry: 'General',
    primaryColor: data.primaryColor || '#3B82F6',
    secondaryColor: data.secondaryColor || '#1E40AF',
    accentColor: data.accentColor || '#F59E0B',
    suggestedFontStyle: 'modern',
    brandVoice: 'Professional and trustworthy',
    targetAudience: 'General consumers',
    uniqueSellingPoints: data.headlines.slice(0, 3),
    keyMessages: data.headlines.slice(0, 2),
    products,
    productType: 'physical',
    isEcommerce: false,
    adRecommendations: {
      bestPlatforms: ['Instagram', 'Facebook'],
      suggestedTones: ['professional'],
      visualStyle: 'Clean and modern',
      callToAction: 'Learn More',
    },
  };
}
