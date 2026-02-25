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
 * Get a smart CTA text based on industry and product type
 * Instead of always "Buy Now", tailor it to the business context
 */
function getSmartCTA(productType: ProductType, industry: string): string {
  const industryLower = industry.toLowerCase();
  
  // Service-based industries
  if (productType === 'service') {
    if (industryLower.includes('restaurant') || industryLower.includes('food')) return 'Order Now';
    if (industryLower.includes('fitness') || industryLower.includes('gym')) return 'Start Training';
    if (industryLower.includes('salon') || industryLower.includes('beauty') || industryLower.includes('spa')) return 'Book Now';
    if (industryLower.includes('education') || industryLower.includes('course') || industryLower.includes('training')) return 'Enroll Now';
    if (industryLower.includes('consult') || industryLower.includes('agency')) return 'Get Started';
    if (industryLower.includes('health') || industryLower.includes('medical') || industryLower.includes('dental')) return 'Book Appointment';
    if (industryLower.includes('real estate') || industryLower.includes('property')) return 'Schedule a Visit';
    if (industryLower.includes('travel') || industryLower.includes('hotel')) return 'Book Now';
    if (industryLower.includes('legal') || industryLower.includes('law')) return 'Free Consultation';
    return 'Get Started';
  }
  
  // Digital products
  if (productType === 'digital') {
    if (industryLower.includes('saas') || industryLower.includes('software')) return 'Try Free';
    if (industryLower.includes('app')) return 'Download Now';
    if (industryLower.includes('game') || industryLower.includes('gaming')) return 'Play Now';
    if (industryLower.includes('course') || industryLower.includes('education')) return 'Start Learning';
    return 'Get Started';
  }
  
  // Physical products
  if (industryLower.includes('food') || industryLower.includes('restaurant') || industryLower.includes('beverage')) return 'Order Now';
  if (industryLower.includes('fashion') || industryLower.includes('clothing') || industryLower.includes('apparel')) return 'Shop Now';
  if (industryLower.includes('electronics') || industryLower.includes('tech') || industryLower.includes('gadget')) return 'Buy Now';
  if (industryLower.includes('automotive') || industryLower.includes('car')) return 'Book Test Drive';
  if (industryLower.includes('furniture') || industryLower.includes('home') || industryLower.includes('decor')) return 'Shop Collection';
  if (industryLower.includes('jewelry') || industryLower.includes('luxury')) return 'Explore Collection';
  if (industryLower.includes('sport') || industryLower.includes('fitness')) return 'Shop Now';
  if (industryLower.includes('pet')) return 'Shop Now';
  if (industryLower.includes('beauty') || industryLower.includes('cosmetic') || industryLower.includes('skincare')) return 'Shop Now';
  
  return 'Shop Now';
}

/**
 * Get industry-appropriate mood and scene guidance
 * This gives Gemini direction without being overly prescriptive
 */
function getIndustryMoodGuide(industry: string, productType: ProductType): string {
  const ind = industry.toLowerCase();
  
  if (ind.includes('food') || ind.includes('restaurant') || ind.includes('bakery') || ind.includes('beverage') || ind.includes('cafe')) {
    return 'Think: appetite appeal — warm golden lighting, rich textures, the product looking absolutely delicious and irresistible. Evoke the sensory experience of taste and aroma.';
  }
  if (ind.includes('fashion') || ind.includes('clothing') || ind.includes('apparel') || ind.includes('streetwear')) {
    return 'Think: editorial fashion photography — bold poses, dramatic lighting, runway/street style aesthetic. The clothing should look aspirational and trendsetting.';
  }
  if (ind.includes('tech') || ind.includes('software') || ind.includes('saas') || ind.includes('app') || ind.includes('electronic')) {
    return 'Think: sleek, minimal, modern — clean surfaces, subtle tech textures, ambient screen glow. Apple/Google-level product presentation. Innovation and simplicity.';
  }
  if (ind.includes('fitness') || ind.includes('gym') || ind.includes('sport') || ind.includes('athletic')) {
    return 'Think: energy, power, determination — dynamic lighting, motion blur, sweat and intensity. Nike/Under Armour campaign energy. Make viewers feel motivated.';
  }
  if (ind.includes('beauty') || ind.includes('cosmetic') || ind.includes('skincare') || ind.includes('salon') || ind.includes('spa')) {
    return 'Think: luxury beauty — soft, ethereal lighting, pristine surfaces, dewy/radiant textures. Glossier/Chanel ad quality. Elegance and self-care.';
  }
  if (ind.includes('real estate') || ind.includes('property') || ind.includes('construction')) {
    return 'Think: architectural photography — dramatic angles, golden hour exterior lighting, spacious interiors. Luxury living aspiration. Sotheby\'s level presentation.';
  }
  if (ind.includes('automotive') || ind.includes('car') || ind.includes('vehicle')) {
    return 'Think: premium automotive — dramatic studio lighting, reflective surfaces, speed and luxury. BMW/Mercedes campaign quality. Power and precision.';
  }
  if (ind.includes('jewelry') || ind.includes('luxury') || ind.includes('watch')) {
    return 'Think: ultra-luxury — macro detail, sparkle and reflection, velvet/silk textures, dramatic dark backgrounds. Cartier/Rolex ad quality.';
  }
  if (ind.includes('education') || ind.includes('course') || ind.includes('learning') || ind.includes('school')) {
    return 'Think: empowerment and growth — bright, optimistic lighting, knowledge and achievement imagery. Aspirational but approachable.';
  }
  if (ind.includes('health') || ind.includes('medical') || ind.includes('pharma') || ind.includes('dental') || ind.includes('wellness')) {
    return 'Think: trust and care — clean, clinical yet warm lighting, professional but comforting. Convey expertise and compassion.';
  }
  if (ind.includes('travel') || ind.includes('hotel') || ind.includes('tourism') || ind.includes('hospitality')) {
    return 'Think: wanderlust — breathtaking destinations, golden hour, dreamy atmospherics. The viewer should want to book immediately.';
  }
  if (ind.includes('finance') || ind.includes('bank') || ind.includes('insurance') || ind.includes('invest')) {
    return 'Think: trust, stability, prosperity — sophisticated, corporate-premium, deep rich colors. Convey financial confidence and growth.';
  }
  if (ind.includes('pet') || ind.includes('animal')) {
    return 'Think: warmth and joy — adorable, heartwarming, the bond between pets and owners. Bright, happy, lifestyle photography feel.';
  }
  if (ind.includes('gaming') || ind.includes('esport')) {
    return 'Think: epic and immersive — neon accents, dramatic dark environments, high-energy. The excitement of gaming culture.';
  }
  if (ind.includes('music') || ind.includes('entertainment') || ind.includes('event')) {
    return 'Think: vibrant energy — stage lighting, dynamic colors, the thrill of live experiences. Electric atmosphere.';
  }
  if (ind.includes('furniture') || ind.includes('home') || ind.includes('interior') || ind.includes('decor')) {
    return 'Think: lifestyle aspiration — beautifully styled rooms, natural lighting, warm and inviting spaces. Pottery Barn/West Elm aesthetic.';
  }
  
  // Fallback - generic but still smart
  return `Think: premium ${industry} brand campaign — study what the BEST brands in ${industry} do for their advertising and create something at that level. Dramatic lighting, professional composition, aspirational mood.`;
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
  brandAssets?: BrandAssets,
  industry?: string,
  niche?: string
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
  
  // Use the FULL expanded prompt as creative direction (not truncated)
  const styleContext = prompt.prompt ? prompt.prompt.trim() : '';
  
  // Industry context for smart prompting
  const industryLabel = industry || 'general';
  const nicheLabel = niche || brandName;
  
  // Determine smart CTA based on product type and industry
  const smartCTA = getSmartCTA(productType, industryLabel);
  
  // Get industry-aware color & mood guidance (NOT hardcoded colors - just direction)
  const industryMoodGuide = getIndustryMoodGuide(industryLabel, productType);
  
  // Color guidance - only if user provided custom colors
  const hasCustomColors = brandAssets?.primaryColor || brandAssets?.secondaryColor;
  const colorDirective = hasCustomColors 
    ? `BRAND COLORS PROVIDED: Use ${brandAssets?.primaryColor || 'N/A'} as primary and ${brandAssets?.secondaryColor || 'N/A'} as secondary. Incorporate these as the dominant palette while ensuring contrast and readability.`
    : `NO BRAND COLORS PROVIDED: You have FULL creative freedom. Analyze the ${industryLabel} industry aesthetic and choose a color palette that feels authentic, premium, and appropriate. Study what top brands in ${industryLabel} use and create something equally compelling.`;

  if (hasProductImage && hasLogo) {
    // BOTH product and logo provided
    textPrompt = `You are a world-class advertising creative director with 20+ years experience at top agencies. You've created iconic campaigns across every industry — from luxury fashion to tech startups to food brands to fitness companies. Your typography, composition, and visual storytelling are legendary.

=== YOUR CREATIVE BRIEF ===

INDUSTRY: ${industryLabel}
PRODUCT/SERVICE: ${nicheLabel}
PRODUCT TYPE: ${productType}

PRODUCT (FIRST uploaded image):
- This is the HERO product — preserve its exact appearance, colors, packaging, and design perfectly
- Enhance with premium studio lighting and realistic shadows appropriate to this product category
- Position as the dominant focal point

LOGO (SECOND uploaded image):
- Place in a natural corner position — preserve exactly as uploaded
- Do NOT duplicate or modify the logo anywhere

${colorDirective}

BACKGROUND & SCENE:
- Study the product and create a scene that feels AUTHENTIC to the ${industryLabel} industry
- ${industryMoodGuide}
- The scene should feel like a premium ${industryLabel} brand campaign — NOT generic stock photography
- Dramatic lighting, depth, and cinematic quality that makes the product IRRESISTIBLE

Campaign Theme: ${prompt.ideaTitle}
${styleContext ? `
=== CREATIVE DIRECTION FROM ART DIRECTOR ===
${styleContext}` : ''}

=== TYPOGRAPHY DIRECTION (Use Your Expert Judgment) ===

You have FULL CREATIVE FREEDOM for typography. As an expert, you understand:

${slogan ? `HEADLINE: "${slogan}"
- Choose typography that feels NATIVE to the ${industryLabel} industry
- Analyze the scene colors and pick text colors that create PERFECT CONTRAST
- Use your expertise to decide: metallic, solid, gradient, or textured finish
- Position where it has MAXIMUM IMPACT without competing with product
- Ensure it's bold, commanding, and readable at any size` : ''}

${pricing ? `PRICE ELEMENT: "${pricing}"
- Design a price presentation that feels NATIVE to this specific ad's aesthetic
- Choose shape (badge, ribbon, burst, tag, banner, elegant text) based on what fits THIS scene and THIS industry
- Select colors that POP against the background while feeling cohesive
- Make it IMPOSSIBLE TO MISS but not tacky — you know the balance
- Position strategically for natural eye flow` : ''}

CTA: "${smartCTA}"
- Design a CTA element that is the NATURAL next step for a ${industryLabel} customer
- Choose colors that create URGENCY while matching the ad's premium feel
- Make it PROMINENT and CLICKABLE-looking
- Position at bottom area, sized for impact

=== YOUR EXPERTISE PRINCIPLES ===
- Visual hierarchy: Product → Headline → Price → CTA
- Color theory: Complementary/contrasting colors for readability
- Breathing room: Text needs space, never cramped or overlapping
- Legibility: Every element readable even as a small thumbnail
- Cohesion: All text elements feel like they belong together
- Industry authenticity: This should look like it was made BY a ${industryLabel} brand, FOR ${industryLabel} customers

AVOID: Duplicating any element, cluttered layouts, competing focal points, text lost in busy areas, generic/stock-photo aesthetics.

CREATE: A ${industryLabel}-industry-leading advertisement that would win awards and stop scrolling.`;

  } else if (hasProductImage) {
    // Only product image provided
    textPrompt = `You are a world-class advertising creative director with 20+ years experience at top agencies. You've created iconic campaigns across every industry. Your typography, composition, and visual storytelling are legendary.

=== YOUR CREATIVE BRIEF ===

INDUSTRY: ${industryLabel}
PRODUCT/SERVICE: ${nicheLabel}
PRODUCT TYPE: ${productType}

PRODUCT (uploaded image):
- This is the HERO product — preserve its exact appearance, colors, packaging, and design perfectly
- Enhance with premium studio lighting and realistic shadows appropriate to this product category
- Position as the dominant focal point

${colorDirective}

BACKGROUND & SCENE:
- Study the product and create a scene that feels AUTHENTIC to the ${industryLabel} industry
- ${industryMoodGuide}
- The scene should feel like a premium ${industryLabel} brand campaign
- Dramatic lighting, depth, and cinematic quality

BRAND NAME: "${brandName}"
- Include the brand name prominently in the ad
- Choose a placement and style that feels natural for ${industryLabel} advertising

Campaign Theme: ${prompt.ideaTitle}
${styleContext ? `
=== CREATIVE DIRECTION FROM ART DIRECTOR ===
${styleContext}` : ''}

=== TYPOGRAPHY DIRECTION (Use Your Expert Judgment) ===

You have FULL CREATIVE FREEDOM for typography:

${slogan ? `HEADLINE: "${slogan}"
- Typography that feels NATIVE to ${industryLabel}
- Analyze scene colors → pick PERFECT CONTRAST
- Bold, commanding, readable at any size` : ''}

${pricing ? `PRICE ELEMENT: "${pricing}"
- Design a price presentation NATIVE to this ad's aesthetic and ${industryLabel} norms
- Shape, colors, position — all your creative call
- Must be noticeable but elegant` : ''}

CTA: "${smartCTA}"
- Natural next step for a ${industryLabel} customer
- Premium feel, prominent placement

=== YOUR EXPERTISE PRINCIPLES ===
- Visual hierarchy: Product → Brand → Headline → Price → CTA
- Color theory for readability, breathing room for text
- Every element readable at thumbnail size
- This should look like an ad FROM a top ${industryLabel} brand

AVOID: Duplicating elements, clutter, text lost in busy areas.

⚠️ TEXT ACCURACY — READ CAREFULLY:
- The brand name is EXACTLY: "${brandName}" — spell each word exactly as shown, do NOT repeat, skip, rearrange, or add any words
- Each text string (brand name, slogan, price, CTA) must appear EXACTLY ONCE in the image
- Double-check: no word in the brand name should appear twice

CREATE: A scroll-stopping ${industryLabel} advertisement worthy of industry awards.`;

  } else if (hasLogo) {
    // Only logo provided
    textPrompt = `You are a world-class advertising creative director with 20+ years experience at top agencies. You create stunning brand advertisements across every industry.

=== YOUR CREATIVE BRIEF ===

INDUSTRY: ${industryLabel}
PRODUCT/SERVICE: ${nicheLabel}
PRODUCT TYPE: ${productType}

LOGO (uploaded image):
- Place in a natural corner position — preserve exactly as uploaded
- Analyze the logo's colors and style to inform the overall design direction
- Do NOT duplicate or modify the logo

BRAND: ${brandName}
Campaign Theme: ${prompt.ideaTitle}
${styleContext ? `
=== CREATIVE DIRECTION FROM ART DIRECTOR ===
${styleContext}` : ''}

${colorDirective}

BACKGROUND & SCENE:
- Create a luxurious, aspirational environment that reflects the ${industryLabel} industry
- ${industryMoodGuide}
- The viewer should feel brand prestige, desire, and trust
- Think: What would a Fortune 500 ${industryLabel} brand's campaign look like?

=== TYPOGRAPHY DIRECTION (Use Your Expert Judgment) ===

BRAND NAME: "${brandName}"
- Make it COMMANDING and memorable
- Choose typography that reflects both the brand's personality and ${industryLabel} industry norms
- Position prominently

${slogan ? `HEADLINE: "${slogan}"
- Typography that COMPLEMENTS the brand and feels native to ${industryLabel}
- Perfect contrast with your scene
- Maximum impact without competing with brand name` : ''}

${pricing ? `PRICE/OFFER: "${pricing}"
- Design that feels native to THIS ad and THIS industry
- Noticeable but elegant` : ''}

CTA: "${smartCTA}"
- Natural next step for ${industryLabel} customers
- Premium feel, prominent placement

=== YOUR EXPERTISE PRINCIPLES ===
- Visual hierarchy: Logo → Brand Name → Headline → Price → CTA
- Industry-authentic aesthetics for ${industryLabel}
- Each element readable at thumbnail size
- Premium, cohesive design

CRITICAL: Logo appears EXACTLY ONCE. Each text element appears EXACTLY ONCE.

⚠️ TEXT ACCURACY — READ CAREFULLY:
- The brand name is EXACTLY: "${brandName}" — spell each word exactly as shown, do NOT repeat, skip, rearrange, or add any words
- Each text string (brand name, slogan, price, CTA) must appear EXACTLY ONCE in the image
- Double-check: no word in the brand name should appear twice

CREATE: A ${industryLabel} brand advertisement worthy of a Times Square billboard.`;

  } else {
    // No images provided - pure text-to-image
    // This is the HARDEST scenario - we need to create EVERYTHING from scratch
    // Use industry + productType for smart scene generation

    textPrompt = `You are a world-class advertising creative director with 20+ years experience at top agencies. You've created iconic campaigns across every industry — fashion, food, tech, fitness, real estate, automotive, beauty, finance, and more.

THIS IS YOUR MOST CHALLENGING BRIEF: Create a complete advertisement from SCRATCH — no product photos provided. Your visual creativity must shine.

=== BRAND CONTEXT ===
Brand: ${brandName}
Industry: ${industryLabel}
Product/Service: ${nicheLabel}
Product Type: ${productType}
Campaign Theme: ${prompt.ideaTitle}
${styleContext ? `
=== CREATIVE DIRECTION FROM ART DIRECTOR ===
${styleContext}` : ''}

${colorDirective}

=== VISUAL CREATION ===

You must CREATE a stunning visual that represents this ${industryLabel} brand. Study what the TOP brands in ${industryLabel} do and create something equally compelling.

YOUR CREATIVE APPROACH (choose the best for this ${industryLabel} ${productType}):

OPTION A - PRODUCT/BRAND VISUALIZATION:
- Imagine and CREATE what this ${nicheLabel} product/service looks like
- Place it in a premium, industry-authentic environment
- ${industryMoodGuide}
- Make the viewer DESIRE this product/service

OPTION B - LIFESTYLE & ASPIRATION:
- Show the LIFESTYLE or OUTCOME this ${nicheLabel} enables
- Create a scene showing what life looks like WITH this brand
- Aspirational but believable — the viewer should say "I want that"
- Use environments authentic to ${industryLabel}

OPTION C - ABSTRACT PREMIUM:
- Create a visually stunning abstract/artistic representation
- Rich textures, dramatic lighting, premium materials relevant to ${industryLabel}
- The environment itself should FEEL like the brand's values
- Sophisticated, high-end, scroll-stopping

Choose whichever approach creates the most STUNNING, SCROLL-STOPPING visual for a ${industryLabel} brand.

=== CRITICAL VISUAL REQUIREMENTS ===
- This ad must be SCROLL-STOPPING on social media
- Create a scene so visually striking people pause immediately
- The visual should feel AUTHENTIC to the ${industryLabel} industry — NOT generic
- NOT a stock photo look — this must feel CUSTOM and PREMIUM
- The visual should make ${brandName} feel like a billion-dollar ${industryLabel} company

=== TYPOGRAPHY (Your Expert Judgment) ===

BRAND NAME: "${brandName}"
- This is the STAR — make it ICONIC and memorable
- Choose typography that would work as a premium ${industryLabel} brand identity
- Position prominently at top
- Must feel like a brand people would TRUST

${slogan ? `TAGLINE: "${slogan}"
- Supporting text that reinforces the brand promise
- Style that COMPLEMENTS the brand name and feels native to ${industryLabel}
- Perfect contrast with your scene` : ''}

${pricing ? `PRICE/OFFER: "${pricing}"
- Design a price presentation that feels PREMIUM, not cheap
- Badge, ribbon, or elegant callout based on what fits YOUR scene and ${industryLabel} norms
- Noticeable but not overwhelming` : ''}

CTA: "${smartCTA}"
- A CTA element that feels like the obvious next step for a ${industryLabel} customer
- Premium feel matching the overall ad aesthetic
- Prominent but not garish

=== YOUR CREATIVE PRINCIPLES ===
- Visual hierarchy: Scene → Brand Name → Tagline → Price → CTA
- The SCENE is as important as the text — make it STUNNING
- Color harmony between visual and typography
- Every element readable at thumbnail size
- This should look like a premium ${industryLabel} advertising campaign, not a template

CRITICAL: Each text element appears EXACTLY ONCE. No duplicates.

⚠️ TEXT ACCURACY — READ CAREFULLY:
- The brand name is EXACTLY: "${brandName}" — spell each word exactly as shown, do NOT repeat, skip, rearrange, or add any words
- Each text string (brand name, slogan, price, CTA) must appear EXACTLY ONCE in the image
- Double-check: no word in the brand name should appear twice

CREATE: An advertisement so visually striking it would trend on social media and make ${brandName} look like the #1 brand in ${industryLabel}.`;
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
  brandAssets?: BrandAssets,
  industry?: string,
  niche?: string
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
        brandAssets,
        industry,
        niche
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

/**
 * Generate or edit an image with full context
 * Used for user edits - maintains brand context while applying changes
 */
export async function generateSingleImageWithContext(
  prompt: DynamicPrompt,
  brandName: string,
  slogan: string | undefined,
  pricing: string | undefined,
  productType: ProductType,
  aspectRatio: AspectRatio = '1:1',
  brandAssets?: BrandAssets,
  currentImageUrl?: string, // Current image if editing
  editRequest?: string, // User's edit request
  industry?: string,
  niche?: string
): Promise<string> {
  // Check if we should use mock mode
  if (!process.env.GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY not set - returning mock base64');
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  const { width, height } = getImageDimensions(aspectRatio);
  const parts: any[] = [];

  // If editing, add current image for reference
  if (currentImageUrl && editRequest) {
    const currentImageData = extractBase64FromDataUrl(currentImageUrl);
    if (currentImageData) {
      console.log('[DEBUG] Adding current image for editing reference');
      parts.push({
        inlineData: {
          mimeType: currentImageData.mimeType,
          data: currentImageData.data
        }
      });
    }
  }

  // Add brand assets if provided
  if (brandAssets?.productImageUrl) {
    const productImageData = extractBase64FromDataUrl(brandAssets.productImageUrl);
    if (productImageData) {
      parts.push({
        inlineData: {
          mimeType: productImageData.mimeType,
          data: productImageData.data
        }
      });
    }
  }

  if (brandAssets?.logoUrl) {
    const logoData = extractBase64FromDataUrl(brandAssets.logoUrl);
    if (logoData) {
      parts.push({
        inlineData: {
          mimeType: logoData.mimeType,
          data: logoData.data
        }
      });
    }
  }

  // Build edit-aware prompt with full context
  const styleContext = prompt.prompt ? prompt.prompt.trim() : '';
  
  let editPrompt: string;

  const industryCtx = industry || 'general';
  const nicheCtx = niche || brandName;

  if (editRequest && currentImageUrl) {
    // EDITING MODE - User wants changes to existing ad
    editPrompt = `You are a master advertising editor who understands every pixel of high-end advertising.

=== EDITING CONTEXT ===
You are editing an existing advertisement. The user has provided feedback on what they want changed.

ORIGINAL AD CONTEXT:
- Brand: ${brandName}
- Industry: ${industryCtx}
- Product/Service: ${nicheCtx}
- Campaign: ${prompt.ideaTitle}
- Product Type: ${productType}
${slogan ? `- Slogan: "${slogan}"` : ''}
${pricing ? `- Pricing: "${pricing}"` : ''}
${styleContext ? `- Style: ${styleContext}` : ''}

USER'S EDIT REQUEST: "${editRequest}"

WHAT TO DO:
Your job is to understand the user's request and APPLY IT intelligently while:
1. Maintaining the overall ad concept and brand identity
2. Keeping the premium, professional quality authentic to ${industryCtx}
3. Preserving what was working in the original
4. Making the specific changes the user requested

CRITICAL:
- The edited ad must still include: Brand name, Price (if provided), CTA
- Keep the same aspect ratio and composition approach
- The edit should feel intentional, not broken
- This is still a professional, award-worthy ${industryCtx} advertisement

CREATE: An improved version that addresses the user's feedback perfectly.`;
  } else {
    // FRESH GENERATION MODE
    editPrompt = `You are a world-class advertising creative director with 20+ years experience.

BRAND: ${brandName}
Industry: ${industryCtx}
Product/Service: ${nicheCtx}
Campaign: ${prompt.ideaTitle}
Product Type: ${productType}
${slogan ? `Slogan: "${slogan}"` : ''}
${pricing ? `Pricing: "${pricing}"` : ''}

Create a stunning, award-worthy ${industryCtx} advertisement.`;
  }

  parts.push({ text: editPrompt });

  console.log(`\n🎨 ${editRequest ? 'EDITING' : 'GENERATING'} Ad for ${brandName}...`);

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
    throw new Error('No image data in response');
  }

  console.log(`✅ ${editRequest ? 'Edit' : 'Generation'} successful!`);
  return (imagePart as any).inlineData.data;
}

export { getGenAI };


