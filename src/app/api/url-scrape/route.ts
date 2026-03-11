import { NextResponse } from 'next/server';
import { 
  scrapeWebsite, 
  UnifiedScrapedData as EnhancedScrapedData, 
  ScrapedProduct 
} from '@/lib/unified-scraper';
import { 
  getCachedBrandProfile, 
  saveBrandProfile, 
  profileToAnalysis,
  extractDomain 
} from '@/lib/brand-profile-service';
import OpenAI from 'openai';

// Re-export ScrapedProduct for backward compatibility
export type { ScrapedProduct };

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
    const { url, forceRefresh = false } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log('[URL-Scrape] Starting enhanced scrape for:', url);
    
    // ========================================
    // STEP 0: Check for cached brand profile
    // ========================================
    if (!forceRefresh) {
      try {
        const { profile, isStale } = await getCachedBrandProfile(url);
        
        if (profile && !isStale) {
          console.log(`[URL-Scrape] Using cached profile for ${extractDomain(url)} (scrape count: ${profile.scrape_count})`);
          const cachedAnalysis = profileToAnalysis(profile);
          
          return NextResponse.json({
            success: true,
            analysis: cachedAnalysis,
            cached: true,
            cacheAge: Math.round((Date.now() - new Date(profile.last_scraped_at).getTime()) / (1000 * 60 * 60)) + 'h',
          });
        }
        
        if (profile && isStale) {
          console.log(`[URL-Scrape] Cache is stale for ${extractDomain(url)}, refreshing...`);
        }
      } catch (cacheError) {
        console.log('[URL-Scrape] Cache check failed, proceeding with fresh scrape:', cacheError);
      }
    }
    
    // ========================================
    // STEP 1: Use unified scraper (handles Puppeteer/Cheerio automatically)
    // ========================================
    console.log('[URL-Scrape] Using unified scraper...');
    const scrapedData = await scrapeWebsite(url, {
      timeout: 15000,
      enablePuppeteer: true,
      maxProducts: 50,
      scrapeProductPages: true,
    });
    
    console.log('[URL-Scrape] Scraped data:', {
      brandName: scrapedData.brandName,
      productsFound: scrapedData.products.length,
      hasLogo: !!scrapedData.logo,
      primaryColor: scrapedData.primaryColor,
    });

    // Step 2: AI Analysis to enhance the scraped data
    const analysis = await analyzeScrapedData(scrapedData);
    
    // ========================================
    // STEP 3: Save to cache for future use
    // ========================================
    try {
      await saveBrandProfile(url, analysis, 0.8);
    } catch (cacheError) {
      console.log('[URL-Scrape] Failed to cache profile (non-blocking):', cacheError);
    }
    
    return NextResponse.json({
      success: true,
      scrapedData,
      analysis,
      cached: false,
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
  "primaryColor": "${data.primaryColor || 'REQUIRED - suggest appropriate color based on products/industry (e.g. honey=amber #D97706, tech=blue, health=green)'}",
  "secondaryColor": "${data.secondaryColor || 'REQUIRED - complementary/darker shade of primary'}",
  "accentColor": "${data.accentColor || 'REQUIRED - contrasting accent for CTAs'}",
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

COLOR GUIDANCE (when no colors extracted):
- Honey/Food products: Warm amber #D97706, brown #92400E, gold #F59E0B
- Health/Organic: Green #059669, forest #065F46, lime #84CC16  
- Tech/SaaS: Blue #3B82F6, indigo #4F46E5, cyan #06B6D4
- Fashion: Black #171717, rose #E11D48, purple #7C3AED
- Finance: Navy #1E3A8A, gold #CA8A04, slate #475569

REMEMBER: 
- If products array is empty/has only pricing tiers → identify the ACTUAL service from the hero headline and describe what they do (NOT inventing features)
- USPs MUST come from "Value Propositions Found" or "Stats/Numbers" above
- The product name should reflect what's explicitly stated in the hero/descriptions
- DO NOT HALLUCINATE generic services like "Business Management", "CRM System" unless explicitly found
- Colors MUST be valid hex codes starting with #`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Upgraded from gpt-4o-mini for better analysis quality
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
    
    // Ensure we have colors - apply smart defaults based on industry if AI returned null
    const defaultColorsByIndustry: Record<string, { primary: string; secondary: string; accent: string }> = {
      'restaurant': { primary: '#DC2626', secondary: '#7F1D1D', accent: '#FBBF24' },
      'restaurant': { primary: '#DC2626', secondary: '#7F1D1D', accent: '#FBBF24' },
      'saas': { primary: '#3B82F6', secondary: '#1E40AF', accent: '#10B981' },
      'ecommerce': { primary: '#059669', secondary: '#047857', accent: '#F59E0B' },
      'agency': { primary: '#6366F1', secondary: '#4338CA', accent: '#EC4899' },
      'food': { primary: '#D97706', secondary: '#92400E', accent: '#F59E0B' }, // Honey/food products
      'health': { primary: '#059669', secondary: '#065F46', accent: '#84CC16' },
      'default': { primary: '#3B82F6', secondary: '#1E40AF', accent: '#F59E0B' },
    };
    
    // Try to detect more specific industry from products/content
    const allText = (data.headlines.join(' ') + ' ' + data.descriptions.join(' ')).toLowerCase();
    const productNames = data.products.map(p => p.name.toLowerCase()).join(' ');
    const combinedText = allText + ' ' + productNames;
    
    let detectedIndustry = data.websiteCategory;
    if (combinedText.includes('honey') || combinedText.includes('organic') || combinedText.includes('artisan')) {
      detectedIndustry = 'food';
    } else if (combinedText.includes('health') || combinedText.includes('wellness') || combinedText.includes('supplement')) {
      detectedIndustry = 'health';
    }
    
    const industryColors = defaultColorsByIndustry[detectedIndustry] || defaultColorsByIndustry[data.websiteCategory] || defaultColorsByIndustry['default'];
    
    // Handle null or invalid color values from AI
    const isValidHexColor = (color: string | null | undefined): boolean => {
      if (!color) return false;
      return /^#[0-9A-Fa-f]{6}$/.test(color);
    };
    
    if (!isValidHexColor(analysis.primaryColor)) {
      analysis.primaryColor = data.primaryColor || industryColors.primary;
    }
    if (!isValidHexColor(analysis.secondaryColor)) {
      analysis.secondaryColor = data.secondaryColor || industryColors.secondary;
    }
    if (!isValidHexColor(analysis.accentColor)) {
      analysis.accentColor = data.accentColor || industryColors.accent;
    }
    
    console.log(`[URL-Scrape] Colors: primary=${analysis.primaryColor}, detected industry=${detectedIndustry}`);
    
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