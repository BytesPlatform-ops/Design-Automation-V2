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
  visualStyle?: '3D' | 'photorealistic' | 'flat' | 'cinematic' | 'isometric'; // render style tag
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
Think like a world-class creative director crafting a campaign SPECIFICALLY for ${analysis.brandName}.

🚫 ABSOLUTE RULE - NO PEOPLE 🚫
NO people, faces, hands, silhouettes, humans in any form. AI-generated humans look fake and ruin quality.
Instead: objects, environments, abstract elements, products, devices, props suggesting human presence.

=== BRAND-FIRST VISUAL IDENTITY ===
Every visual concept MUST feel like it belongs to ${analysis.brandName}'s world.
- PRIMARY COLOR (${analysis.primaryColor}): This is the dominant brand DNA — use it in backgrounds, major shapes, gradients
- SECONDARY COLOR (${analysis.secondaryColor}): Supporting elements, overlays, secondary shapes
- ACCENT COLOR (${analysis.accentColor}): CTA buttons, price tags, highlight pops, attention-grabbers
- BRAND VOICE: ${analysis.brandVoice || 'professional'} — the visual mood must MATCH this voice
- FONT STYLE: ${analysis.suggestedFontStyle || 'modern'} — typography must reinforce brand personality

🚨 MANDATORY DIVERSITY RULE 🚨
You are generating ${selectedProducts.length * adsPerProduct} ads total. Each ad MUST use a DIFFERENT visual approach.
Assign each ad a UNIQUE combination from these dimensions:
- SURFACE/ENVIRONMENT: Each ad must use a DIFFERENT setting (never repeat the same surface or background)
- LIGHTING STYLE: Vary between — neon glow, soft diffused, dramatic spotlight, backlit rim, natural daylight, moody low-key, high-key bright, colored gel lighting
- COMPOSITION: Vary between — centered hero, diagonal dynamic, rule-of-thirds, bird's-eye flat-lay, close-up macro, floating/levitation, split-frame, asymmetric
- MOOD: Vary between — luxurious, energetic, minimal-clean, bold-graphic, warm-cozy, futuristic, editorial, playful
- RENDER STYLE: Mix between — photorealistic, 3D rendered, isometric 3D, cinematic, hyper-stylized, graphic/flat design

🎨 3D VISUAL CONCEPTS — MANDATORY REQUIREMENT:
🚨 EXACTLY ${Math.max(1, Math.floor(adsPerProduct / 2))} ad(s) per product MUST use a 3D render style (visualStyle: "3D" or "isometric").
3D renders produce the most STUNNING, scroll-stopping ads. Use SPECIFIC 3D rendering terminology:
- 3D FLOATING PRODUCT: Hyper-realistic product floating at a dynamic tilt, soft drop shadow on ${analysis.primaryColor} reflective ground plane, volumetric rim lighting, shallow depth of field, 4K UHD studio render with global illumination and HDR lighting
- ISOMETRIC 3D SCENE: Product in a miniature isometric diorama with brand-colored elements, playful depth, tiny props, soft ambient occlusion, tilt-shift blur
- 3D EXPLODED VIEW: Product components dramatically separated in 3D space, connected by ${analysis.accentColor} energy trails, cinematic motion blur on particles, studio lighting with caustics
- GLOSSY 3D RENDER: Product with ultra-glossy glass-like material, cool condensation drops, intricate surface reflections of ${analysis.primaryColor} environment, 3-point studio lighting, raytraced reflections
- CINEMATIC 3D HERO: Product as central focus with dramatic action — splashes, particles, ingredients mid-air with motion blur. Background bokeh, lens flare, film grain. Rendered in Octane/Blender quality with global illumination
If an ad uses 3D, set "visualStyle": "3D" or "isometric". Otherwise use "photorealistic", "cinematic", or "flat".

Before writing each concept, mentally check: "Is this visually DISTINCT from every other concept I've written?"

${isFoodService ? `
🍽️ FOOD/RESTAURANT BRAND — MAKE THE FOOD THE HERO
This is ${analysis.brandName} — a food brand. The FOOD is the product. Make it IRRESISTIBLE.

VISUAL APPROACH FOR EACH AD (use a DIFFERENT one per ad):
1. DRAMATIC HERO SHOT: Single dish as centerpiece, dramatic ${analysis.primaryColor}-toned lighting, brand-colored background gradient, steam/smoke effects
2. FLAT-LAY FEAST: Top-down view of the dish with scattered fresh ingredients, brand-colored napkins/plates, ${analysis.accentColor} price tag overlay
3. CLOSE-UP MACRO: Extreme close-up showing textures — melting cheese, crispy coating, glistening sauce. ${analysis.primaryColor} gradient bar with bold typography
4. DECONSTRUCTED INGREDIENTS: Fresh ingredients floating/arranged artfully around the assembled dish, clean background in ${analysis.secondaryColor}, modern typography
5. BRAND ENVIRONMENT: Dish presented on branded packaging/tray with ${analysis.primaryColor} background, neon-style text, bold graphic shapes
6. CONTRAST & COLOR POP: Dish on a bold solid ${analysis.primaryColor} background, no surface needed — just pure color and food, floating effect with drop shadow
7. SEASONAL/MOOD SCENE: Dish in a themed environment (rainy day comfort, summer freshness, night cravings) with brand colors woven into lighting/overlays
8. 3D RENDERED FEAST: Hyper-realistic 3D render of the dish with exaggerated textures — ultra-crispy coating, hyper-glossy dripping sauce, perfect cheese pull. Product on ${analysis.primaryColor} reflective pedestal with volumetric rim lighting, shallow depth of field, floating ingredients mid-air with cinematic motion blur, condensation droplets, rendered in 4K UHD with global illumination and HDR lighting

DO NOT: show people eating/serving, use generic "wooden table" for every ad, forget brand colors
` : isIntangibleService ? `
💼 INTANGIBLE SERVICE BRAND — VISUALIZE THE OUTCOME
${analysis.brandName} sells results, not objects. Show what the service DELIVERS.

VISUAL APPROACH FOR EACH AD (use a DIFFERENT one per ad):
1. OUTCOME SHOWCASE: The end result of the service — clean space, growing charts, organized systems. ${analysis.primaryColor} branded frame/overlay
2. TOOLS OF EXCELLENCE: Premium equipment/tools used by the service, artfully arranged. ${analysis.secondaryColor} background, ${analysis.accentColor} highlights
3. ABSTRACT BRAND WORLD: Geometric shapes, icons, infographic elements in brand colors (${analysis.primaryColor}, ${analysis.secondaryColor}, ${analysis.accentColor}) on dark/light contrasting background
4. ENVIRONMENT: The space where the service happens (empty office, clean room, modern workspace) bathed in ${analysis.primaryColor}-tinted lighting
5. BEFORE/AFTER SPLIT: Split composition showing transformation, ${analysis.primaryColor} divider, bold typography
6. TYPOGRAPHY-LED: Bold headline as the hero visual element, supported by brand-colored abstract shapes, minimal props
7. DATA/RESULTS: Charts, dashboards, metrics on screens/floating — all using brand color palette
8. 3D ABSTRACT WORLD: Service concept rendered as a miniature 3D isometric scene — tiny objects representing the service outcome, brand-colored materials, soft studio lighting
` : isDigital ? `
💻 DIGITAL PRODUCT — SHOWCASE THE EXPERIENCE
${analysis.brandName} is a digital product. Show the interface, the magic, the transformation.

VISUAL APPROACH FOR EACH AD (use a DIFFERENT one per ad):
1. DEVICE MOCKUP: Product shown on a sleek device (laptop/tablet/phone) with ${analysis.primaryColor} gradient background, floating UI elements
2. INTERFACE HERO: Key screen/dashboard enlarged and styled, ${analysis.secondaryColor} abstract shapes behind, ${analysis.accentColor} feature callouts
3. FLOATING UI ELEMENTS: Cards, buttons, icons from the product floating in 3D space over ${analysis.primaryColor} to ${analysis.secondaryColor} gradient
4. 3D ABSTRACT: Futuristic shapes, data streams, glowing elements in brand colors, tech-forward aesthetic
5. RESULTS DASHBOARD: Metrics, charts, success indicators displayed beautifully, brand-colored data visualization
6. MINIMAL TECH: Clean desk with single device showing the product, ${analysis.primaryColor} accent lighting, modern minimal vibe
7. SPLIT CONCEPT: Before (chaos/old way) vs After (clean/product way) split by ${analysis.accentColor} divider
8. 3D FLOATING UI: Key interface elements rendered as glossy 3D cards floating in space with depth-of-field blur, ${analysis.primaryColor} glow underneath, holographic feel
` : `
📦 PHYSICAL PRODUCT — PREMIUM PRODUCT PHOTOGRAPHY
${analysis.brandName} sells physical products. Each ad needs a UNIQUE setting.

VISUAL APPROACH FOR EACH AD (use a DIFFERENT one per ad):
1. BOLD COLOR BLOCK: Product floating on solid ${analysis.primaryColor} background, dramatic shadow, ${analysis.accentColor} CTA badge, clean and modern
2. CONTEXTUAL SCENE: Product in its natural use environment (NOT generic table), relevant props, ${analysis.secondaryColor} tinted atmospheric lighting
3. INGREDIENT/DETAIL STORY: Product surrounded by its raw ingredients or components, artfully scattered, ${analysis.primaryColor} gradient backdrop
4. MINIMAL EDITORIAL: Product on clean white/neutral surface, single dramatic spotlight, ${analysis.accentColor} text overlays, magazine-style
5. DYNAMIC ANGLE: Dramatic low-angle or tilted composition, motion blur hints, ${analysis.primaryColor} neon/glow accents, energetic feel
6. FLAT-LAY ARRANGEMENT: Bird's-eye view, product centered with complementary items in a grid pattern, ${analysis.secondaryColor} background
7. TEXTURED LUXURY: Product on textured surface that matches brand vibe (concrete for industrial, silk for luxury, etc.), ${analysis.primaryColor} lighting wash
8. 3D PRODUCT HERO: Hyper-realistic 3D render of the product floating at a dramatic tilt, ultra-glossy materials with intricate surface reflections, cool condensation/texture details. ${analysis.primaryColor} reflective ground plane, volumetric rim lighting from behind, shallow depth of field, particles/droplets frozen mid-air, rendered in 4K UHD with global illumination and HDR lighting
`}

=== WHAT MAKES A GREAT VISUAL CONCEPT ===

❌ BAD (generic, no brand DNA, no rendering cues):
"Product on wooden table with warm lighting and text overlay"
"Beautiful dish on dark surface with golden hour lighting"
"Clean product shot on marble countertop with nice typography"

✅ GOOD (brand-specific, rendering-detailed, cinematic):
"Hyper-realistic 3D render of ${analysis.brandName}'s hero product floating at a 15° tilt above a ${analysis.primaryColor} reflective surface. Volumetric rim lighting from behind creates a glowing halo. Shallow depth of field with background bokeh in ${analysis.secondaryColor}. Tiny water droplets and particles frozen mid-air. ${analysis.accentColor} price badge floating top-right with glass-morphism effect. Bold headline in white across bottom third. Rendered in 4K UHD with global illumination. Mood: premium, cinematic, scroll-stopping."
"Ultra-detailed macro shot of the dish's textures — crispy golden edges, glistening sauce, steam wisps rising. Shot at f/1.8 with creamy bokeh. Background fades to ${analysis.primaryColor} gradient. ${analysis.accentColor} banner with price in bold type. Brand name upper-left. Lighting: single dramatic key light from 45° with warm fill. Mood: craveable, bold, appetizing."
"Cinematic 3D scene: product dramatically bursting through a ${analysis.primaryColor} splash with ingredients scattered mid-air, captured with cinematic motion blur. Volumetric god rays in ${analysis.accentColor}. Ground plane has reflective puddle effect. Shot composition follows rule-of-thirds. HDR lighting with lens flare. Mood: energetic, dynamic, attention-grabbing."

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
      "visualConcept": "DETAILED 50-100 word visual description with SPECIFIC rendering cues: camera angle, lighting type, depth of field, material quality, motion effects, render quality (4K UHD, global illumination, HDR). Think like a 3D artist/photographer.",
      "visualStyle": "3D|photorealistic|flat|cinematic|isometric (pick the render style used in this concept)",
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

🚫 FINAL CHECK - BEFORE RETURNING, VERIFY EACH CONCEPT:
1. NO PEOPLE: Reject any mention of people, faces, hands, entrepreneurs, customers, users, silhouettes
2. BRAND COLORS PRESENT: Each concept MUST reference ${analysis.primaryColor}, ${analysis.secondaryColor}, or ${analysis.accentColor} at least twice
3. UNIQUE VISUALS: No two concepts should share the same surface, lighting style, or composition
4. TYPOGRAPHY DIRECTION: Each concept should specify font style, text placement, and text color contrast
5. CTA DESIGN: Each concept should describe how the CTA button/element looks and where it sits
6. MOOD SPECIFIED: Each concept ends with a clear mood that matches ${analysis.brandVoice || 'the brand voice'}

If any concept fails these checks, REWRITE it before returning.`;

  try {
    const expectedIdeas = selectedProducts.length * adsPerProduct;
    console.log(`[URL-Ideation] Expecting ${expectedIdeas} ideas (${adsPerProduct} per product × ${selectedProducts.length} products)`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',  // Using better model for creative ideation
      messages: [
        {
          role: 'system',
          content: `You are a world-class creative director who creates BRAND-SPECIFIC ad campaigns. Every concept must feel like it was designed BY the brand, FOR the brand — using their exact colors, voice, and aesthetic.

CRITICAL RULES:
1. NEVER include people, humans, faces, hands, or silhouettes — AI cannot generate realistic humans
2. Every visual concept MUST prominently feature the brand's color palette — no generic/random colors
3. Each ad concept must be VISUALLY DISTINCT from every other — different composition, lighting, surface, mood
4. You MUST generate EXACTLY the number of ideas requested — no more, no less
5. Think about typography, color placement, CTA design, and layout — not just the scene
6. TARGET AUDIENCE: Default to US market/audience unless the brand explicitly serves a different region. Use USD references where currency is unknown.
7. VISUAL CONCEPTS: Write like a 3D artist/photographer — include specific rendering cues: camera settings (f-stop, focal length), lighting setup (key/fill/rim), material quality, motion effects, render quality (4K UHD, global illumination, HDR). The more specific, the better the generated ad.
8. Always respond with valid JSON only.`,
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
