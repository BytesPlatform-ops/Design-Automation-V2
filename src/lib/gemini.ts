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
 * Build brand assets instructions for the prompt
 */
function buildBrandAssetsInstructions(brandAssets: BrandAssets | undefined, productType: ProductType): string {
  if (!brandAssets) {
    return `
VISUAL STYLE:
- Create a professional, premium-looking advertisement
- Generate appropriate ${productType === 'physical' ? 'product imagery' : productType === 'service' ? 'service representation' : 'digital product mockup'}
- Use modern design aesthetics
`;
  }

  const instructions: string[] = [];
  
  // Logo instructions
  if (brandAssets.logoUrl) {
    instructions.push(`
LOGO INTEGRATION:
- Place the provided brand logo prominently in the design
- Position logo in the top-left or top-center area
- Ensure logo is clearly visible and not obscured
- Maintain logo proportions and quality`);
  }

  // Product image instructions
  if (brandAssets.productImageUrl) {
    const productInstructions = {
      physical: `
PRODUCT IMAGE:
- The uploaded product photo should be the HERO of this ad
- Feature the actual product prominently in the center/focus
- Use professional lighting and shadows around the product
- Make the product look premium and desirable`,
      service: `
SERVICE IMAGE:
- Incorporate the uploaded service image naturally into the design
- Use it to convey the quality and professionalism of the service
- Add appropriate visual effects to enhance appeal`,
      digital: `
SCREENSHOT/UI:
- Display the uploaded screenshot/UI on a modern device mockup
- Show it on a laptop, phone, or tablet as appropriate
- Add realistic reflections and shadows
- Make it look professional and high-tech`
    };
    instructions.push(productInstructions[productType]);
  }

  // Color instructions
  if (brandAssets.primaryColor || brandAssets.secondaryColor) {
    instructions.push(`
BRAND COLORS:
- Primary brand color: ${brandAssets.primaryColor || '#3B82F6'}
- Secondary brand color: ${brandAssets.secondaryColor || '#1E40AF'}
- Use these colors for backgrounds, accents, and text highlights
- Ensure color harmony throughout the design`);
  }

  if (instructions.length === 0) {
    return `
VISUAL STYLE:
- Create a professional, premium-looking advertisement
- Use modern design aesthetics`;
  }

  return instructions.join('\n');
}

/**
 * Generate a single marketing image using Gemini 3 Pro Image
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
  
  // Build brand assets instructions
  const brandAssetsInstructions = buildBrandAssetsInstructions(brandAssets, productType);
  
  // Enhance the prompt with additional quality and text rendering instructions
  const enhancedPrompt = `
Create a professional marketing advertisement image with the following specifications:

${prompt.prompt}

${brandAssetsInstructions}

CRITICAL TEXT REQUIREMENTS:
- Brand Name "${brandName}" must be prominently displayed and perfectly spelled
${slogan ? `- Slogan "${slogan}" must be clearly visible and correctly spelled` : ''}
${pricing ? `- Price "${pricing}" must be shown clearly with emphasis` : ''}
- All text must be crisp, legible, and professionally integrated into the design
- Text should have appropriate contrast against the background
- Use modern, professional typography

TECHNICAL REQUIREMENTS:
- Resolution: ${width}x${height} pixels (aspect ratio: ${aspectRatio})
- Style: Professional marketing/advertising photography
- Lighting: Studio-quality, appropriate for ${productType} marketing
- Composition: Balanced, following rule of thirds
- Color palette: ${brandAssets?.primaryColor ? `Use brand colors ${brandAssets.primaryColor} and ${brandAssets.secondaryColor}` : 'Vibrant yet professional'}

OUTPUT: A single, stunning, publish-ready marketing advertisement.
`.trim();

  const model = getGenAI().getGenerativeModel({ 
    model: 'gemini-3-pro-image-preview',
    generationConfig: {
      temperature: 0.7,
    }
  });

  const result = await model.generateContent({
    contents: [{ 
      role: 'user', 
      parts: [{ text: enhancedPrompt }] 
    }],
    generationConfig: {
      responseModalities: ['image', 'text'],
    } as any,
  });

  const response = result.response;
  
  // Extract image data from response
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error('No image generated');
  }

  const imagePart = parts.find((part: any) => part.inlineData?.mimeType?.startsWith('image/'));
  if (!imagePart || !('inlineData' in imagePart)) {
    throw new Error('No image data in response');
  }

  return {
    imageData: (imagePart as any).inlineData.data,
    prompt: enhancedPrompt
  };
}

// Import createServerSupabaseClient lazily to avoid build-time initialization
async function getSupabaseClient() {
  const { createServerSupabaseClient } = await import('./supabase');
  return createServerSupabaseClient();
}

/**
 * Upload image to Supabase Storage
 */
async function uploadToStorage(
  imageData: string,
  projectId: string,
  imageId: string
): Promise<{ url: string; path: string }> {
  const supabase = await getSupabaseClient();
  
  // Convert base64 to buffer
  const buffer = Buffer.from(imageData, 'base64');
  
  const storagePath = `${projectId}/${imageId}.png`;
  
  const { error: uploadError } = await supabase.storage
    .from('generated-images')
    .upload(storagePath, buffer, {
      contentType: 'image/png',
      upsert: true
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('generated-images')
    .getPublicUrl(storagePath);

  return {
    url: urlData.publicUrl,
    path: storagePath
  };
}

/**
 * Generate multiple ads in parallel
 */
export async function generateAds(
  prompts: DynamicPrompt[],
  brandName: string,
  slogan: string | undefined,
  pricing: string | undefined,
  productType: ProductType,
  projectId: string
): Promise<GeneratedAd[]> {
  // Generate all images in parallel
  const generationPromises = prompts.map(async (prompt) => {
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    try {
      // Generate image
      const { imageData, prompt: usedPrompt } = await generateSingleImage(
        prompt,
        brandName,
        slogan,
        pricing,
        productType
      );

      // Upload to storage
      const { url, path } = await uploadToStorage(imageData, projectId, imageId);

      // Save to database
      const supabase = await getSupabaseClient();
      
      // First create/get campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          project_id: projectId,
          idea_title: prompt.ideaTitle,
          idea_description: prompt.prompt,
          dynamic_prompt: usedPrompt,
          status: 'completed'
        })
        .select()
        .single();

      if (campaignError) {
        console.error('Campaign creation error:', campaignError);
      }

      // Save image record
      if (campaign) {
        await supabase
          .from('generated_images')
          .insert({
            campaign_id: campaign.id,
            image_url: url,
            storage_path: path,
            resolution: '2048x2048'
          });
      }

      return {
        id: imageId,
        ideaId: prompt.ideaId,
        ideaTitle: prompt.ideaTitle,
        imageUrl: url,
        prompt: usedPrompt
      };
    } catch (error) {
      console.error(`Error generating image for ${prompt.ideaTitle}:`, error);
      throw error;
    }
  });

  const results = await Promise.all(generationPromises);
  return results;
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

  // Generate all images in parallel
  const generationPromises = prompts.map(async (prompt) => {
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    try {
      // Generate image
      const { imageData, prompt: usedPrompt } = await generateSingleImage(
        prompt,
        brandName,
        slogan,
        pricing,
        productType,
        aspectRatio,
        brandAssets
      );

      // Return as base64 data URL (no storage needed)
      const imageUrl = `data:image/png;base64,${imageData}`;

      return {
        id: imageId,
        ideaId: prompt.ideaId,
        ideaTitle: prompt.ideaTitle,
        imageUrl,
        prompt: usedPrompt
      };
    } catch (error) {
      console.error(`Error generating image for ${prompt.ideaTitle}:`, error);
      throw error;
    }
  });

  const results = await Promise.all(generationPromises);
  return results;
}

/**
 * Generate mock ads for testing without API keys
 */
function generateMockAds(prompts: DynamicPrompt[], aspectRatio: AspectRatio = '1:1', brandAssets?: BrandAssets): GeneratedAd[] {
  const { width, height } = getImageDimensions(aspectRatio);
  
  // Use brand colors if available, otherwise use defaults
  const primaryColor = brandAssets?.primaryColor?.replace('#', '') || '6366f1';
  const secondaryColor = brandAssets?.secondaryColor?.replace('#', '') || '8b5cf6';
  const mockColors = [primaryColor, secondaryColor, 'ec4899', 'f43f5e', '14b8a6', 'f59e0b'];
  
  return prompts.map((prompt, index) => {
    const color = mockColors[index % mockColors.length];
    const imageId = `mock_${Date.now()}_${index}`;
    
    // Use placeholder image service with correct dimensions
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
