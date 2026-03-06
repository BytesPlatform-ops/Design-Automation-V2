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
  keyFeatures?: string[]; // USPs/selling points for service ads
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
  // Food/restaurant services should be treated like physical products (show the food)
  const isFoodService = isService && analysis.serviceSubType === 'food-restaurant';
  // SaaS/platform services need feature highlights
  const isSaaSService = isService && analysis.serviceSubType === 'saas-platform';
  // Intangible services need selling points (consulting, agencies, etc.)
  const isIntangibleService = isService && !isFoodService && !isSaaSService;
  // Should we include key features/selling points in the ad?
  const needsKeyFeatures = isIntangibleService || isSaaSService;
  
  const itemTerm = isFoodService ? 'menu item' : isSaaSService ? 'platform/tool' : isService ? 'service' : isDigital ? 'digital product' : 'product';
  const itemTermPlural = isFoodService ? 'menu items' : isSaaSService ? 'platform features' : isService ? 'services' : isDigital ? 'digital products' : 'products';
  const itemTermCap = isFoodService ? 'Menu Item' : isSaaSService ? 'Platform' : isService ? 'Service' : isDigital ? 'Digital Product' : 'Product';
  
  const prompt = `You are a world-class creative director at a top advertising agency. You've created viral campaigns for Nike, Apple, and Coca-Cola. Now create STUNNING ad concepts for this ${isFoodService ? 'food/restaurant' : isSaaSService ? 'SaaS/platform' : isService ? 'service-based' : 'product-based'} brand.

=== BRAND IDENTITY ===
Brand: ${analysis.brandName}
Tagline: ${analysis.tagline}
Industry: ${analysis.industry}
Brand Voice: ${analysis.brandVoice}
Target Audience: ${analysis.targetAudience}
Business Type: ${analysis.productType.toUpperCase()}${isFoodService ? ' (FOOD/RESTAURANT - treat menu items like PHYSICAL products, show the FOOD beautifully)' : isSaaSService ? ' (SAAS/PLATFORM - focus on ease of use, speed, benefits, show interface mockups)' : isIntangibleService ? ' (INTANGIBLE SERVICE - no physical products, focus on benefits & selling points)' : isDigital ? ' (DIGITAL PRODUCT - focus on transformation, knowledge, convenience)' : ' (PHYSICAL PRODUCT)'}
USPs: ${analysis.uniqueSellingPoints.join(' | ')}

=== BRAND COLORS (MANDATORY IN EVERY AD) ===
Primary: ${analysis.primaryColor} → Use for backgrounds, major shapes, dominant color
Secondary: ${analysis.secondaryColor} → Supporting elements, gradients, accents
Accent: ${analysis.accentColor} → CTA buttons, highlights, pop elements

=== ${itemTermPlural.toUpperCase()} TO ADVERTISE ===
${selectedProducts.map((p, i) => `
[${itemTermCap} ${i + 1}] ${p.name}
• Price: ${p.price || (needsKeyFeatures ? 'Contact for quote' : 'Premium pricing')}
• Description: ${p.description}
• Key Features: ${p.keyFeatures.join(', ') || (needsKeyFeatures ? 'Professional expertise' : 'Premium quality')}
• Angle: ${p.suggestedAdAngle}
• ${isFoodService ? 'FOOD visualization needed - show the MEAL/DISH appetizingly' : isIntangibleService ? 'Service visualization needed (objects, environments, NOT people)' : isDigital ? 'Digital product visualization needed (mockup, interface, abstract representation)' : `Product Image Available: ${!!p.image ? 'YES - use the actual product photo' : 'NO - create product visualization'}`}
`).join('\n')}

=== YOUR MISSION ===
Create EXACTLY ${adsPerProduct} DISTINCTLY DIFFERENT ad concepts for EACH ${itemTerm}.
Target: ${platforms.join(', ')}
Total ads needed: EXACTLY ${selectedProducts.length * adsPerProduct} ideas (${adsPerProduct} per ${itemTerm} × ${selectedProducts.length} ${itemTermPlural})

🚨 CRITICAL: You MUST return EXACTLY ${selectedProducts.length * adsPerProduct} ad ideas in your response. No more, no less.

Each ad must have:
1. A SCROLL-STOPPING headline (5-8 words, powerful hook)
2. A compelling subheadline that adds value
3. A premium, SPECIFIC visual concept

=== VISUAL CONCEPT GUIDELINES ===
Think like a professional photographer/art director.

🚫🚫🚫 ABSOLUTE RULE - NO PEOPLE 🚫🚫🚫
DO NOT include ANY of these in visual concepts:
- NO people, persons, individuals, humans, figures
- NO entrepreneurs, business owners, customers, users, clients
- NO faces, hands, bodies, silhouettes
- NO "someone doing X", "person using Y", "user celebrating"
- NO lifestyle scenes WITH people
- NO "happy customer", "excited user", "professional at work"

AI-generated humans look FAKE and ARTIFICIAL. They ruin the ad quality.

✅ INSTEAD, FOCUS ON:
- OBJECTS: laptops, phones, tablets, devices, products, tools
- ENVIRONMENTS: offices, desks, workspaces, rooms (WITHOUT people)
- ABSTRACT: geometric shapes, gradients, icons, infographics
- RESULTS: charts, dashboards, interfaces, screens showing outcomes
- PROPS: coffee cups, notebooks, pens, plants (suggesting human presence without showing humans)

${isFoodService ? `
🍽️ THIS IS A FOOD/RESTAURANT BUSINESS - SPECIAL RULES:
Treat the food items like PHYSICAL PRODUCTS. Show the FOOD as the HERO.

FOCUS ON:
1. FOOD PHOTOGRAPHY: Beautifully plated dishes as the centerpiece
2. APPETITE APPEAL: Steam rising, glistening textures, vibrant colors
3. INGREDIENTS: Fresh ingredients arranged around the main dish
4. TABLE SETTING: Elegant plates, cutlery, napkins, wood/marble surfaces
5. MOOD LIGHTING: Warm, inviting, appetizing golden tones
6. CLOSE-UP SHOTS: Macro details that make viewers hungry
7. BRAND COLORS: Incorporate ${analysis.primaryColor} in background or accents

DO NOT include:
- People eating or serving
- Faces, hands, chefs
- Selling points / USP bullet points (this is NOT an IT service)

The FOOD is the product. Make it look IRRESISTIBLE.
` : isIntangibleService ? `
For INTANGIBLE SERVICE businesses (IT, consulting, marketing, etc.):

🧹 CLEANING/HOME SERVICES:
- Sparkling clean spaces, before/after environments
- Cleaning products, organized rooms, pristine surfaces

💼 BUSINESS/CONSULTING SERVICES:
- Meeting rooms, whiteboards with charts, professional workspaces
- Documents, contracts, graphs showing growth
- Office environments, boardrooms WITHOUT people

🏥 HEALTH/WELLNESS SERVICES:
- Spa environments, wellness equipment, calming spaces
- Medical equipment, clean clinical settings

🎓 EDUCATION/TRAINING SERVICES:
- Books, certificates, graduation caps, learning materials
- Classrooms, libraries WITHOUT students

💻 TECH/IT SERVICES:
- Servers, code on screens, network diagrams
- Modern office setups, multiple monitors
- Abstract data visualizations, tech aesthetics

📦 DELIVERY/LOGISTICS SERVICES:
- Packages, delivery boxes, organized warehouses
- Maps, routes, transportation elements

INTANGIBLE SERVICE PRINCIPLES:
1. OUTCOME/RESULT: Show what the service DELIVERS
2. TOOLS OF THE TRADE: Equipment and items used
3. ENVIRONMENT: Where the service happens (without people)
4. ABSTRACT: Geometric shapes, icons, infographics in brand colors
5. TYPOGRAPHY AS HERO: Bold text with supporting visuals
` : isDigital ? `
For DIGITAL products (NO people, faces, or hands):
1. DEVICE MOCKUP: Show the product on devices (laptop, tablet, phone screens) — floating or on desk, NO hands
2. INTERFACE PREVIEW: Highlight key features, dashboards, or content previews
3. FLOATING ELEMENTS: Book covers, course modules, software icons floating in space
4. 3D ABSTRACT: Futuristic elements, data visualization, clean tech aesthetics
5. ENVIRONMENT: Tech-forward desk setup, workspace with devices (no people working)
6. SCREEN CONTENT: What the user sees when using the product
7. COLOR STORY: Tech-forward use of brand colors with gradients and glow effects
8. TRANSFORMATION SYMBOLS: Before/after icons, progress bars, achievement badges (no people showing transformation)
` : `
For PHYSICAL products, focus on:
1. COMPOSITION: Where is the product? (center hero, rule of thirds, floating, on surface)
2. BACKGROUND: Specific scene/environment (marble countertop, wooden table, gradient wash)
3. LIGHTING: Type and mood (golden hour, studio softbox, dramatic side-light)
4. PROPS & STYLING: What surrounds the product? (ingredients, textures, complementary items)
5. COLOR STORY: How do brand colors appear? (background gradient, color blocks)
6. TYPOGRAPHY PLACEMENT: Where does text go? (top third, bottom bar, overlaid)
7. MOOD: The feeling (luxurious, energetic, cozy, professional)
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
      ${isIntangibleService ? '"keyFeatures": ["USP 1 - short benefit point", "USP 2 - short benefit point", "USP 3 - short benefit point"],' : ''}
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

${needsKeyFeatures ? `
IMPORTANT FOR ${isSaaSService ? 'SAAS/PLATFORM' : 'INTANGIBLE'} SERVICES:
- Include "keyFeatures" array with 3-4 concise USPs/selling points for each service
- These will be displayed as elegant feature badges on the ad
- Keep each point short (3-6 words) and benefit-focused
- Examples: ${isSaaSService ? '"Ready in 20 Minutes", "No Coding Required", "Free Hosting Forever", "One-Click Launch"' : '"24/7 Expert Support", "Money Back Guarantee", "Certified Professionals"'}
` : isFoodService ? `
IMPORTANT FOR FOOD/RESTAURANT BUSINESSES:
- DO NOT include "keyFeatures" array - food ads don't need bullet point selling points
- Focus entirely on making the FOOD look irresistible
- The visual concept should be 100% about food presentation, appetite appeal
- If price is available, it should be shown prominently
- CTA should be "Order Now" or "Get Yours Now"
` : ''}
REMEMBER: The visualConcept is the MOST IMPORTANT field. It directly determines ad quality. Be specific, vivid, and professional.

🚫 FINAL CHECK - REJECT ANY VISUAL CONCEPT THAT MENTIONS:
- entrepreneur, business owner, customer, user, person, people, individual
- someone, anyone, they, their (referring to people)
- happy, excited, smiling (emotions of people)
- celebrating, working, using (actions by people)
If you catch yourself writing about people, REWRITE to focus on objects/environments instead.`;

  try {
    const expectedIdeas = selectedProducts.length * adsPerProduct;
    console.log(`[URL-Ideation] Expecting ${expectedIdeas} ideas (${adsPerProduct} per product × ${selectedProducts.length} products)`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',  // Using better model for creative ideation
      messages: [
        {
          role: 'system',
          content: `You are a creative advertising expert. Generate unique, compelling ad ideas. 
CRITICAL RULES:
1. Never include people, humans, or individuals in visual concepts - AI cannot generate realistic humans
2. Focus on objects, devices, environments, and abstract elements
3. You MUST generate EXACTLY the number of ideas requested - no more, no less
4. Always respond with valid JSON only.`,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 8000, // Ensure enough tokens for multiple ideas
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
    
    // Warn if we got fewer ideas than expected
    if (ideas.length < expectedIdeas) {
      console.warn(`[URL-Ideation] WARNING: Expected ${expectedIdeas} ideas but got ${ideas.length}`);
    }

    return ideas;

  } catch (error) {
    console.error('[URL-Ideation] OpenAI error:', error);
    throw error;
  }
}
