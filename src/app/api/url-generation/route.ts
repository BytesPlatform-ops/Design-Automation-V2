import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { URLAdIdea } from '../url-ideation/route';
import { 
  saveProject,
  saveCampaign, 
  saveGeneratedImage, 
  uploadImageToStorage 
} from '@/lib/supabase-client';

// Temporary user ID - in production, get from auth context
const TEMP_USER_ID = 'url-flow-user-' + (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 8) || 'default');

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
  industry?: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as URLGenerationRequest;
    const { ideas, aspectRatio = '1:1', brandName, brandColors, logoUrl, productType = 'physical', industry = 'General' } = body;

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
          productType
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

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
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
  productType: 'physical' | 'digital' | 'service' = 'physical'
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
  const prompt = buildAdPrompt(idea, brandName, brandColors, width, height, !!idea.productImage, productType);
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
  productType: 'physical' | 'digital' | 'service' = 'physical'
): string {
  // Determine aspect ratio string
  const aspectRatio = width === height ? '1:1' : width > height ? '16:9' : '9:16';
  
  // Terminology based on business type
  const isService = productType === 'service';
  const isDigital = productType === 'digital';
  const itemTerm = isService ? 'service' : isDigital ? 'digital product' : 'product';
  const itemTermCap = isService ? 'Service' : isDigital ? 'Digital Product' : 'Product';
  
  // Price display instruction - PREMIUM STYLING
  const priceInstruction = idea.productPrice 
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
    : '';

  // Visualization instruction changes based on product type
  let visualizationInstruction: string;
  
  if (isService) {
    visualizationInstruction = hasProductImage
      ? `
=== SERVICE VISUAL PROVIDED (UPLOADED ABOVE) ===
CRITICAL: The reference image represents "${idea.productName}" service.
- Use this image as INSPIRATION for the ad's visual style
- Create a scene showing the OUTCOME or BENEFIT of this service
- Focus on transformation, satisfaction, or results
- Show happy people experiencing the service or its aftermath
- Make viewers FEEL the benefit of using this service`
      : `
=== SERVICE VISUALIZATION ===
Create a compelling visual representation of "${idea.productName}" service:
- Show PEOPLE benefiting from or experiencing the service
- Focus on the TRANSFORMATION or OUTCOME — the "after" state
- Use lifestyle imagery that conveys trust, professionalism, satisfaction
- Abstract representations are okay (icons, clean graphics) if they convey the benefit
- The visual should make people WANT this service in their lives`;
  } else if (isDigital) {
    visualizationInstruction = hasProductImage
      ? `
=== DIGITAL PRODUCT VISUAL PROVIDED (UPLOADED ABOVE) ===
CRITICAL: The reference image shows "${idea.productName}" digital product.
- Use this as reference for the product's branding and style
- Show the digital product on devices (laptop, tablet, phone mockup)
- Create a tech-forward, modern aesthetic
- Focus on the TRANSFORMATION the user will experience`
      : `
=== DIGITAL PRODUCT VISUALIZATION ===
Create a stunning visualization for "${idea.productName}" digital product:
- Show the product on DEVICE MOCKUPS (laptop, phone, tablet screens)
- Use clean, modern, tech-forward aesthetics
- Include UI previews, dashboards, or content glimpses if relevant
- For courses/ebooks: show floating modules, book covers, or knowledge graphics
- For software: show sleek interface, productivity gains, or workflow improvements
- Add subtle tech elements: gradients, glows, floating 3D elements
- Focus on the TRANSFORMATION and VALUE the user gains`;
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
  
  const businessTypeDesc = isService 
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
1. VISUAL HIERARCHY: ${isService ? 'People/Scene' : isDigital ? 'Device/Interface' : 'Product'} → Headline → Supporting text → CTA (in order of dominance)
2. BREATHING ROOM: Don't crowd elements — premium ads have space
3. FOCAL POINT: One clear hero element (${isService ? 'the person or scene showing the benefit' : isDigital ? 'the device mockup or transformation visual' : 'the product'})
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
