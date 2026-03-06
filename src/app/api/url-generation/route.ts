import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { URLAdIdea } from '../url-ideation/route';
import { 
  saveProject,
  saveCampaign, 
  saveGeneratedImage, 
  uploadImageToStorage 
} from '@/lib/supabase-client';

// Temporary user ID - same as dashboard so ads appear in My Projects
const TEMP_USER_ID = 'temp-user-' + (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 8) || 'default');

// Lazy initialization
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

interface GeneratedURLAd {
  id: string;
  ideaId: string;
  imageData: string; // base64 data URL
  productName: string;
  headline: string;
  aspectRatio: string;
}

interface URLGenerationRequest {
  ideas: URLAdIdea[];
  aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9';
  brandName: string;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logoUrl?: string;
  productType?: 'physical' | 'digital' | 'service';
  serviceSubType?: 'food-restaurant' | 'saas-platform' | 'intangible';
  industry?: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as URLGenerationRequest;
    const { ideas, aspectRatio = '1:1', brandName, brandColors, logoUrl, productType = 'physical', serviceSubType, industry = 'General' } = body;

    if (!ideas?.length) {
      return NextResponse.json({ error: 'No ideas provided' }, { status: 400 });
    }

    console.log('[URL-Generation] Generating', ideas.length, 'ads');
    console.log('[URL-Generation] Brand colors:', brandColors);
    console.log('[URL-Generation] Product type:', productType);
    
    // Debug: Log the ideas with their product images
    ideas.forEach((idea, i) => {
      console.log(`[URL-Generation] Idea ${i + 1}: ${idea.productName}, Image: ${idea.productImage || 'NONE'}`);
    });

    // Generate ads one by one (Gemini can't do batch image generation)
    const generatedAds: GeneratedURLAd[] = [];
    const errors: string[] = [];

    for (const idea of ideas) {
      try {
        const ad = await generateAdFromIdea(
          idea,
          aspectRatio,
          brandName,
          brandColors,
          logoUrl,
          productType,
          serviceSubType
        );
        generatedAds.push(ad);
      } catch (error) {
        console.error(`[URL-Generation] Failed to generate ad for ${idea.productName}:`, error);
        errors.push(`Failed: ${idea.productName} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Save to database (non-blocking - continue even if fails)
    let projectId: string | null = null;
    let campaignId: string | null = null;
    
    if (generatedAds.length > 0) {
      try {
        console.log('[URL-Generation] Saving to database...');
        
        // 1. Save project first (required for foreign key)
        const project = await saveProject(
          TEMP_USER_ID,
          brandName,
          industry,
          productType || 'physical'
        );
        projectId = project.id;
        console.log('[URL-Generation] Project saved:', projectId);

        // 2. Save campaign under the project
        const campaign = await saveCampaign(
          project.id,
          `${brandName} - URL Campaign - ${new Date().toLocaleDateString()}`,
          ideas[0]?.productName || 'URL Generated',
          `Auto-generated from URL with ${generatedAds.length} ads`,
          ideas[0]?.targetAudience || 'General audience'
        );
        campaignId = campaign.id;
        console.log('[URL-Generation] Campaign saved:', campaignId);

        // 3. Upload images to storage and save references
        for (let i = 0; i < generatedAds.length; i++) {
          const ad = generatedAds[i];
          try {
            const imageUrl = await uploadImageToStorage(
              campaign.id,
              `url-ad-${i}`,
              ad.imageData, // base64 data URL
              aspectRatio
            );

            await saveGeneratedImage(
              campaign.id,
              `url-ad-${i}`,
              imageUrl,
              ad.headline || `Ad for ${ad.productName}`,
              aspectRatio
            );
            console.log(`[URL-Generation] Saved image ${i + 1}/${generatedAds.length}`);
          } catch (storageError) {
            console.warn(`[URL-Generation] Failed to save image ${i} to storage:`, storageError);
            // Continue with next image even if one fails
          }
        }
        
        console.log('[URL-Generation] Database save complete');
      } catch (dbError) {
        console.warn('[URL-Generation] Database save failed, but continuing with response:', dbError);
        // Don't fail the generation if database save fails
      }
    }

    return NextResponse.json({
      success: true,
      ads: generatedAds,
      errors,
      total: ideas.length,
      generated: generatedAds.length,
      projectId,
      campaignId,
    });

  } catch (error) {
    console.error('[URL-Generation] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}

function getImageDimensions(aspectRatio: string): { width: number; height: number } {
  switch (aspectRatio) {
    case '1:1': return { width: 1024, height: 1024 };
    case '4:5': return { width: 1024, height: 1280 };
    case '9:16': return { width: 1024, height: 1820 };
    case '16:9': return { width: 1820, height: 1024 };
    default: return { width: 1024, height: 1024 };
  }
}

async function fetchImageAsBase64(url: string | null | undefined): Promise<{ data: string; mimeType: string } | null> {
  // Validate URL before attempting fetch
  if (!url || url === 'null' || url === 'undefined' || !url.startsWith('http')) {
    console.log('[URL-Generation] Invalid image URL, skipping fetch:', url);
    return null;
  }
  
  // Skip SVG images - Gemini doesn't support them
  if (url.toLowerCase().endsWith('.svg') || url.includes('.svg?')) {
    console.log('[URL-Generation] SVG image not supported, skipping:', url);
    return null;
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Skip SVG content type
    if (contentType.includes('svg')) {
      console.log('[URL-Generation] SVG content type not supported, skipping');
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    return {
      data: base64,
      mimeType: contentType,
    };
  } catch (error) {
    console.error('[URL-Generation] Failed to fetch image:', url, error);
    return null;
  }
}

async function generateAdFromIdea(
  idea: URLAdIdea,
  aspectRatio: string,
  brandName: string,
  brandColors: { primary: string; secondary: string; accent: string },
  logoUrl?: string,
  productType: 'physical' | 'digital' | 'service' = 'physical',
  serviceSubType?: 'food-restaurant' | 'saas-platform' | 'intangible'
): Promise<GeneratedURLAd> {
  const { width, height } = getImageDimensions(aspectRatio);
  
  const ai = getGenAI();
  const model = ai.getGenerativeModel({
    model: 'gemini-3-pro-image-preview',
    generationConfig: {
      temperature: 0.7,
    },
  });

  // Build parts array - images first
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  // If we have a product image URL, fetch and add it as reference
  if (idea.productImage) {
    console.log(`[URL-Generation] Fetching product image: ${idea.productImage}`);
    const productImageData = await fetchImageAsBase64(idea.productImage);
    
    if (productImageData) {
      console.log(`[URL-Generation] Adding product image as reference (${productImageData.mimeType})`);
      parts.push({
        inlineData: {
          mimeType: productImageData.mimeType,
          data: productImageData.data,
        },
      });
    }
  }

  // Add logo if provided
  if (logoUrl) {
    const logoData = await fetchImageAsBase64(logoUrl);
    if (logoData) {
      console.log('[URL-Generation] Adding logo as reference');
      parts.push({
        inlineData: {
          mimeType: logoData.mimeType,
          data: logoData.data,
        },
      });
    }
  }

  // Build the prompt
  const prompt = buildAdPrompt(idea, brandName, brandColors, width, height, !!idea.productImage, productType, serviceSubType);
  parts.push({ text: prompt });

  console.log(`[URL-Generation] Generating ad for: ${idea.productName}`);
  console.log(`[URL-Generation] Prompt preview: ${prompt.substring(0, 200)}...`);

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: parts,
    }],
    generationConfig: {
      responseModalities: ['image', 'text'],
    } as any,
  });
  const response = result.response;

  // Extract image from response
  let imageData: string | null = null;
  
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if ('inlineData' in part && part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        imageData = `data:${mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }
  }

  if (!imageData) {
    throw new Error('No image generated in response');
  }

  return {
    id: `url-ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ideaId: idea.id,
    imageData,
    productName: idea.productName,
    headline: idea.headline,
    aspectRatio,
  };
}

function buildAdPrompt(
  idea: URLAdIdea,
  brandName: string,
  brandColors: { primary: string; secondary: string; accent: string },
  width: number,
  height: number,
  hasProductImage: boolean,
  productType: 'physical' | 'digital' | 'service' = 'physical',
  serviceSubType?: 'food-restaurant' | 'saas-platform' | 'intangible'
): string {
  // Determine aspect ratio string
  const aspectRatio = width === height ? '1:1' : width > height ? '16:9' : '9:16';
  
  // Terminology based on business type
  const isService = productType === 'service';
  const isDigital = productType === 'digital';
  // Food services should be treated like physical products
  const isFoodService = isService && serviceSubType === 'food-restaurant';
  // SaaS/platforms need feature highlights
  const isSaaSService = isService && serviceSubType === 'saas-platform';
  // Intangible services (consulting, etc.)
  const isIntangibleService = isService && !isFoodService && !isSaaSService;
  // Should we include key features in the ad?
  const needsKeyFeatures = isIntangibleService || isSaaSService;
  
  const itemTerm = isFoodService ? 'menu item' : isSaaSService ? 'platform' : isService ? 'service' : isDigital ? 'digital product' : 'product';
  const itemTermCap = isFoodService ? 'Menu Item' : isSaaSService ? 'Platform' : isService ? 'Service' : isDigital ? 'Digital Product' : 'Product';
  
  // Helper to check if price is valid (not 0, rs.0, free, empty, etc.)
  const isValidPrice = (price: string | null | undefined): boolean => {
    if (!price) return false;
    const normalizedPrice = price.toLowerCase().replace(/[^a-z0-9.]/g, '');
    // Invalid if: empty, "0", "rs0", "rs.0", "free", "0.00", etc.
    if (normalizedPrice === '' || normalizedPrice === '0' || normalizedPrice === 'rs0' || 
        normalizedPrice === 'free' || normalizedPrice === '0.00' || normalizedPrice === '000' ||
        /^rs?\.?0+$/.test(normalizedPrice)) {
      return false;
    }
    return true;
  };
  
  // Price display instruction - PREMIUM STYLING (only if valid price)
  const priceInstruction = isValidPrice(idea.productPrice)
    ? `
=== PRICE DISPLAY: "${idea.productPrice}" ===
CRITICAL: Design the price as a PREMIUM, PROFESSIONAL element:
- DO NOT use ugly starburst or cheap-looking badges
- Options for ELEGANT price styling:
  1. Clean pill/badge with subtle gradient and soft shadow
  2. Minimalist rectangle with accent color background
  3. Elegant serif or modern sans-serif typography standalone
  4. Subtle glass-morphism card effect
  5. Integrated into a ribbon that flows with the design
- Position: Near product but NOT blocking it — bottom corner, floating beside, or in info banner
- Typography: Clean, readable, premium-feeling font
- Color: Use brand accent color (${brandColors.accent}) or complementary tone
- NO cheap clip-art, NO starburst shapes, NO carnival-style pricing`
    : `
⚠️ NO PRICE AVAILABLE - DO NOT DISPLAY ANY PRICE ON THIS AD.
- Do NOT write "Price: null", "Price: [null]", "null", or any placeholder
- Simply skip the price element entirely
- If you need to fill space, use the CTA button or leave breathing room`;

  // Visualization instruction changes based on product type
  let visualizationInstruction: string;
  
  if (isFoodService) {
    // Food/Restaurant services - treat like physical products, show the FOOD
    visualizationInstruction = hasProductImage
      ? `
=== FOOD PRODUCT IMAGE PROVIDED (UPLOADED ABOVE) ===
CRITICAL: The reference image shows "${idea.productName}" - a FOOD ITEM.
- Use this EXACT food item as the HERO of the ad
- Style it with professional food photography techniques
- Add complementary elements: steam, garnishes, utensils, table setting
- Make it look ABSOLUTELY DELICIOUS and irresistible
- ⚠️ DO NOT include people eating or chefs - AI struggles with realistic humans
- Focus 100% on the FOOD - it is the star of this ad`
      : `
=== FOOD VISUALIZATION ===
Create a MOUTH-WATERING visualization of "${idea.productName}":
- Professional food photography style
- Beautifully plated dish as the HERO
- Steam rising, glistening textures, vibrant colors
- Warm, appetizing golden lighting
- Fresh ingredients arranged around the main dish
- Elegant table setting, wooden/marble surface
- ⚠️ NO people, no chefs, no hands - only the FOOD
- Make viewers HUNGRY just looking at it

The FOOD is the product. Make it look IRRESISTIBLE.`;
  } else if (isIntangibleService) {
    // IT, consulting, education services - need selling points, no physical product
    visualizationInstruction = hasProductImage
      ? `
=== SERVICE VISUAL PROVIDED (UPLOADED ABOVE) ===
CRITICAL: The reference image represents "${idea.productName}" service.
- Use this image as INSPIRATION for the ad's visual style
- Create a scene showing the OUTCOME or BENEFIT of this service
- ⚠️ DO NOT include people, faces, hands or human figures - AI struggles with realistic humans
- Focus on: tools, environments, results, objects relevant to THIS specific service`
      : `
=== INTANGIBLE SERVICE VISUALIZATION ===
⚠️ CRITICAL RULE: DO NOT include people, faces, hands, or human figures.
AI-generated humans often look artificial. Create compelling visuals using OBJECTS and ENVIRONMENTS.

Adapt visuals to "${idea.productName}" service type:

🧹 CLEANING/HOME: Sparkling spaces, organized rooms, cleaning products
💼 BUSINESS/CONSULTING: Meeting rooms, charts, professional workspaces, documents (no people)
🏥 HEALTH/WELLNESS: Spa environments, wellness equipment, calming spaces
🎓 EDUCATION: Books, certificates, learning materials, classrooms (no students)
💻 TECH/IT: Servers, code screens, network diagrams, modern office setups
📦 DELIVERY/LOGISTICS: Packages, delivery boxes, maps, warehouses

Show the OUTCOME, TOOLS, and ENVIRONMENT of the service.`;
  } else if (isService) {
    // Generic service fallback
    visualizationInstruction = hasProductImage
      ? `
=== SERVICE VISUAL PROVIDED (UPLOADED ABOVE) ===
CRITICAL: The reference image represents "${idea.productName}" service.
- Use this image as INSPIRATION for the ad's visual style
- Create a scene showing the OUTCOME or BENEFIT of this service
- ⚠️ DO NOT include people, faces, hands or human figures - AI struggles with realistic humans
- Focus on: tools, environments, results, objects relevant to THIS specific service`
      : `
=== SERVICE VISUALIZATION ===
⚠️ CRITICAL RULE: DO NOT include people, faces, hands, or human figures.
AI-generated humans often look artificial. Create compelling visuals using OBJECTS and ENVIRONMENTS.

Adapt visuals to "${idea.productName}" service type:

🍽️ FOOD/RESTAURANT: Beautifully plated dishes, steam rising, fresh ingredients, table settings (no diners/chefs)
🧹 CLEANING/HOME: Sparkling spaces, organized rooms, cleaning products
💼 BUSINESS/CONSULTING: Meeting rooms, charts, professional workspaces, documents (no people)
🏥 HEALTH/WELLNESS: Spa environments, wellness equipment, calming spaces
🎓 EDUCATION: Books, certificates, learning materials, classrooms (no students)
💻 TECH/IT: Servers, code screens, network diagrams, modern office setups
📦 DELIVERY/LOGISTICS: Packages, delivery boxes, maps, warehouses

CHOOSE visuals that match THIS service's industry.
Show the OUTCOME, TOOLS, and ENVIRONMENT of the service.`;
  } else if (isDigital) {
    visualizationInstruction = hasProductImage
      ? `
=== DIGITAL PRODUCT VISUAL PROVIDED (UPLOADED ABOVE) ===
CRITICAL: The reference image shows "${idea.productName}" digital product.
- Use this as reference for the product's branding and style
- Show the digital product on devices (laptop, tablet, phone mockup) - NO hands holding them
- Create a tech-forward, modern aesthetic
- ⚠️ DO NOT include people, faces, or hands - AI struggles with realistic humans
- Focus on the interface, features, and value the product delivers`
      : `
=== DIGITAL PRODUCT VISUALIZATION ===
⚠️ CRITICAL RULE: DO NOT include people, faces, hands, or human figures.
AI-generated humans often look artificial.

Create a stunning visualization for "${idea.productName}" digital product:
- DEVICE MOCKUPS: laptop, phone, tablet screens floating or on desk (NO hands holding them)
- INTERFACE PREVIEW: Key features, dashboards, or content previews
- FLOATING ELEMENTS: Book covers, course modules, software icons in space
- 3D ABSTRACT: Futuristic elements, data visualization, clean tech aesthetics
- ENVIRONMENT: Tech workspace with devices (no people working)
- TRANSFORMATION SYMBOLS: Progress bars, achievement badges, before/after icons
- GLOW EFFECTS: Gradients, light effects, premium tech feel

Show the VALUE and TRANSFORMATION the product delivers through OBJECTS, not people.`;
  } else {
    visualizationInstruction = hasProductImage
      ? `
=== PRODUCT IMAGE PROVIDED (UPLOADED ABOVE) ===
CRITICAL INSTRUCTION: The reference image shows the ACTUAL product "${idea.productName}".
- Incorporate this EXACT product into your ad design
- Preserve the product's packaging, label design, colors, and overall appearance
- Position as the HERO element with professional product photography
- Enhance with complementary props/environment but keep the product AUTHENTIC
- The product should dominate the composition — it's the star`
      : `
=== PRODUCT VISUALIZATION ===
Create a stunning, photorealistic representation of "${idea.productName}".
- Design a premium, aspirational product that looks worth buying
- Use professional product photography techniques
- The product should look like it belongs in a high-end advertisement`;
  }
  
  const businessTypeDesc = isFoodService 
    ? 'FOOD/RESTAURANT (treat menu items like physical products - show the FOOD)' 
    : isIntangibleService
      ? 'INTANGIBLE SERVICE (no physical products - show selling points)'
      : isService 
        ? 'SERVICE COMPANY (focus on outcomes & benefits)' 
        : isDigital 
          ? 'DIGITAL PRODUCT (focus on transformation, convenience, knowledge)' 
          : 'PHYSICAL PRODUCT (focus on the tangible item)';

  return `You are a legendary advertising creative director. Your ads have won Cannes Lions and your campaigns achieve 10x industry engagement. Create a SCROLL-STOPPING advertisement.

=== CREATIVE BRIEF ===

CLIENT: ${brandName}
${itemTermCap.toUpperCase()}: ${idea.productName}
BUSINESS TYPE: ${businessTypeDesc}
AUDIENCE: ${idea.targetAudience}
PLATFORM: ${idea.platform}
CREATIVE ANGLE: ${idea.adAngle}
${priceInstruction}

${visualizationInstruction}

=== MANDATORY COLOR PALETTE ===
You MUST build the entire ad around these brand colors:

PRIMARY (${brandColors.primary}):
→ Use for: main background areas, large shapes, dominant visual weight
→ This color should be IMMEDIATELY noticeable in the ad

SECONDARY (${brandColors.secondary}):
→ Use for: supporting elements, gradients with primary, text backgrounds
→ Creates depth and visual interest

ACCENT (${brandColors.accent}):
→ Use for: CTA button, highlights, key focal points
→ This draws the eye to action items

=== VISUAL DIRECTION ===
${idea.visualConcept}

=== TYPOGRAPHY DIRECTION ===
You have COMPLETE CREATIVE FREEDOM on typography choices. Think like a world-class typographer:

HEADLINE: "${idea.headline}"
• Make it IMPOSSIBLE TO IGNORE
• Choose a font style that matches the brand energy (bold sans-serif for modern, elegant serif for luxury, etc.)
• Consider: drop shadows, gradients, 3D effects, or clean minimal — whatever creates maximum impact
• Position where it commands attention without blocking the product

SUBHEADLINE: "${idea.subheadline}"
• Complement the headline — don't compete with it
• Support the message, add value
• Smaller but still readable at scroll-speed

${needsKeyFeatures && idea.keyFeatures && idea.keyFeatures.length > 0 ? `
=== KEY SELLING POINTS TO DISPLAY ON THE AD ===
${idea.keyFeatures.map((feature) => `• ${feature}`).join('\n')}

⚠️ CRITICAL: You have FULL CREATIVE FREEDOM on how to present these — think like a TOP-TIER GRAPHIC DESIGNER:
- Design them as BEAUTIFUL VISUAL ELEMENTS, NOT a plain text list with checkmarks
- Options for PREMIUM presentation:
  1. STYLED FEATURE CARDS: Glass-morphism panels with subtle blur and border
  2. ELEGANT INFO STRIPS: Horizontal bands with icon + text
  3. GRADIENT TAGS: Modern pill shapes with brand colors
  4. ICON-PAIRED LABELS: Custom icons (not basic checkmarks) with elegant typography
  5. FLOATING ELEMENTS: 3D cards or badges that feel part of the composition
  6. MINIMAL TYPOGRAPHY: Clean sans-serif with subtle color accents

- They should look like a DESIGNED ELEMENT of the ad — NOT a plain text list pasted on top
- Match the overall ad aesthetic and color scheme
- Must be readable but VISUALLY INTEGRATED into the composition
- Use brand colors for accents (${brandColors.secondary} or ${brandColors.accent})
- Position: Lower portion of ad, NOT competing with headline
- Include ALL points exactly as written
` : ''}
=== CTA BUTTON: "${idea.callToAction}" ===
CRITICAL: Design a PREMIUM, MODERN call-to-action button:
- DO NOT use ugly yellow boxes with black borders
- DO NOT use clip-art style buttons
- Options for ELEGANT CTA styling:
  1. Rounded pill button with subtle gradient (using ${brandColors.accent})
  2. Clean rectangle with rounded corners and soft shadow
  3. Glass-morphism style with blur and transparency
  4. Minimalist outlined button with hover effect appearance
  5. Modern flat design with accent color fill
- Typography: Clean, readable, professional font (NOT Comic Sans or similar)
- Padding: Generous internal spacing — button should look tappable
- Shadow: Subtle drop shadow or none — NO harsh black outlines
- Position: Bottom-right, center-bottom, or integrated with price element
- Size: Prominent but proportional to the overall design

=== COMPOSITION PRINCIPLES ===
1. VISUAL HIERARCHY: ${isFoodService ? 'Food/Dish' : isIntangibleService ? 'Typography/Scene/Objects' : isDigital ? 'Device/Interface' : 'Product'} → Headline → Supporting text → CTA (in order of dominance)
2. BREATHING ROOM: Don't crowd elements — premium ads have space
3. FOCAL POINT: One clear hero element (${isFoodService ? 'the FOOD dish — make it irresistible, NO people' : isIntangibleService ? 'typography, abstract graphics, or professional objects — NO people' : isDigital ? 'the device mockup or transformation visual' : 'the product'})
4. COLOR HARMONY: All colors work together, nothing clashes
5. CONTRAST: Text is ALWAYS readable — if dark bg, light text and vice versa

=== PROFESSIONAL STANDARDS ===
- This ad should look like it was created by a $50,000/month agency
- Every pixel should feel intentional and polished
- If you saw this on Instagram, you would STOP scrolling
- The brand colors should be so prominent that someone could identify the brand by color alone
- Typography should look like a professional designed it — not default system fonts

=== CANVAS ===
Dimensions: EXACTLY ${width}x${height} pixels
Aspect Ratio: ${aspectRatio}
${aspectRatio === '1:1' ? '→ PERFECT SQUARE — equal width and height' : aspectRatio === '9:16' ? '→ VERTICAL/PORTRAIT — taller than wide, phone-screen format' : '→ HORIZONTAL/LANDSCAPE — wider than tall'}

=== FINAL CHECKLIST ===
⚠️ TEXT ACCURACY:
- "${idea.headline}" appears EXACTLY ONCE — spelled perfectly
- "${idea.subheadline}" appears EXACTLY ONCE — spelled perfectly
- "${idea.callToAction}" appears EXACTLY ONCE — styled as button

⚠️ COLOR COMPLIANCE:
- Primary color (${brandColors.primary}) is DOMINANT in the design
- Accent color (${brandColors.accent}) is used for the CTA
- The color palette feels cohesive and branded

CREATE: A ${idea.platform} advertisement worthy of a major brand campaign. Make ${brandName}'s ${idea.productName} ${isService ? 'feel essential and irresistible' : isDigital ? 'look transformative and must-have' : 'look absolutely irresistible'}.`;
}
