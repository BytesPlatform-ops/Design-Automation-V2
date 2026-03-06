import { NextResponse } from 'next/server';
import { enhancedScrapeWebsite, EnhancedScrapedData, ScrapedProduct } from '@/lib/enhanced-scraper';
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
  // Sub-type for services:
  // - 'food-restaurant': treats products like physical items (meals, dishes)
  // - 'saas-platform': digital platforms/tools with feature highlights
  // - 'intangible': consulting/agencies that use selling points
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

    console.log('[URL-Scrape] Starting enhanced scrape for:', url);
    
    // Step 1: Try Puppeteer first (works on Render, local dev)
    let scrapedData: EnhancedScrapedData;
    
    if (isPuppeteerAvailable()) {
      console.log('[URL-Scrape] Puppeteer available, using headless browser...');
      const puppeteerData = await scrapeWithPuppeteer(url);
      
      if (puppeteerData) {
        console.log(`[URL-Scrape] Puppeteer found ${puppeteerData.products.length} products`);
        
        // Determine product type based on website category
        let estimatedProductType: 'physical' | 'digital' | 'service' = 'physical';
        if (puppeteerData.websiteCategory === 'saas' || puppeteerData.websiteCategory === 'agency') {
          estimatedProductType = 'service';
        } else if (puppeteerData.websiteCategory === 'landing-page') {
          estimatedProductType = 'digital';
        }
        
        // Convert to EnhancedScrapedData format
        scrapedData = {
          url,
          brandName: puppeteerData.brandName || new URL(url).hostname.replace('www.', ''),
          tagline: puppeteerData.landingPageContent.heroSubheadline,
          logo: puppeteerData.logo,
          favicon: null,
          primaryColor: puppeteerData.primaryColor,
          secondaryColor: puppeteerData.secondaryColor,
          accentColor: puppeteerData.accentColor,
          allColors: [puppeteerData.primaryColor, puppeteerData.secondaryColor, puppeteerData.accentColor].filter(Boolean) as string[],
          products: puppeteerData.products,
          productCategories: [],
          heroImage: null,
          bannerImages: [],
          allImages: [],
          headlines: puppeteerData.landingPageContent.heroHeadline ? [puppeteerData.landingPageContent.heroHeadline] : [],
          descriptions: puppeteerData.landingPageContent.serviceDescriptions,
          uniqueSellingPoints: puppeteerData.landingPageContent.valuePropositions,
          landingPageContent: {
            heroHeadline: puppeteerData.landingPageContent.heroHeadline,
            heroSubheadline: puppeteerData.landingPageContent.heroSubheadline,
            ctaText: puppeteerData.landingPageContent.ctaText,
            valuePropositions: puppeteerData.landingPageContent.valuePropositions,
            serviceDescriptions: puppeteerData.landingPageContent.serviceDescriptions,
            pricingInfo: puppeteerData.landingPageContent.pricingInfo,
            testimonials: [],
            statsNumbers: puppeteerData.landingPageContent.statsNumbers,
            featuresList: puppeteerData.landingPageContent.featuresList,
          },
          contactEmail: null,
          phone: null,
          address: null,
          socialLinks: {},
          metaTitle: puppeteerData.title || '',
          metaDescription: puppeteerData.description || '',
          ogImage: null,
          structuredData: [],
          isEcommerce: puppeteerData.websiteCategory === 'ecommerce' || puppeteerData.websiteCategory === 'restaurant',
          hasProducts: puppeteerData.products.length > 0,
          estimatedProductType,
          websiteCategory: puppeteerData.websiteCategory,
        };
      } else {
        console.log('[URL-Scrape] Puppeteer failed, falling back to Cheerio...');
        scrapedData = await enhancedScrapeWebsite(url);
      }
    } else {
      console.log('[URL-Scrape] Puppeteer not available, using Cheerio scraper...');
      scrapedData = await enhancedScrapeWebsite(url);
    }
    
    console.log('[URL-Scrape] Scraped data:', {
      brandName: scrapedData.brandName,
      productsFound: scrapedData.products.length,
      hasLogo: !!scrapedData.logo,
      primaryColor: scrapedData.primaryColor,
    });

    // Step 2: AI Analysis to enhance the scraped data
    const analysis = await analyzeScrapedData(scrapedData);
    
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

async function analyzeScrapedData(data: EnhancedScrapedData): Promise<URLBrandAnalysis> {
  // Only send first 15 products to AI for analysis (to avoid token limits)
  const productsForAnalysis = data.products.slice(0, 15);
  
  // Get landing page content for service/SaaS sites
  const landingContent = data.landingPageContent;
  const websiteCategory = data.websiteCategory || 'unknown';
  
  console.log('[URL-Scrape] Website Category:', websiteCategory);
  console.log('[URL-Scrape] Landing Page Content:', {
    heroHeadline: landingContent?.heroHeadline,
    ctaText: landingContent?.ctaText,
    valuePropositions: landingContent?.valuePropositions?.slice(0, 3),
    pricingPlans: landingContent?.pricingInfo?.length,
    features: landingContent?.featuresList?.length,
  });
  
  const prompt = `Analyze this scraped website data and provide brand analysis for ad generation.

=== WEBSITE DATA ===
Brand Name: ${data.brandName}
Tagline: ${data.tagline || 'Not found'}
URL: ${data.url}
Website Category: ${websiteCategory}

=== LANDING PAGE CONTENT (EXTRACTED FROM WEBSITE) ===
Hero Headline: ${landingContent?.heroHeadline || 'Not found'}
Hero Subheadline: ${landingContent?.heroSubheadline || 'Not found'}

CTA Buttons: ${landingContent?.ctaText?.join(', ') || 'Not found'}

Value Propositions Found:
${landingContent?.valuePropositions?.slice(0, 5).map((v, i) => `${i + 1}. "${v}"`).join('\n') || 'None found'}

Service Descriptions:
${landingContent?.serviceDescriptions?.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('\n') || 'None found'}

Pricing Plans:
${landingContent?.pricingInfo?.map(p => `- ${p.planName}: ${p.price || 'Custom'} (${p.features.length} features)`).join('\n') || 'None found'}

Features/Benefits:
${landingContent?.featuresList?.slice(0, 6).map(f => `- ${f.title}${f.description ? ': ' + f.description.substring(0, 80) : ''}`).join('\n') || 'None found'}

Stats/Numbers:
${landingContent?.statsNumbers?.map(s => `- ${s.value} ${s.label}`).join('\n') || 'None found'}

=== SCRAPED PRODUCTS (${data.products.length} total) ===
${productsForAnalysis.map((p, i) => `${i + 1}. ${p.name} - ${p.price || 'No price'}`).join('\n') || 'No products found'}

=== EXTRACTED CONTENT ===
Headlines: ${data.headlines.slice(0, 5).join(' | ') || 'None'}
Meta Description: ${data.metaDescription || 'None'}

Colors: Primary: ${data.primaryColor || 'Unknown'}, Secondary: ${data.secondaryColor || 'Unknown'}

=============================================
🚨 CRITICAL RULES - DO NOT HALLUCINATE 🚨
=============================================

1. ONLY USE DATA FROM ABOVE - Do NOT invent or imagine services/products
2. If you see pricing tiers (Starter, Pro, Enterprise) - these are NOT the products
3. The ACTUAL service is what the hero headline/description says they do
4. USPs must come from the extracted "Value Propositions" or "Stats/Numbers"

WEBSITE CATEGORY HANDLING:
- "${websiteCategory}" detected

${websiteCategory === 'saas' || websiteCategory === 'landing-page' ? `
FOR SAAS/LANDING PAGE:
- Product = The main service/platform mentioned in hero headline
- Look at hero headline to understand WHAT they actually build/offer
- Example: Hero says "We build your website" → Product is "Website Builder"
- keyFeatures should come from the extracted features list
- USPs should come from the value propositions
- DO NOT create generic business tools (CRM, Project Management) unless explicitly mentioned
` : ''}

${websiteCategory === 'agency' ? `
FOR AGENCY:
- Products = Their service offerings
- Look at service descriptions for what they actually do
- Example: "Web Design Agency" → Services: "Web Design", "UI/UX Design"
- keyFeatures = their process or deliverables
` : ''}

${websiteCategory === 'restaurant' || websiteCategory === 'ecommerce' ? `
FOR RESTAURANT/ECOMMERCE:
- Products = Use the scraped products directly
- These are actual items (food, merchandise)
- DO NOT add keyFeatures to food items
` : ''}

RESPONSE FORMAT (JSON):
{
  "brandName": "${data.brandName}",
  "tagline": "from hero subheadline or create based on what they do",
  "industry": "specific industry based on content",
  "primaryColor": "${data.primaryColor || '#3B82F6'}",
  "secondaryColor": "${data.secondaryColor || '#1E40AF'}",
  "accentColor": "${data.accentColor || '#F59E0B'}",
  "suggestedFontStyle": "modern|classic|playful|elegant|bold",
  "brandVoice": "tone based on website content",
  "targetAudience": "based on content clues",
  "uniqueSellingPoints": ["MUST be from extracted value propositions/stats"],
  "keyMessages": ["from headlines or descriptions"],
  "products": [
    {
      "name": "ACTUAL service from hero/descriptions (NOT pricing tier names)",
      "price": "from pricing info or null",
      "description": "based on extracted descriptions",
      "image": null,
      "keyFeatures": ["from extracted features list"],
      "suggestedAdAngle": "based on value propositions"
    }
  ],
  "productType": "physical|digital|service",
  "serviceSubType": "food-restaurant|saas-platform|intangible",
  "isEcommerce": ${data.isEcommerce},
  "adRecommendations": {
    "bestPlatforms": ["Instagram", "Facebook"],
    "suggestedTones": ["professional"],
    "visualStyle": "based on brand",
    "callToAction": "from CTA buttons or create appropriate one"
  }
}

REMEMBER: 
- If products array is empty/has pricing tiers → create 1-2 products based on hero headline
- USPs MUST come from "Value Propositions Found" or "Stats/Numbers" above
- DO NOT HALLUCINATE generic services like "Business Management", "CRM System" unless explicitly found`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: `You are a brand analyst. Your job is to extract and organize REAL data from websites.

🚨 STRICT RULES - YOU MUST FOLLOW:

1. NEVER HALLUCINATE - Only use data provided in the prompt
2. Products/services MUST come from:
   - Hero headline (what do they actually do?)
   - Service descriptions
   - Actual scraped products (if they're real items, not pricing tiers)

3. Pricing tier names are NOT products:
   - "Starter", "Pro", "Enterprise", "Basic", "Premium" = IGNORE
   - These are pricing plans, not what the business sells

4. USPs MUST come from:
   - "Value Propositions Found" section
   - "Stats/Numbers" section
   - DO NOT invent generic USPs

5. For SaaS/agencies:
   - The product is what the hero headline says they do
   - "We build websites" → Product: "Website Builder"
   - "Marketing that works" → Service: "Marketing Services"

6. DO NOT create generic services like:
   - "Business Management Tool" ❌
   - "CRM System" ❌
   - "Project Collaboration Platform" ❌
   (Unless explicitly mentioned in the scraped content)

Respond with valid JSON only.` 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3, // Lower temperature for more factual responses
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    const analysis = JSON.parse(content) as URLBrandAnalysis;
    
    // IMPORTANT: Use ALL scraped products, not just what AI returned
    // AI only analyzed a sample, so we need to use the full scraped product list
    // Create a map of AI-enhanced products for quick lookup
    const aiProductMap = new Map<string, typeof analysis.products[0]>();
    (analysis.products || []).forEach(p => {
      aiProductMap.set(p.name.toLowerCase(), p);
    });
    
    // Pricing tier names to filter out - these are NOT products/services
    const pricingTierPatterns = [
      /^starter$/i, /^pro$/i, /^basic$/i, /^premium$/i, /^enterprise$/i,
      /^free$/i, /^business$/i, /^plus$/i, /^professional$/i, /^team$/i,
      /^individual$/i, /^personal$/i, /^agency$/i, /^growth$/i, /^scale$/i,
      /^starter\s+(plan|package|tier)/i, /^pro\s+(plan|package|tier)/i,
      /^basic\s+(plan|package|tier)/i, /^premium\s+(plan|package|tier)/i,
    ];
    
    const isPricingTier = (name: string): boolean => {
      return pricingTierPatterns.some(pattern => pattern.test(name.trim()));
    };
    
    // Filter out pricing tiers from scraped products
    const filteredScrapedProducts = data.products.filter(p => !isPricingTier(p.name));
    
    // If ALL scraped products were pricing tiers (SaaS site), use AI's service offerings instead
    if (filteredScrapedProducts.length === 0 && analysis.products && analysis.products.length > 0) {
      console.log(`[URL-Scrape] Detected SaaS/service site with pricing tiers only. Using AI-generated services.`);
      // Use AI products but filter out any pricing tier names the AI might have kept
      analysis.products = analysis.products.filter(p => !isPricingTier(p.name));
    } else {
      // Build final products list from filtered scraped products
      analysis.products = filteredScrapedProducts.map((scrapedProduct) => {
        // Try to find AI enhancement for this product
        const aiProduct = aiProductMap.get(scrapedProduct.name.toLowerCase()) ||
          Array.from(aiProductMap.values()).find(ap => 
            ap.name.toLowerCase().includes(scrapedProduct.name.toLowerCase()) ||
            scrapedProduct.name.toLowerCase().includes(ap.name.toLowerCase())
          );
        
        const imageUrl = scrapedProduct.image || aiProduct?.image || null;
        
        console.log(`[URL-Scrape] Product "${scrapedProduct.name}" image: ${imageUrl ? imageUrl.substring(0, 60) + '...' : 'NONE'}`);
        
        return {
          name: scrapedProduct.name,
          price: scrapedProduct.price,
          description: aiProduct?.description || scrapedProduct.description || `Premium ${scrapedProduct.name}`,
          image: imageUrl,
          keyFeatures: aiProduct?.keyFeatures || [],
          suggestedAdAngle: aiProduct?.suggestedAdAngle || `Discover ${scrapedProduct.name}`,
        };
      });
    }
    
    console.log(`[URL-Scrape] Final products count: ${analysis.products.length}`);
    
    // Ensure we have colors
    if (!analysis.primaryColor && data.primaryColor) {
      analysis.primaryColor = data.primaryColor;
    }
    if (!analysis.secondaryColor && data.secondaryColor) {
      analysis.secondaryColor = data.secondaryColor;
    }
    
    // CRITICAL: Override productType based on our website category detection
    // AI often gets this wrong, so trust our category detection
    if (data.websiteCategory === 'saas' || data.websiteCategory === 'agency') {
      console.log(`[URL-Scrape] Overriding productType to 'service' based on websiteCategory: ${data.websiteCategory}`);
      analysis.productType = 'service';
      analysis.serviceSubType = data.websiteCategory === 'saas' ? 'saas-platform' : 'intangible';
    } else if (data.websiteCategory === 'restaurant') {
      analysis.productType = 'service';
      analysis.serviceSubType = 'food-restaurant';
    } else if (data.websiteCategory === 'landing-page' && data.products.length === 0) {
      // Landing page with no products = service
      analysis.productType = 'service';
      analysis.serviceSubType = 'intangible';
    }
    
    console.log(`[URL-Scrape] Final productType: ${analysis.productType}, serviceSubType: ${analysis.serviceSubType || 'none'}`);
    
    return analysis;
    
  } catch (error) {
    console.error('[URL-Scrape] AI Analysis failed:', error);
    
    // Build better fallback using landing page content
    const landingContent = data.landingPageContent;
    
    // Extract USPs from value propositions
    const usps = landingContent?.valuePropositions?.slice(0, 3) || 
      data.uniqueSellingPoints.slice(0, 3) ||
      [];
    
    // Create product from hero headline if no products
    let products = data.products.map(p => ({
      name: p.name,
      price: p.price,
      description: p.description || `High quality ${p.name}`,
      image: p.image,
      keyFeatures: [] as string[],
      suggestedAdAngle: `Highlight the quality and value of ${p.name}`,
    }));
    
    // If no products, create from hero headline
    if (products.length === 0 && landingContent?.heroHeadline) {
      products = [{
        name: data.brandName + ' Services',
        price: null,
        description: landingContent.heroSubheadline || landingContent.heroHeadline,
        image: null,
        keyFeatures: landingContent.featuresList?.slice(0, 4).map(f => f.title) || [],
        suggestedAdAngle: landingContent.ctaText?.[0] || 'Get Started Today',
      }];
    }
    
    // Return a basic analysis from scraped data
    return {
      brandName: data.brandName,
      tagline: landingContent?.heroSubheadline || data.tagline || `Quality ${data.estimatedProductType}s you can trust`,
      industry: 'General',
      primaryColor: data.primaryColor || '#3B82F6',
      secondaryColor: data.secondaryColor || '#1E40AF',
      accentColor: data.accentColor || '#F59E0B',
      suggestedFontStyle: 'modern' as const,
      brandVoice: 'Professional and trustworthy',
      targetAudience: 'General consumers',
      uniqueSellingPoints: usps,
      keyMessages: data.headlines.slice(0, 2),
      products,
      productType: data.estimatedProductType,
      isEcommerce: data.isEcommerce,
      adRecommendations: {
        bestPlatforms: ['Instagram', 'Facebook'],
        suggestedTones: ['professional'],
        visualStyle: 'Clean and modern',
        callToAction: landingContent?.ctaText?.[0] || 'Shop Now',
      },
    };
  }}