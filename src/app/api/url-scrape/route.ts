import { NextResponse } from 'next/server';
import { enhancedScrapeWebsite, EnhancedScrapedData } from '@/lib/enhanced-scraper';
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
    
    // Step 1: Enhanced scraping
    const scrapedData = await enhancedScrapeWebsite(url);
    
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
  const prompt = `Analyze this scraped website data and provide a comprehensive brand analysis for ad generation.

SCRAPED DATA:
Brand Name: ${data.brandName}
Tagline: ${data.tagline || 'Not found'}
Website URL: ${data.url}

Products Found (${data.products.length}):
${data.products.map((p, i) => `
${i + 1}. ${p.name}
   Price: ${p.price || 'Not listed'}
   Description: ${p.description || 'No description'}
   Has Image: ${!!p.image}
`).join('')}

Colors Extracted:
- Primary: ${data.primaryColor || 'Unknown'}
- Secondary: ${data.secondaryColor || 'Unknown'}
- All colors: ${data.allColors.slice(0, 5).join(', ')}

Headlines from site:
${data.headlines.slice(0, 5).join('\n')}

Descriptions from site:
${data.descriptions.slice(0, 3).join('\n')}

Potential USPs:
${data.uniqueSellingPoints.slice(0, 5).join('\n')}

Business Type: ${data.estimatedProductType}
Is E-commerce: ${data.isEcommerce}

Provide analysis in this JSON format:
{
  "brandName": "actual brand name",
  "tagline": "catchy tagline (create one if not found)",
  "industry": "specific industry",
  "primaryColor": "#HEXCODE (use scraped or suggest)",
  "secondaryColor": "#HEXCODE",
  "accentColor": "#HEXCODE",
  "suggestedFontStyle": "modern|classic|playful|elegant|bold",
  "brandVoice": "description of how brand should sound",
  "targetAudience": "who are the customers",
  "uniqueSellingPoints": ["usp1", "usp2", "usp3"],
  "keyMessages": ["message1", "message2"],
  "products": [
    {
      "name": "product/service name",
      "price": "price or null",
      "description": "compelling description for ads",
      "image": "image url or null",
      "keyFeatures": ["feature1", "feature2"],
      "suggestedAdAngle": "best way to advertise this"
    }
  ],
  "productType": "physical|digital|service",
  "isEcommerce": true/false,
  "adRecommendations": {
    "bestPlatforms": ["Instagram", "Facebook"],
    "suggestedTones": ["professional", "friendly"],
    "visualStyle": "description of visual style for ads",
    "callToAction": "suggested CTA"
  }
}

Important:
1. For products, use the scraped images if available
2. Create compelling descriptions suitable for advertising
3. Suggest ad angles that highlight product/service benefits
4. Use the scraped colors, only suggest alternatives if none found
5. Make sure all products from the scraped data are included in your response
6. FOR SERVICE COMPANIES: If no products are found, the business is likely a SERVICE company. Create 2-4 "virtual products" representing their key services (e.g., "Web Development", "Consulting", "Training"). Set productType to "service".
7. FOR SERVICE ADS: Focus on outcomes, benefits, and transformations rather than physical products`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a brand strategist and marketing expert. Analyze websites and provide comprehensive brand analysis for ad generation. For SERVICE companies without product listings, create virtual service offerings to advertise. Always respond with valid JSON only, no markdown formatting.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    const analysis = JSON.parse(content) as URLBrandAnalysis;
    
    // Merge scraped product images back in (AI might not preserve them)
    // Match by name, not index, since AI might reorder products
    analysis.products = analysis.products.map((product) => {
      // Find matching scraped product by name (fuzzy match)
      const scrapedProduct = data.products.find(sp => 
        sp.name.toLowerCase() === product.name.toLowerCase() ||
        sp.name.toLowerCase().includes(product.name.toLowerCase()) ||
        product.name.toLowerCase().includes(sp.name.toLowerCase())
      );
      
      // Use scraped image (it's the actual cloudfront URL)
      const imageUrl = scrapedProduct?.image || product.image || null;
      
      console.log(`[URL-Scrape] Product "${product.name}" image: ${imageUrl ? imageUrl.substring(0, 60) + '...' : 'NONE'}`);
      
      return {
        ...product,
        image: imageUrl,
      };
    });
    
    // Ensure we have colors
    if (!analysis.primaryColor && data.primaryColor) {
      analysis.primaryColor = data.primaryColor;
    }
    if (!analysis.secondaryColor && data.secondaryColor) {
      analysis.secondaryColor = data.secondaryColor;
    }
    
    return analysis;
    
  } catch (error) {
    console.error('[URL-Scrape] AI Analysis failed:', error);
    
    // Return a basic analysis from scraped data
    return {
      brandName: data.brandName,
      tagline: data.tagline || `Quality ${data.estimatedProductType}s you can trust`,
      industry: 'General',
      primaryColor: data.primaryColor || '#3B82F6',
      secondaryColor: data.secondaryColor || '#1E40AF',
      accentColor: data.accentColor || '#F59E0B',
      suggestedFontStyle: 'modern',
      brandVoice: 'Professional and trustworthy',
      targetAudience: 'General consumers',
      uniqueSellingPoints: data.uniqueSellingPoints.slice(0, 3),
      keyMessages: data.headlines.slice(0, 2),
      products: data.products.map(p => ({
        name: p.name,
        price: p.price,
        description: p.description || `High quality ${p.name}`,
        image: p.image,
        keyFeatures: [],
        suggestedAdAngle: `Highlight the quality and value of ${p.name}`,
      })),
      productType: data.estimatedProductType,
      isEcommerce: data.isEcommerce,
      adRecommendations: {
        bestPlatforms: ['Instagram', 'Facebook'],
        suggestedTones: ['professional'],
        visualStyle: 'Clean and modern',
        callToAction: 'Shop Now',
      },
    };
  }
}
