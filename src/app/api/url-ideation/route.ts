import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { URLBrandAnalysis } from '../url-scrape/route';

const openai = new OpenAI();

export interface URLAdIdea {
  id: string;
  productName: string;
  productImage: string | null;
  productPrice: string | null;
  headline: string;
  subheadline: string;
  bodyText: string;
  callToAction: string;
  adAngle: string;
  visualConcept: string;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  targetAudience: string;
  platform: string;
  suggestedFormat: 'square' | 'portrait' | 'landscape';
}

export async function POST(req: Request) {
  try {
    const { 
      analysis,
      selectedProducts,
      platforms = ['Instagram', 'Facebook'],
      adsPerProduct = 2,
    } = await req.json() as {
      analysis: URLBrandAnalysis;
      selectedProducts: Array<{
        name: string;
        price: string | null;
        description: string;
        image: string | null;
        keyFeatures: string[];
        suggestedAdAngle: string;
      }>;
      platforms?: string[];
      adsPerProduct?: number;
    };

    if (!analysis || !selectedProducts?.length) {
      return NextResponse.json(
        { error: 'Analysis and selected products are required' },
        { status: 400 }
      );
    }

    console.log('[URL-Ideation] Generating ideas for', selectedProducts.length, 'products');
    
    // Debug: Log the product images we received
    selectedProducts.forEach((p, i) => {
      console.log(`[URL-Ideation] Product ${i + 1}: ${p.name}, Image: ${p.image || 'NONE'}`);
    });

    const ideas = await generateAdIdeas(analysis, selectedProducts, platforms, adsPerProduct);

    return NextResponse.json({
      success: true,
      ideas,
    });

  } catch (error) {
    console.error('[URL-Ideation] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate ideas' },
      { status: 500 }
    );
  }
}

async function generateAdIdeas(
  analysis: URLBrandAnalysis,
  selectedProducts: URLBrandAnalysis['products'],
  platforms: string[],
  adsPerProduct: number
): Promise<URLAdIdea[]> {
  
  // Adapt terminology based on business type
  const isService = analysis.productType === 'service';
  const isDigital = analysis.productType === 'digital';
  const itemTerm = isService ? 'service' : isDigital ? 'digital product' : 'product';
  const itemTermPlural = isService ? 'services' : isDigital ? 'digital products' : 'products';
  const itemTermCap = isService ? 'Service' : isDigital ? 'Digital Product' : 'Product';
  
  const prompt = `You are a world-class creative director at a top advertising agency. You've created viral campaigns for Nike, Apple, and Coca-Cola. Now create STUNNING ad concepts for this ${isService ? 'service-based' : 'product-based'} brand.

=== BRAND IDENTITY ===
Brand: ${analysis.brandName}
Tagline: ${analysis.tagline}
Industry: ${analysis.industry}
Brand Voice: ${analysis.brandVoice}
Target Audience: ${analysis.targetAudience}
Business Type: ${analysis.productType.toUpperCase()} (${isService ? 'This is a SERVICE company - no physical products, focus on benefits & outcomes' : isDigital ? 'This sells DIGITAL products (software, ebooks, courses, downloads) - focus on transformation, knowledge, convenience' : 'This sells PHYSICAL products'})
USPs: ${analysis.uniqueSellingPoints.join(' | ')}

=== BRAND COLORS (MANDATORY IN EVERY AD) ===
Primary: ${analysis.primaryColor} → Use for backgrounds, major shapes, dominant color
Secondary: ${analysis.secondaryColor} → Supporting elements, gradients, accents
Accent: ${analysis.accentColor} → CTA buttons, highlights, pop elements

=== ${itemTermPlural.toUpperCase()} TO ADVERTISE ===
${selectedProducts.map((p, i) => `
[${itemTermCap} ${i + 1}] ${p.name}
• Price: ${p.price || (isService ? 'Contact for quote' : 'Premium pricing')}
• Description: ${p.description}
• Key Features: ${p.keyFeatures.join(', ') || (isService ? 'Professional expertise' : 'Premium quality')}
• Angle: ${p.suggestedAdAngle}
• ${isService ? 'Service visualization needed' : isDigital ? 'Digital product visualization needed (mockup, interface, abstract representation)' : `Product Image Available: ${!!p.image ? 'YES - use the actual product photo' : 'NO - create product visualization'}`}
`).join('\n')}

=== YOUR MISSION ===
Create ${adsPerProduct} DISTINCTLY DIFFERENT ad concepts for EACH ${itemTerm}.
Target: ${platforms.join(', ')}
Total ads needed: ${selectedProducts.length * adsPerProduct}

Each ad must have:
1. A SCROLL-STOPPING headline (5-8 words, powerful hook)
2. A compelling subheadline that adds value
3. A premium, SPECIFIC visual concept

=== VISUAL CONCEPT GUIDELINES ===
Think like a professional photographer/art director. ${isService ? 'Since this is a SERVICE business, focus on:' : 'Describe:'}

${isService ? `
1. SCENE: Show the OUTCOME or EXPERIENCE of the service (happy client, transformed result, professional at work)
2. LIFESTYLE: Aspirational imagery showing what life looks like WITH this service
3. ABSTRACT: Professional imagery with geometric shapes, gradients using brand colors
4. HUMAN ELEMENT: People benefiting from or delivering the service
5. ENVIRONMENT: Where the service takes place (office, home, outdoors)
6. COLOR STORY: How the brand colors create the mood
7. TYPOGRAPHY: Bold text as the hero since there's no physical product
` : isDigital ? `
1. DEVICE MOCKUP: Show the digital product on devices (laptop, tablet, phone screens)
2. INTERFACE PREVIEW: Highlight key features, dashboards, or content previews
3. TRANSFORMATION: Before/after of what the user achieves with this product
4. ABSTRACT TECH: Futuristic elements, data visualization, clean tech aesthetics
5. PERSON + DEVICE: User enjoying/using the digital product
6. FLOATING ELEMENTS: Book covers, course modules, software icons floating in space
7. COLOR STORY: Tech-forward use of brand colors with gradients and glow effects
` : `
1. COMPOSITION: Where is the product? (center hero, rule of thirds, floating, hand-held, etc.)
2. BACKGROUND: Specific scene/environment (marble countertop, wooden table, gradient wash, etc.)
3. LIGHTING: Type and mood (golden hour, studio softbox, dramatic side-light, natural window light)
4. PROPS & STYLING: What surrounds the product? (ingredients, lifestyle items, textures)
5. COLOR STORY: How do the brand colors appear? (background gradient, color blocks, accent elements)
6. TYPOGRAPHY PLACEMENT: Where does text go? (top third, bottom bar, overlaid, etc.)
7. MOOD: The feeling (luxurious, energetic, cozy, professional, playful)
`}

BAD visualConcept: "Product on nice background with text"
GOOD visualConcept: "Hero product jar centered on dark slate surface, surrounded by cinnamon sticks and honeycomb. Warm amber backlighting creates golden glow. Rich ${analysis.primaryColor} gradient banner at top with bold white headline. ${analysis.accentColor} CTA button bottom-right. Mood: artisanal luxury, appetite appeal."

=== OUTPUT FORMAT (JSON) ===
{
  "ideas": [
    {
      "productName": "exact product name",
      "productPrice": "price if available, null otherwise",
      "headline": "POWERFUL 5-8 word hook",
      "subheadline": "supporting benefit (max 12 words)",
      "bodyText": "compelling 2-sentence copy",
      "callToAction": "action text (Shop Now, Try It Today, Order Now, etc.)",
      "adAngle": "unique selling angle for this ad",
      "visualConcept": "DETAILED 50-100 word visual description following guidelines above",
      "colorScheme": {
        "primary": "${analysis.primaryColor}",
        "secondary": "${analysis.secondaryColor}",
        "accent": "${analysis.accentColor}"
      },
      "targetAudience": "specific audience segment",
      "platform": "${platforms[0]}",
      "suggestedFormat": "square"
    }
  ]
}

REMEMBER: The visualConcept is the MOST IMPORTANT field. It directly determines ad quality. Be specific, vivid, and professional.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a creative advertising expert. Generate unique, compelling ad ideas. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{"ideas":[]}';
    const parsed = JSON.parse(content);
    const ideas: URLAdIdea[] = (parsed.ideas || []).map((idea: URLAdIdea, index: number) => {
      // Find the corresponding product to get its image and price
      const product = selectedProducts.find(p => 
        p.name.toLowerCase() === idea.productName?.toLowerCase() ||
        idea.productName?.toLowerCase().includes(p.name.toLowerCase())
      ) || selectedProducts[Math.floor(index / adsPerProduct)];

      return {
        ...idea,
        id: `url-idea-${index + 1}-${Date.now()}`,
        productImage: product?.image || null,
        productPrice: product?.price || idea.productPrice || null,
      };
    });

    console.log('[URL-Ideation] Generated', ideas.length, 'ideas');

    return ideas;

  } catch (error) {
    console.error('[URL-Ideation] OpenAI error:', error);
    throw error;
  }
}
