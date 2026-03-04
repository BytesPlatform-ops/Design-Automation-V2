import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  saveProject,
  saveCampaign, 
  saveGeneratedImage, 
  uploadImageToStorage 
} from '@/lib/supabase-client';

// Temporary user ID - same as other pipelines so it shows in dashboard
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

interface BackgroundGenerationRequest {
  visualizationPrompt: string;
  productImageUrl?: string; // Base64 or URL
  aspectRatio: '1:1' | '4:5' | '9:16' | '16:9';
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  projectName?: string;
  style?: 'photorealistic' | 'illustrated' | 'abstract' | 'minimal';
}

// 4K dimensions for premium quality
function get4KDimensions(aspectRatio: string): { width: number; height: number } {
  switch (aspectRatio) {
    case '1:1': return { width: 2048, height: 2048 };
    case '4:5': return { width: 2048, height: 2560 };
    case '9:16': return { width: 2048, height: 3640 };
    case '16:9': return { width: 3640, height: 2048 };
    default: return { width: 2048, height: 2048 };
  }
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    // If already base64, extract data
    if (url.startsWith('data:')) {
      const matches = url.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        return { mimeType: matches[1], data: matches[2] };
      }
    }
    
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
    console.error('[Background-Gen] Failed to fetch image:', url, error);
    return null;
  }
}

function buildBackgroundPrompt(
  visualizationPrompt: string,
  width: number,
  height: number,
  hasProductImage: boolean,
  brandColors?: { primary: string; secondary: string; accent: string },
  style: string = 'photorealistic'
): string {
  const aspectRatio = width === height ? '1:1' : width > height ? '16:9' : '9:16';
  
  const colorInstructions = brandColors ? `
=== BRAND COLOR PALETTE (USE THESE COLORS) ===
Primary Color: ${brandColors.primary} → Use as dominant color in backgrounds, major elements
Secondary Color: ${brandColors.secondary} → Use for supporting elements, gradients, depth
Accent Color: ${brandColors.accent} → Use for highlights, focal points, visual interest

These colors should be PROMINENTLY VISIBLE in the final image. Build your color story around them.
` : '';

  const productInstruction = hasProductImage ? `
=== PRODUCT IMAGE PROVIDED (UPLOADED ABOVE) ===
CRITICAL INSTRUCTION: A product image has been provided above.
- INCORPORATE this exact product into your background design
- The product should be the HERO ELEMENT — center stage, beautifully lit
- PRESERVE the product's exact appearance, packaging, and details
- Create a stunning environment/scene AROUND the product
- Use professional product photography techniques
- The product should look premium and desirable
` : `
=== NO PRODUCT IMAGE — PURE VISUALIZATION ===
Create the complete scene based on the description below.
Focus on creating a stunning, aspirational visual that could feature any product.
`;

  const styleInstructions: Record<string, string> = {
    photorealistic: `
STYLE: PHOTOREALISTIC
- Ultra-realistic photography quality
- Professional studio or location lighting
- Real textures, materials, and surfaces
- Could be mistaken for an actual photograph
- Shot by a world-class commercial photographer`,
    illustrated: `
STYLE: ILLUSTRATED
- High-end digital illustration
- Clean, polished artwork
- Stylized but professional
- Think Apple or Headspace style illustrations
- Modern, appealing, premium feel`,
    abstract: `
STYLE: ABSTRACT
- Creative, artistic interpretation
- Bold shapes, colors, and compositions
- Modern art direction
- Unexpected visual elements
- Memorable and striking`,
    minimal: `
STYLE: MINIMAL
- Clean, simple, uncluttered
- Lots of negative space
- Focus on essential elements only
- Elegant and sophisticated
- Less is more philosophy`,
  };

  return `You are a legendary advertising art director and photographer. You've created iconic campaigns for Apple, Nike, and Louis Vuitton. Create a STUNNING, PREMIUM advertising background image.

=== CRITICAL INSTRUCTION: ABSOLUTELY NO TEXT ===
⚠️ DO NOT include ANY text, words, letters, numbers, logos, watermarks, or typography of ANY kind.
⚠️ DO NOT include placeholder text areas or text boxes.
⚠️ This image must be 100% VISUAL ONLY — pure imagery, no written elements whatsoever.
⚠️ If you include ANY text, this image is REJECTED.

${productInstruction}

=== VISUALIZATION REQUEST ===
${visualizationPrompt}

${colorInstructions}

${styleInstructions[style] || styleInstructions.photorealistic}

=== TECHNICAL REQUIREMENTS ===
Canvas: EXACTLY ${width}x${height} pixels (4K QUALITY)
Aspect Ratio: ${aspectRatio}
Resolution: Maximum detail, sharp, crisp
Quality: This should look like it cost $50,000 to produce

=== COMPOSITION GUIDELINES ===
1. VISUAL HIERARCHY: Clear focal point that draws the eye
2. BREATHING ROOM: Leave space where text COULD be added later (by designer)
3. BALANCE: Well-composed, following rule of thirds or golden ratio
4. DEPTH: Create visual depth with layers, lighting, or perspective
5. COLOR HARMONY: Colors work together beautifully
6. LIGHTING: Professional, mood-appropriate lighting
7. TEXTURE: Rich, detailed surfaces and materials

=== PREMIUM STANDARDS ===
- This image should look like it's from a high-end advertising campaign
- Every element should feel intentional and polished
- The mood and atmosphere should be immediately captivating
- If someone saw this on Instagram, they would STOP scrolling
- This is a background for PREMIUM brand advertising

=== REMEMBER ===
✅ Create a stunning visual background/scene
✅ Include the product if one was provided
✅ Use brand colors if specified
✅ Leave room for text to be added later
❌ ABSOLUTELY NO TEXT, WORDS, OR LETTERS IN THE IMAGE

CREATE: A magazine-quality, 4K advertising background that makes viewers feel something.`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as BackgroundGenerationRequest;
    const { 
      visualizationPrompt, 
      productImageUrl, 
      aspectRatio = '1:1', 
      brandColors,
      projectName = 'Background Generation',
      style = 'photorealistic'
    } = body;

    if (!visualizationPrompt?.trim()) {
      return NextResponse.json(
        { error: 'Visualization prompt is required' },
        { status: 400 }
      );
    }

    console.log('[Background-Gen] Starting generation...');
    console.log('[Background-Gen] Aspect ratio:', aspectRatio);
    console.log('[Background-Gen] Has product image:', !!productImageUrl);
    console.log('[Background-Gen] Style:', style);

    const { width, height } = get4KDimensions(aspectRatio);
    
    const ai = getGenAI();
    const model = ai.getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
      generationConfig: {
        temperature: 0.8,
      },
    });

    // Build parts array - images first
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    // Add product image if provided
    let hasProductImage = false;
    if (productImageUrl) {
      const imageData = await fetchImageAsBase64(productImageUrl);
      if (imageData) {
        hasProductImage = true;
        console.log('[Background-Gen] Adding product image to request');
        parts.push({
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data,
          },
        });
      }
    }

    // Build and add the prompt
    const prompt = buildBackgroundPrompt(
      visualizationPrompt,
      width,
      height,
      hasProductImage,
      brandColors,
      style
    );
    parts.push({ text: prompt });

    console.log('[Background-Gen] Generating 4K background...');

    // Generate the image
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
      throw new Error('No image generated');
    }

    console.log('[Background-Gen] Image generated successfully');

    // Save to database
    let projectId: string | null = null;
    let campaignId: string | null = null;

    try {
      console.log('[Background-Gen] Saving to database...');
      
      const project = await saveProject(
        TEMP_USER_ID,
        projectName,
        'Design',
        'Background Generation'
      );
      projectId = project.id;

      const campaign = await saveCampaign(
        project.id,
        `${projectName} - ${new Date().toLocaleDateString()}`,
        'Background Image',
        visualizationPrompt.substring(0, 200),
        'Designers'
      );
      campaignId = campaign.id;

      const publicUrl = await uploadImageToStorage(
        campaign.id,
        'background-4k',
        imageData,
        aspectRatio
      );

      await saveGeneratedImage(
        campaign.id,
        'background-4k',
        publicUrl,
        visualizationPrompt.substring(0, 500),
        aspectRatio
      );

      console.log('[Background-Gen] Saved to database');
    } catch (dbError) {
      console.warn('[Background-Gen] Database save failed:', dbError);
    }

    return NextResponse.json({
      success: true,
      imageData,
      width,
      height,
      aspectRatio,
      projectId,
      campaignId,
    });

  } catch (error) {
    console.error('[Background-Gen] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
