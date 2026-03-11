import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { URLAdIdea } from '../url-ideation/route';
import { 
  saveProject,
  saveCampaign, 
  saveGeneratedImage, 
  uploadImageToStorage 
} from '@/lib/supabase-client';
import { 
  validateGeneratedAd, 
  shouldValidateAd,
  type QualityCheckResult 
} from '@/lib/quality-validator';

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
  // Quality validation results (optional)
  qualityScore?: number;
  qualityPassed?: boolean;
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

    // Generate ads in parallel batches (2-3 concurrent for API rate limits)
    const BATCH_SIZE = 3;
    const generatedAds: GeneratedURLAd[] = [];
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < ideas.length; i += BATCH_SIZE) {
      const batch = ideas.slice(i, i + BATCH_SIZE);
      const batchStartIndex = i;
      console.log(`[URL-Generation] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(ideas.length / BATCH_SIZE)} (${batch.length} ads)`);
      
      const batchResults = await Promise.allSettled(
        batch.map(idea =>
          generateAdFromIdea(
            idea,
            aspectRatio,
            brandName,
            brandColors,
            logoUrl,
            productType,
            serviceSubType
          )
        )
      );
      
      // Process results with quality validation
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const idea = batch[j];
        const adIndex = batchStartIndex + j;
        
        if (result.status === 'fulfilled') {
          const ad = result.value;
          
          // Quality validation for selected ads
          if (shouldValidateAd(adIndex, ideas.length, 50)) {
            try {
              console.log(`[URL-Generation] Validating ad ${adIndex + 1}/${ideas.length}...`);
              const qualityResult = await validateGeneratedAd({
                imageBase64: ad.imageData,
                expectedHeadline: idea.headline,
                expectedSubheadline: idea.subheadline,
                expectedCta: idea.callToAction,
                brandColors,
                productName: idea.productName,
              });
              
              // Add quality info to the ad
              ad.qualityScore = qualityResult.score;
              ad.qualityPassed = qualityResult.passed;
              
              if (!qualityResult.passed) {
                console.warn(`[URL-Generation] Ad ${adIndex + 1} failed quality check (score: ${qualityResult.score}):`, qualityResult.issues);
              } else {
                console.log(`[URL-Generation] Ad ${adIndex + 1} passed quality check (score: ${qualityResult.score})`);
              }
            } catch (validationError) {
              console.warn(`[URL-Generation] Quality validation failed (non-blocking):`, validationError);
            }
          }
          
          generatedAds.push(ad);
        } else {
          console.error(`[URL-Generation] Failed to generate ad for ${idea.productName}:`, result.reason);
          errors.push(`Failed: ${idea.productName} - ${result.reason instanceof Error ? result.reason.message : 'Unknown error'}`);
        }
      }
      
      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < ideas.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
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
  const aspectRatio = width === height ? '1:1' : width > height ? '16:9' : '9:16';
  
  // Business type detection
  const isFoodService = productType === 'service' && serviceSubType === 'food-restaurant';
  const isSaaSService = productType === 'service' && serviceSubType === 'saas-platform';
  const isIntangibleService = productType === 'service' && !isFoodService && !isSaaSService;
  const isDigital = productType === 'digital';
  const needsKeyFeatures = isIntangibleService || isSaaSService;
  
  // Price validation
  const hasValidPrice = idea.productPrice && 
    !/^(0|free|rs\.?0|null)$/i.test(idea.productPrice.replace(/[^a-z0-9.]/gi, ''));
  
  // Visual focus based on product type
  const visualFocus = isFoodService 
    ? 'FOOD HERO: Mouth-watering dish, professional food photography, steam, vibrant colors. NO people.'
    : isIntangibleService
      ? 'SERVICE OUTCOME: Show tools, environments, results relevant to the service. NO people/faces.'
      : isDigital
        ? 'DIGITAL SHOWCASE: Device mockups, interface previews, floating UI elements. NO hands.'
        : hasProductImage
          ? 'PRODUCT HERO: Feature the exact product from reference image as the star.'
          : 'PRODUCT VISUALIZATION: Premium, photorealistic product rendering.';

  // Key features section (only for services)
  const featuresSection = needsKeyFeatures && idea.keyFeatures?.length 
    ? `\nKEY FEATURES (display as elegant glass-morphism cards or gradient pills):\n${idea.keyFeatures.map(f => `• ${f}`).join('\n')}`
    : '';

  // Price styling instruction
  const priceInstruction = hasValidPrice 
    ? `PRICE: "${idea.productPrice}" — Display as elegant pill badge with soft shadow, positioned near product but not blocking it.`
    : 'NO PRICE — Do not display any price, "null", or placeholder text.';

  // Enhanced compressed prompt (~1000-1200 tokens with high-impact additions)
  return `Create a premium ${idea.platform} advertisement for ${brandName}.

CANVAS: ${width}x${height}px (${aspectRatio})

=== CREATIVE BRIEF ===
PRODUCT: ${idea.productName}
HEADLINE: "${idea.headline}"
SUBHEADLINE: "${idea.subheadline}"
CTA BUTTON: "${idea.callToAction}"
${priceInstruction}
AUDIENCE: ${idea.targetAudience}
ANGLE: ${idea.adAngle}
${featuresSection}

=== BRAND COLORS (CRITICAL - MUST USE) ===
PRIMARY: ${brandColors.primary} → Background, dominant visual areas (60% of design)
SECONDARY: ${brandColors.secondary} → Supporting shapes, gradients, text backgrounds (30%)
ACCENT: ${brandColors.accent} → CTA button, price badge, key highlights (10%)

The ad should be IMMEDIATELY recognizable as ${brandName} by color alone.

=== VISUAL DIRECTION ===
${visualFocus}

CONCEPT: ${idea.visualConcept}

=== TYPOGRAPHY RULES ===
HEADLINE "${idea.headline}":
• LARGE, bold, impossible to miss
• Use drop shadow or outline if needed for contrast
• Position: Upper third of image, never obscured

SUBHEADLINE "${idea.subheadline}":
• Smaller, complements headline
• Same font family, lighter weight
• Below or near headline

CTA "${idea.callToAction}":
• Rounded pill or rectangle button
• ${brandColors.accent} background with white/contrasting text
• Subtle shadow, generous padding
• Position: Bottom portion, easy to tap

=== COMPOSITION ===
1. HERO ELEMENT: ${isFoodService ? 'The FOOD dish' : isIntangibleService ? 'Abstract graphics or relevant objects' : isDigital ? 'Device mockup' : 'The product'} commands 40-50% of visual space
2. CLEAR HIERARCHY: Eye flows from hero → headline → subheadline → CTA
3. BREATHING ROOM: Premium ads are NOT crowded — leave margins
4. CONTRAST: Text MUST be readable — dark text on light areas, light text on dark areas
5. SINGLE FOCUS: One hero, one headline, one CTA — no visual clutter

=== STRICT RULES ===
❌ NO people, faces, hands, or human figures (AI struggles with these)
❌ NO ugly starburst price badges or clip-art style elements
❌ NO spelling errors — "${idea.headline}" must be EXACT
❌ NO placeholder text like "Lorem ipsum" or "[text here]"
✅ DO use the EXACT brand colors provided
✅ DO make text readable at mobile scroll speed
✅ DO create professional, agency-quality output

Create an advertisement that would make someone STOP scrolling. This should look like it cost $10,000 to produce.`;
}
