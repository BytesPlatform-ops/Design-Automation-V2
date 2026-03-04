import OpenAI from 'openai';
import { ScrapedWebsiteData } from './scraper';
import { ProductType } from '@/types';

// Lazy initialization
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface ExtractedBrandInfo {
  // Core brand identity
  brandName: string;
  tagline: string | null;
  description: string;
  
  // Visual identity
  primaryColor: string;
  secondaryColor: string;
  accentColor: string | null;
  logoUrl: string | null;
  
  // Brand voice
  toneOfVoice: string; // e.g., "Professional yet approachable", "Bold and edgy"
  targetAudience: string;
  uniqueSellingPoints: string[];
  
  // Business context
  industry: string;
  niche: string;
  productType: ProductType;
  
  // Products/Services
  products: Array<{
    name: string;
    description: string;
    price?: string;
    imageUrl?: string;
  }>;
  
  // Additional extracted info
  contactEmail?: string;
  phone?: string;
  socialLinks: string[];
  
  // Confidence scores
  confidence: {
    brandName: number;
    colors: number;
    products: number;
    overall: number;
  };
}

/**
 * Use AI to analyze scraped website data and extract brand identity
 */
export async function analyzeBrand(
  scrapedData: ScrapedWebsiteData
): Promise<ExtractedBrandInfo> {
  const openai = getOpenAI();

  // Prepare condensed data for the prompt
  const condensedData = {
    url: scrapedData.url,
    title: scrapedData.title,
    description: scrapedData.description,
    ogData: scrapedData.ogData,
    headings: scrapedData.headings.slice(0, 10),
    paragraphs: scrapedData.paragraphs.slice(0, 5),
    colors: scrapedData.colors.slice(0, 10),
    products: scrapedData.products.slice(0, 10),
    logoUrl: scrapedData.logo,
    socialLinks: scrapedData.socialLinks,
    contactInfo: scrapedData.contactInfo,
  };

  const systemPrompt = `You are a brand identity expert. Analyze the provided website data and extract comprehensive brand information.

Your task is to identify:
1. Brand name and tagline
2. Visual identity (colors, feel)
3. Brand voice and tone
4. Target audience
5. Industry and niche
6. Products or services offered
7. Unique selling points

Be analytical and infer information even when not explicitly stated. Use the context clues from headings, descriptions, and overall website structure.

Respond ONLY with valid JSON matching this exact structure:
{
  "brandName": "string - the brand/company name",
  "tagline": "string or null - the brand's tagline/slogan if found",
  "description": "string - 2-3 sentence brand description",
  "primaryColor": "string - hex color code for primary brand color",
  "secondaryColor": "string - hex color code for secondary color", 
  "accentColor": "string or null - hex color code for accent if distinct",
  "logoUrl": "string or null - URL to the logo if found",
  "toneOfVoice": "string - describe the brand's communication style",
  "targetAudience": "string - describe the target demographic/psychographic",
  "uniqueSellingPoints": ["array of 3-5 key value propositions"],
  "industry": "string - primary industry category",
  "niche": "string - specific niche within industry",
  "productType": "physical | service | digital",
  "products": [
    {
      "name": "string",
      "description": "string - brief description",
      "price": "string or undefined",
      "imageUrl": "string or undefined"
    }
  ],
  "contactEmail": "string or undefined",
  "phone": "string or undefined",
  "socialLinks": ["array of social media URLs found"],
  "confidence": {
    "brandName": 0.0-1.0,
    "colors": 0.0-1.0,
    "products": 0.0-1.0,
    "overall": 0.0-1.0
  }
}

For colors: If extracted colors are available, use them. Otherwise, infer appropriate colors from the brand's industry and vibe.
For confidence: Rate how confident you are in each extraction (1.0 = very confident, 0.5 = moderate, 0.2 = guessing).`;

  const userPrompt = `Analyze this website data and extract brand identity:

${JSON.stringify(condensedData, null, 2)}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  try {
    const parsed = JSON.parse(content) as ExtractedBrandInfo;
    
    // Validate and fix product type
    if (!['physical', 'service', 'digital'].includes(parsed.productType)) {
      parsed.productType = 'digital';
    }
    
    // Ensure arrays exist
    parsed.uniqueSellingPoints = parsed.uniqueSellingPoints || [];
    parsed.products = parsed.products || [];
    parsed.socialLinks = parsed.socialLinks || [];
    
    // Use scraped logo if AI didn't find one
    if (!parsed.logoUrl && scrapedData.logo) {
      parsed.logoUrl = scrapedData.logo;
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to parse AI response:', content);
    throw new Error('Failed to parse brand analysis');
  }
}

/**
 * Convert extracted brand info to BusinessDetails format
 * for compatibility with existing pipeline
 */
export function brandInfoToBusinessDetails(
  brandInfo: ExtractedBrandInfo
): {
  businessName: string;
  productType: ProductType;
  industry: string;
  niche: string;
  brandSlogan?: string;
  pricingInfo?: string;
  adCopyPoints?: string;
  aspectRatio: '1:1' | '9:16' | '16:9';
} {
  // Extract pricing info from products
  const pricesWithValues = brandInfo.products
    .filter((p) => p.price)
    .map((p) => `${p.name}: ${p.price}`);
  const pricingInfo = pricesWithValues.length > 0 
    ? pricesWithValues.slice(0, 3).join(', ')
    : undefined;

  // Create ad copy points from USPs
  const adCopyPoints = brandInfo.uniqueSellingPoints.length > 0
    ? brandInfo.uniqueSellingPoints.join('\n')
    : undefined;

  return {
    businessName: brandInfo.brandName,
    productType: brandInfo.productType,
    industry: brandInfo.industry,
    niche: brandInfo.niche,
    brandSlogan: brandInfo.tagline || undefined,
    pricingInfo,
    adCopyPoints,
    aspectRatio: '1:1', // Default, user can change later
  };
}
