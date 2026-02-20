import { GoogleGenerativeAI } from '@google/generative-ai';
import { DynamicPrompt, GeneratedAd, ProductType, AspectRatio, BrandAssets } from '@/types';

// Lazy initialization to avoid build-time errors
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

/**
 * Get image dimensions based on aspect ratio
 */
function getImageDimensions(aspectRatio: AspectRatio): { width: number; height: number } {
  switch (aspectRatio) {
    case '1:1':
      return { width: 1024, height: 1024 };
    case '4:5':
      return { width: 1024, height: 1280 };
    case '9:16':
      return { width: 1024, height: 1820 };
    case '16:9':
      return { width: 1820, height: 1024 };
    default:
      return { width: 1024, height: 1024 };
  }
}

/**
 * Extract base64 data from a data URL
 * Returns the raw base64 string WITHOUT the data:image/xxx;base64, prefix
 */
function extractBase64FromDataUrl(dataUrl: string): { data: string; mimeType: string } | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    console.log('[DEBUG] Invalid dataUrl - does not start with data:');
    return null;
  }
  
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    console.log('[DEBUG] Failed to parse dataUrl with regex');
    return null;
  }
  
  return {
    mimeType: matches[1],
    data: matches[2]
  };
}

/**
 * Generate a single marketing image using Gemini
 * Uses Nano Banana Pro (gemini-3-pro-image-preview) - Google's best model for:
 * - Accurate text rendering
 * - High-fidelity visuals (up to 4K)
 * - Complex multi-turn editing
 * - Following intricate instructions
 */
async function generateSingleImage(
  prompt: DynamicPrompt,
  brandName: string,
  slogan: string | undefined,
  pricing: string | undefined,
  productType: ProductType,
  aspectRatio: AspectRatio = '1:1',
  brandAssets?: BrandAssets
): Promise<{ imageData: string; prompt: string }> {
  const { width, height } = getImageDimensions(aspectRatio);
  
  // Check for uploaded images
  const hasProductImage = brandAssets?.productImageUrl;
  const hasLogo = brandAssets?.logoUrl;
  
  console.log('\n========== GEMINI GENERATION ==========');
  console.log('Brand:', brandName);
  console.log('Has Product Image:', !!hasProductImage);
  console.log('Has Logo:', !!hasLogo);
  console.log('Aspect Ratio:', aspectRatio);
  
  // Build parts array - IMAGES FIRST, then text prompt (order matters!)
  const parts: any[] = [];
  
  // Add product image if provided (FIRST image)
  if (hasProductImage) {
    const productImageData = extractBase64FromDataUrl(brandAssets!.productImageUrl!);
    if (productImageData) {
      console.log('[DEBUG] Adding product image - mimeType:', productImageData.mimeType, 'length:', productImageData.data.length);
      parts.push({
        inlineData: {
          mimeType: productImageData.mimeType,
          data: productImageData.data
        }
      });
    } else {
      console.log('[ERROR] Failed to extract product image data');
    }
  }
  
  // Add logo if provided (SECOND image)
  if (hasLogo) {
    const logoData = extractBase64FromDataUrl(brandAssets!.logoUrl!);
    if (logoData) {
      console.log('[DEBUG] Adding logo - mimeType:', logoData.mimeType, 'length:', logoData.data.length);
      parts.push({
        inlineData: {
          mimeType: logoData.mimeType,
          data: logoData.data
        }
      });
    } else {
      console.log('[ERROR] Failed to extract logo data');
    }
  }
  
  // Build the prompt - SIMPLE FORMAT that works (like user's manual test)
  // Include marketing idea as CONTEXT only, not as main instruction
  let textPrompt: string;
  
  // Extract a short style hint from marketing idea (max 150 chars)
  const styleContext = prompt.prompt ? prompt.prompt.substring(0, 150).trim() : '';
  
  // VARIETY: Random CTA button styles for each generation
  const ctaStyles = [
    'Neon glow effect, electric blue to purple gradient, rounded pill shape, glowing edges',
    'Metallic gold 3D button, embossed text, luxury feel, subtle shine',
    'Bold red with white text, sharp corners, modern flat design, drop shadow',
    'Gradient sunset (orange to pink), soft rounded corners, glossy glass effect',
    'Deep emerald green, gold text, elegant serif font, premium look',
    'Electric orange, pulsing glow effect, futuristic style, hover-like 3D lift',
    'Royal purple to magenta gradient, chrome text, sleek modern design',
    'Crisp white button with bold black text, minimalist, Apple-style clean',
  ];
  
  // VARIETY: Random price badge styles for each generation
  const priceStyles = [
    'Explosive starburst shape, bright yellow with red outline, comic-book style pop',
    'Elegant ribbon banner, gold with black text, premium feel',
    'Modern circular badge, gradient red to orange, white bold text',
    'Neon price tag, glowing edges, cyberpunk style, electric colors',
    'Classic sale tag shape, vibrant red, white text, 3D shadow',
    'Hexagonal badge, metallic silver, premium typography',
    'Splash/splatter shape, energetic yellow, bold contrasting text',
    'Clean pill-shaped badge, gradient teal to blue, modern minimal',
  ];
  
  // Pick random styles for this generation
  const randomCtaStyle = ctaStyles[Math.floor(Math.random() * ctaStyles.length)];
  const randomPriceStyle = priceStyles[Math.floor(Math.random() * priceStyles.length)];
  
  if (hasProductImage && hasLogo) {
    // BOTH product and logo provided
    textPrompt = `You are an award-winning advertising creative director who has worked with Nike, Apple, and Coca-Cola. Create a stunning, magazine-quality product advertisement.

PRODUCT (FIRST uploaded image):
- This is the HERO product - preserve its exact appearance, colors, text, and design
- Enhance with premium studio lighting and realistic shadows
- Place prominently as the focal point

LOGO (SECOND uploaded image):
- Place in top-left corner ONLY - preserve exactly as uploaded
- Do NOT duplicate or modify the logo

BACKGROUND & SCENE:
- Create a luxurious, contextual environment (like Nestle, Lay's, Coca-Cola commercials)
- Dramatic rim lighting with golden hour warmth
- Shallow depth of field with beautiful bokeh
- Rich, cinematic color grading
- The viewer should feel desire/appetite/excitement

Theme: ${prompt.ideaTitle}
${styleContext ? `Style context: ${styleContext}...` : ''}

MARKETING TEXT (luxury magazine headline styling):
${slogan ? `• HEADLINE: "${slogan}" 
  - Premium editorial typography, large and bold
  - Metallic gold/silver gradient effect with drop shadow
  - Position prominently on empty space` : ''}
${pricing ? `• PRICE BADGE: "${pricing}"
  - Style: ${randomPriceStyle}
  - Position: bottom-right area` : ''}
• CTA BUTTON: "Buy Now"
  - Style: ${randomCtaStyle}
  - ONE button only, bottom-center area

DO NOT: Add extra text, duplicate logos, create cluttered layouts, use plain backgrounds.

QUALITY: 2K resolution, HDR lighting, ray-traced reflections, professional color science, magazine-ready.`;

  } else if (hasProductImage) {
    // Only product image provided
    textPrompt = `You are an award-winning advertising creative director who has worked with Nike, Apple, and Coca-Cola. Create a stunning, magazine-quality product advertisement.

PRODUCT (uploaded image):
- This is the HERO product - preserve its exact appearance, colors, text, and design
- Enhance with premium studio lighting and realistic shadows
- Place prominently as the focal point

BACKGROUND & SCENE:
- Create a luxurious, contextual environment (like Nestle, Lay's, Coca-Cola commercials)
- Dramatic rim lighting with golden hour warmth
- Shallow depth of field with beautiful bokeh
- Rich, cinematic color grading
- The viewer should feel desire/appetite/excitement

Theme: ${prompt.ideaTitle}
${styleContext ? `Style context: ${styleContext}...` : ''}

MARKETING TEXT (luxury magazine headline styling):
${slogan ? `• HEADLINE: "${slogan}" 
  - Premium editorial typography, large and bold
  - Metallic gold/silver gradient effect with drop shadow
  - Position prominently on empty space` : ''}
${pricing ? `• PRICE BADGE: "${pricing}"
  - Style: ${randomPriceStyle}
  - Position: bottom-right area` : ''}
• CTA BUTTON: "Buy Now"
  - Style: ${randomCtaStyle}
  - ONE button only, bottom-center area

DO NOT: Add extra text, duplicate logos, create cluttered layouts, use plain backgrounds.

QUALITY: 2K resolution, HDR lighting, ray-traced reflections, professional color science, magazine-ready.`;

  } else if (hasLogo) {
    // Only logo provided
    textPrompt = `You are an award-winning advertising creative director. Create a stunning, magazine-quality advertisement for ${brandName}.

LOGO (uploaded image):
- Place in top-left corner ONLY - preserve exactly as uploaded
- Do NOT duplicate or modify

BACKGROUND & SCENE:
- Create a luxurious, premium environment (like Fortune 500 brand commercials)
- Dramatic rim lighting, golden hour warmth
- Shallow depth of field, cinematic color grading
- Aspirational, premium mood

BRAND CONTEXT:
- Brand: ${brandName}
- Theme: ${prompt.ideaTitle}
${styleContext ? `- Creative direction: ${styleContext}` : ''}

BACKGROUND & SCENE:
- Create a premium brand environment (think Nike, Apple quality)
- Dramatic studio lighting with rim lights
- Cinematic color grading, shallow depth of field
- The viewer should feel brand prestige and trust

TYPOGRAPHY (magazine editorial quality):
• BRAND NAME: "${brandName}"
  - Premium serif/sans-serif, large and commanding
  - Metallic gold or silver gradient with drop shadow
${slogan ? `• HEADLINE: "${slogan}" 
  - Elegant editorial typography
  - Subtle emboss or glow effect` : ''}
${pricing ? `• PRICE BADGE: "${pricing}"
  - Style: ${randomPriceStyle}
  - Position: bottom-right area` : ''}
• CTA BUTTON: "Shop Now"
  - Style: ${randomCtaStyle}
  - ONE button only, bottom center area

CRITICAL RULES:
- Logo appears EXACTLY ONCE
- Each text element appears EXACTLY ONCE
- Clean, uncluttered layout

DO NOT: Duplicate any text, add extra logos, create busy layouts.

QUALITY: 2K resolution, HDR lighting, professional color science.`;

  } else {
    // No images provided - pure text-to-image
    textPrompt = `You are an award-winning advertising creative director who has worked with Nike, Apple, and Coca-Cola. Create a stunning brand advertisement from scratch.

BRAND: ${brandName}
THEME: ${prompt.ideaTitle}
${styleContext ? `CREATIVE DIRECTION: ${styleContext}` : ''}

CREATE:
- A premium, aspirational scene that represents the brand
- Think: high-end magazine ad or billboard quality
- Dramatic lighting, cinematic composition
- The viewer should feel drawn to the brand

TYPOGRAPHY (premium editorial styling):
• BRAND NAME: "${brandName}"
  - Large, bold, commanding presence
  - Metallic gradient or embossed effect
${slogan ? `• HEADLINE: "${slogan}" 
  - Elegant, eye-catching typography
  - Subtle glow or shadow effect` : ''}
${pricing ? `• PRICE BADGE: "${pricing}"
  - Style: ${randomPriceStyle}
  - Position: bottom-right area` : ''}
• CTA BUTTON: "Shop Now"
  - Style: ${randomCtaStyle}
  - ONE button only, bottom center area

CRITICAL: Each text element appears EXACTLY ONCE. No duplicates.

DO NOT: Duplicate text, create cluttered designs, use plain backgrounds.

QUALITY: 2K resolution, HDR lighting, professional color grading, magazine-ready.`;
  }
  
  // Add text prompt to parts
  parts.push({ text: textPrompt });
  
  console.log('[DEBUG] Total parts:', parts.length);
  console.log('[DEBUG] Prompt preview:', textPrompt.substring(0, 150) + '...');
  console.log('========================================\n');

  // Use Nano Banana Pro - Google's highest quality image generation model
  const model = getGenAI().getGenerativeModel({ 
    model: 'gemini-3-pro-image-preview',
    generationConfig: {
      temperature: 0.7,
    }
  });

  const result = await model.generateContent({
    contents: [{ 
      role: 'user', 
      parts: parts
    }],
    generationConfig: {
      responseModalities: ['image', 'text'],
    } as any,
  });

  const response = result.response;
  const responseParts = response.candidates?.[0]?.content?.parts;
  
  if (!responseParts) {
    throw new Error('No image generated - empty response from Gemini');
  }

  const imagePart = responseParts.find((part: any) => part.inlineData?.mimeType?.startsWith('image/'));
  if (!imagePart || !('inlineData' in imagePart)) {
    // Log what we got for debugging
    console.log('[ERROR] No image in response. Parts received:', responseParts.map((p: any) => Object.keys(p)));
    throw new Error('No image data in response');
  }

  console.log('[SUCCESS] Image generated successfully!');
  
  return {
    imageData: (imagePart as any).inlineData.data,
    prompt: textPrompt
  };
}

/**
 * Generate multiple ads WITHOUT Supabase storage
 * Returns base64 data URLs directly
 */
export async function generateAdsWithoutStorage(
  prompts: DynamicPrompt[],
  brandName: string,
  slogan: string | undefined,
  pricing: string | undefined,
  productType: ProductType,
  aspectRatio: AspectRatio = '1:1',
  brandAssets?: BrandAssets
): Promise<GeneratedAd[]> {
  // Check if we should use mock mode (no API key)
  if (!process.env.GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY not set - using mock mode');
    return generateMockAds(prompts, aspectRatio, brandAssets);
  }

  console.log(`\n🎨 Generating ${prompts.length} ads with Gemini 3 Pro Image...\n`);

  // Generate images sequentially to avoid rate limits
  const results: GeneratedAd[] = [];
  
  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    console.log(`\n📸 Generating ad ${i + 1}/${prompts.length}: "${prompt.ideaTitle}"`);
    
    try {
      const { imageData, prompt: usedPrompt } = await generateSingleImage(
        prompt,
        brandName,
        slogan,
        pricing,
        productType,
        aspectRatio,
        brandAssets
      );

      // Return as base64 data URL
      const imageUrl = `data:image/png;base64,${imageData}`;

      results.push({
        id: imageId,
        ideaId: prompt.ideaId,
        ideaTitle: prompt.ideaTitle,
        imageUrl,
        prompt: usedPrompt
      });
      
      console.log(`✅ Ad ${i + 1} generated successfully!`);
      
      // Small delay between generations to avoid rate limits
      if (i < prompts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`❌ Error generating ad ${i + 1}:`, error);
      throw error;
    }
  }

  console.log(`\n🎉 All ${results.length} ads generated successfully!\n`);
  return results;
}

/**
 * Generate mock ads for testing without API keys
 */
function generateMockAds(prompts: DynamicPrompt[], aspectRatio: AspectRatio = '1:1', brandAssets?: BrandAssets): GeneratedAd[] {
  const { width, height } = getImageDimensions(aspectRatio);
  
  // Use brand colors if available
  const primaryColor = brandAssets?.primaryColor?.replace('#', '') || '6366f1';
  const secondaryColor = brandAssets?.secondaryColor?.replace('#', '') || '8b5cf6';
  const mockColors = [primaryColor, secondaryColor, 'ec4899', 'f43f5e', '14b8a6', 'f59e0b'];
  
  return prompts.map((prompt, index) => {
    const color = mockColors[index % mockColors.length];
    const imageId = `mock_${Date.now()}_${index}`;
    
    const imageUrl = `https://placehold.co/${width}x${height}/${color}/white?text=${encodeURIComponent(prompt.ideaTitle.slice(0, 20))}`;
    
    return {
      id: imageId,
      ideaId: prompt.ideaId,
      ideaTitle: prompt.ideaTitle,
      imageUrl,
      prompt: prompt.prompt
    };
  });
}

export { getGenAI };
