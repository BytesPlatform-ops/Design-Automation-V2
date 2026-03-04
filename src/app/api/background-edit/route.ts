import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

interface BackgroundEditRequest {
  imageUrl: string; // Current image (base64)
  editRequest: string; // User's edit request
  aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9';
  style?: 'photorealistic' | 'illustrated' | 'abstract' | 'minimal';
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
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

function buildEditPrompt(
  editRequest: string,
  width: number,
  height: number,
  style: string = 'photorealistic',
  brandColors?: { primary: string; secondary: string; accent: string }
): string {
  const colorInstructions = brandColors ? `

=== BRAND COLORS TO MAINTAIN ===
Primary: ${brandColors.primary}
Secondary: ${brandColors.secondary}
Accent: ${brandColors.accent}

Maintain these colors where appropriate in the edit.
` : '';

  const styleInstructions: Record<string, string> = {
    photorealistic: 'STYLE: Ultra-realistic photography quality',
    illustrated: 'STYLE: High-end digital illustration',
    abstract: 'STYLE: Creative, artistic interpretation',
    minimal: 'STYLE: Clean, simple, uncluttered',
  };

  return `You are a legendary advertising art director. You have been given a marketing background image to EDIT.

=== CRITICAL: ABSOLUTELY NO TEXT ===
⚠️ DO NOT add ANY text, words, letters, numbers, logos, watermarks, or typography.
⚠️ The output must remain 100% VISUAL ONLY.
⚠️ If you add ANY text, this edit is REJECTED.

=== EDIT REQUEST ===
${editRequest}

=== INSTRUCTIONS ===
1. Keep the overall composition and subject of the original image
2. Apply the requested changes while maintaining quality
3. Preserve any product or focal point in the image
4. Output at EXACTLY ${width}x${height} pixels (4K quality)
5. ${styleInstructions[style] || styleInstructions.photorealistic}
${colorInstructions}

=== QUALITY STANDARDS ===
- Premium, high-end advertising quality
- Sharp, crisp, maximum detail
- Professional lighting and composition

APPLY THE EDIT and return the modified image with NO TEXT.`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as BackgroundEditRequest;
    const { 
      imageUrl, 
      editRequest, 
      aspectRatio = '1:1', 
      style = 'photorealistic',
      brandColors 
    } = body;

    if (!imageUrl || !editRequest?.trim()) {
      return NextResponse.json(
        { error: 'Image and edit request are required' },
        { status: 400 }
      );
    }

    console.log('[Background-Edit] Starting edit...');
    console.log('[Background-Edit] Edit request:', editRequest);

    const { width, height } = get4KDimensions(aspectRatio);
    
    const ai = getGenAI();
    const model = ai.getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
      generationConfig: {
        temperature: 0.7,
      },
    });

    // Extract base64 data from the image
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    
    // Add the current image
    if (imageUrl.startsWith('data:')) {
      const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        parts.push({
          inlineData: {
            mimeType: matches[1],
            data: matches[2],
          },
        });
      }
    }

    // Build and add the edit prompt
    const prompt = buildEditPrompt(editRequest, width, height, style, brandColors);
    parts.push({ text: prompt });

    console.log('[Background-Edit] Generating edited image...');

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
      throw new Error('No edited image generated');
    }

    console.log('[Background-Edit] Edit completed successfully');

    return NextResponse.json({
      success: true,
      imageData,
      width,
      height,
      aspectRatio,
    });

  } catch (error) {
    console.error('[Background-Edit] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Edit failed' },
      { status: 500 }
    );
  }
}
