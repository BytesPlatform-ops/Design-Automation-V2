import OpenAI from 'openai';
import { 
  BusinessDetails, 
  MarketingIdea, 
  DynamicPrompt 
} from '@/types';

// Lazy initialization to avoid build-time errors
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Generate mock marketing ideas for testing without API key
 */
function generateMockIdeas(details: BusinessDetails): MarketingIdea[] {
  const productName = details.niche.split(' ').slice(0, 3).join(' ');
  
  return [
    {
      id: 'idea_1',
      title: 'Product Launch Spotlight',
      description: `Showcase your ${productName} as the star. A clean, premium product-focused ad with bold "NOW AVAILABLE" messaging and your brand front and center.`,
      hooks: ['Introducing ' + productName, 'Now Available', 'Get Yours Today'],
      hashtags: ['#NewLaunch', '#NowAvailable', `#${details.businessName.replace(/\s+/g, '')}`, '#ShopNow'],
      visualConcept: `Professional product photography with ${productName} as the hero. Clean background, dramatic lighting highlighting the product. Large bold text "${details.businessName}" at top, ${details.pricingInfo ? `"${details.pricingInfo}" prominently displayed` : '"Order Now" call-to-action'}. ${details.brandSlogan ? `Slogan "${details.brandSlogan}" included.` : ''}`
    },
    {
      id: 'idea_2',
      title: 'Special Offer Banner',
      description: `Drive sales with a compelling offer ad. Eye-catching pricing display with urgency elements. Perfect for promotions and seasonal sales.`,
      hooks: ['Limited Time Offer', 'Special Price', 'Don\'t Miss Out'],
      hashtags: ['#Sale', '#SpecialOffer', '#LimitedTime', '#Discount'],
      visualConcept: `Bold promotional design with ${productName} displayed prominently. ${details.pricingInfo ? `Large "${details.pricingInfo}" in eye-catching typography` : 'Attractive price point displayed'}. "${details.businessName}" branding clear. Urgency text like "Limited Stock" or "Order Today". Vibrant colors that pop.`
    },
    {
      id: 'idea_3',
      title: 'Benefit-Focused Hero',
      description: `Highlight the main benefit your ${productName} delivers. A direct, clear message showing what the customer gets.`,
      hooks: [details.productType === 'digital' ? 'Save Hours Every Day' : 'Premium Quality', 'Experience the Difference', 'Upgrade Now'],
      hashtags: ['#Quality', '#Premium', `#${details.industry.replace(/\s+/g, '')}`, '#MustHave'],
      visualConcept: `${details.productType === 'physical' ? `Beautiful product shot of ${productName} in use context` : details.productType === 'service' ? 'Happy customer enjoying the service result' : `Sleek mockup showing ${productName} interface on devices`}. Headline text showing the key benefit. "${details.businessName}" logo placement. ${details.brandSlogan ? `"${details.brandSlogan}" as tagline.` : 'Clear call-to-action text.'}`
    },
    {
      id: 'idea_4',
      title: 'Social Proof Ad',
      description: `Build trust instantly with a testimonial-style ad. Show real results and customer satisfaction with ${details.businessName}.`,
      hooks: ['Trusted by Thousands', '5-Star Rated', 'See Why Everyone Loves It'],
      hashtags: ['#CustomerLove', '#Reviews', '#Recommended', '#TopRated'],
      visualConcept: `Product image with star rating overlay (★★★★★). Quote-style testimonial text. "${details.businessName}" branding prominent. ${details.pricingInfo ? `Price "${details.pricingInfo}" shown` : 'Shop Now button'}. Clean, trustworthy design aesthetic.`
    },
    {
      id: 'idea_5',
      title: 'Quick Feature Showcase',
      description: `Highlight 3 key features of your ${productName}. Perfect for products with multiple selling points.`,
      hooks: ['3 Reasons to Love It', 'Why Choose Us', 'Features You\'ll Love'],
      hashtags: ['#Features', '#WhyChooseUs', `#${details.businessName.replace(/\s+/g, '')}`, '#Quality'],
      visualConcept: `Central product image of ${productName} with 3 feature callouts around it. Each feature with icon and short text. "${details.businessName}" header. ${details.pricingInfo ? `"Starting at ${details.pricingInfo}"` : 'Clear CTA button'}. Modern, infographic-style layout.`
    }
  ];
}

/**
 * Generate 5 marketing campaign ideas based on business details
 */
export async function generateMarketingIdeas(
  details: BusinessDetails
): Promise<MarketingIdea[]> {
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY not set - using mock ideas');
    return generateMockIdeas(details);
  }

  const systemPrompt = `You are an elite creative director at a world-class advertising agency. You've won Cannes Lions, D&AD Black Pencils, and One Show Gold across EVERY industry — food, fashion, tech, fitness, beauty, automotive, real estate, finance, gaming, and more.

Your specialty: Creating SCROLL-STOPPING single-image ads for social media that look like they cost $100,000 to produce.

CRITICAL RULES:
1. Each idea must be a SINGLE IMAGE AD — not a campaign, not a video, not a carousel
2. Each idea must feel UNIQUE and DIFFERENT from the others — vary the mood, angle, scene, and approach
3. The visualConcept is the MOST IMPORTANT field — it directly drives the AI image generator
4. Think about what makes the TOP ads in THIS SPECIFIC industry incredible, and create concepts at that level
5. NO generic templates — every concept should feel custom-crafted for this exact business

For visualConcept, think like a photographer/art director and specify:
- EXACT scene/environment (not "clean background" but "brushed concrete surface with morning light streaming from the left")
- Lighting style (golden hour, studio rim light, neon glow, natural window light, dramatic chiaroscuro)
- Composition (hero product center-frame, rule of thirds, overhead flat-lay, 45-degree angle)
- Mood/emotion (luxury calm, energetic urgency, cozy warmth, sleek minimalism, bold maximalism)
- Material/texture references (marble, brushed metal, natural wood grain, velvet, water droplets)
- Color mood (warm earth tones, cool minimalist palette, vibrant pop colors, moody dark tones)

The visualConcept should read like a detailed shot description a photographer would use on set.

Always respond with valid JSON.`;

  const userPrompt = `Create 5 UNIQUE, STUNNING ad image concepts for this ${details.industry} business:

=== BRAND PROFILE ===
Business Name: "${details.businessName}"
Industry: ${details.industry}
Product/Service: ${details.niche}
Product Type: ${details.productType} (${details.productType === 'physical' ? 'tangible product you can hold' : details.productType === 'digital' ? 'software/app/digital tool' : 'service business'})
${details.brandSlogan ? `Brand Slogan: "${details.brandSlogan}"` : 'No slogan provided'}
${details.pricingInfo ? `Pricing: "${details.pricingInfo}"` : 'No pricing provided'}

=== YOUR TASK ===
Create 5 distinctly different ad concepts. Each must:
1. Be a SINGLE IMAGE ad (Instagram/Facebook feed format)
2. Feature "${details.businessName}" brand name prominently
${details.pricingInfo ? `3. Display the price "${details.pricingInfo}" in an eye-catching way` : '3. Include a compelling call-to-action'}
${details.brandSlogan ? `4. Incorporate the slogan "${details.brandSlogan}"` : ''}

=== MAKE EACH CONCEPT UNIQUE ===
Vary across these dimensions — each ad should feel completely different:

AD 1 - HERO PRODUCT SHOWCASE: The product/service as the absolute star. Premium studio-quality presentation. Think: Apple product launch level.

AD 2 - LIFESTYLE/ASPIRATIONAL: Show the life AFTER using this product/service. The dream outcome. The emotional payoff. Think: Nike "Just Do It" energy.

AD 3 - BOLD TYPOGRAPHIC: Typography-led design where the words are the visual. Striking, artistic text treatment with the product as secondary element. Think: fashion magazine cover meets advertising.

AD 4 - SENSORY/ATMOSPHERIC: Create MOOD and FEELING. ${details.productType === 'physical' ? 'Textures, close-ups, macro details that make you want to reach into the screen' : details.productType === 'service' ? 'The transformation moment — the before/after feeling' : 'The futuristic, innovative energy of using cutting-edge technology'}. Think: perfume ad or luxury automotive commercial.

AD 5 - DISRUPTIVE/UNEXPECTED: Break the rules. Unexpected angle, surprising composition, pattern-interrupt that stops the scroll. Think: the ad that makes someone screenshot and share.

=== VISUAL CONCEPT QUALITY STANDARD ===
Your visualConcept must be SPECIFIC enough to direct a photographer. 

BAD (too generic): "Product on clean background with dramatic lighting and bold text"
GOOD (specific & cinematic): "Hero product placed on a weathered wooden table with natural grain, backlit by soft window light creating translucent edges. Background: warm blurred bokeh of cafe ambient light. Brand name in bold serif typography overlaid top-left with semi-transparent white backdrop. Price tag as a vintage-style leather label hanging from string. Shallow depth of field, everything feels warm, artisanal, and accessible."

INCREDIBLY IMPORTANT - NO REPETITION ACROSS IDEAS:
- Each visualConcept must use COMPLETELY DIFFERENT surfaces/materials
- FORBIDDEN to repeat: marble, concrete, specific material choices, lighting direction, or composition angles
- AD 1 uses marble? → AD 2 cannot
- AD 2 uses window light? → AD 3 must use different light source
- AD 3 uses overhead angle? → AD 4 must use different angle
- Use varied environments: studio vs outdoor vs lifestyle vs abstract vs dark vs bright

Each concept should be visually DISTINCT at first glance.

Include in every visualConcept:
- Exact scene description (surfaces, materials, environment) - DIFFERENT FOR EACH
- Lighting direction and quality - VARIED ACROSS ALL 5
- Text placement and style suggestion
- Color palette mood - CONTRAST BETWEEN IDEAS
- Emotional tone - NO DUPLICATES

Respond with JSON:
{
  "ideas": [
    {
      "id": "idea_1",
      "title": "Short Evocative Title (3-6 words)",
      "description": "What this ad communicates and why it works (2-3 sentences)",
      "hooks": ["Headline Option 1", "Headline Option 2", "Headline Option 3"],
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4"],
      "visualConcept": "EXTREMELY detailed shot description — 4-6 sentences covering scene, lighting, composition, materials, text placement, mood, and color palette. This directly drives the image generator."
    }
  ]
}`;

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.95,
    response_format: { type: 'json_object' }
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const parsed = JSON.parse(content);
  return parsed.ideas;
}

/**
 * Generate mock prompts for testing without API key
 */
function generateMockPrompts(
  selectedIdeas: MarketingIdea[],
  details: BusinessDetails
): DynamicPrompt[] {
  return selectedIdeas.map((idea) => ({
    ideaId: idea.id,
    ideaTitle: idea.title,
    prompt: `Professional marketing advertisement for ${details.businessName}. ${idea.visualConcept}. 
    
Style: Modern, professional ${details.industry} marketing photography. 
Text Elements: Brand name "${details.businessName}" prominently displayed${details.brandSlogan ? `, slogan "${details.brandSlogan}"` : ''}${details.pricingInfo ? `, pricing "${details.pricingInfo}"` : ''}.
Quality: 2K resolution, studio lighting, balanced composition.
Mood: Professional, trustworthy, engaging.`
  }));
}

/**
 * Expand selected ideas into detailed, optimized prompts for image generation
 */
export async function expandToPrompts(
  selectedIdeas: MarketingIdea[],
  details: BusinessDetails
): Promise<DynamicPrompt[]> {
  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY not set - using mock prompts');
    return generateMockPrompts(selectedIdeas, details);
  }

  const systemPrompt = `You are a master prompt engineer AND elite advertising creative director. You translate marketing ad concepts into the PERFECT prompts for an AI image generator (Google Gemini).

YOUR UNDERSTANDING OF AI IMAGE GENERATION:
- AI responds best to SPECIFIC, CONCRETE descriptions — not vague instructions
- Scene description quality DIRECTLY determines image quality
- You must describe the EXACT VISUAL the AI should create, like directing a photographer
- Include: materials, textures, lighting direction, color palette, composition, mood
- The more cinematic and specific your scene description, the better the output

PROMPT STRUCTURE THAT WORKS BEST:
1. Open with the primary scene/environment description
2. Describe the hero element (product/brand visualization) placement and treatment
3. Specify lighting quality and direction
4. Define the color mood and material textures
5. Describe the overall emotional tone and visual energy
6. Note composition and camera perspective

IMPORTANT PRINCIPLES:
- Do NOT specify exact font names or CSS-style properties — describe the FEELING of the typography
- Do NOT micromanage colors with hex codes — describe the color MOOD (warm earth tones, icy cool blues, etc.)
- DO describe specific materials (marble, brushed aluminum, liquid gold, matte ceramic)
- DO describe specific lighting (rim-lit from behind, diffused overhead softbox, dramatic side-light creating long shadows)
- DO describe the scene like a movie director would describe a shot to their cinematographer
- The prompt will be paired with the brand's product images/logo if they uploaded them

CRITICAL - AVOID REPETITION:
- Each prompt should feel VISUALLY DISTINCT from the others
- Do not repeat similar materials, lighting, angles, or compositions across prompts
- Vary between studio/outdoor/lifestyle/abstract environments
- Mix between warm and cool color palettes
- Alternate between different lighting directions (side-lit, backlit, top-lit, practical light)
- Use different compositional approaches (centered, rule-of-thirds, diagonal, overhead)
- Each should have its own unique emotional energy

The 3 prompts you create should look like totally different photoshoots, not variations on a theme.

Always respond with valid JSON.`;

  const productTypeGuidelines: Record<string, string> = {
    physical: `For physical products — think like a product photographer:
- Describe surfaces the product sits on (marble slab, dark slate, rustic wood, wet glass)
- Specify how light interacts with the product (catches the edge, creates reflections, casts soft shadows)
- Include environmental props that complement without competing (ingredient elements, texture accents, atmospheric particles)
- Make the product the undeniable hero — everything else serves it
- Describe the "tactile quality" — the viewer should almost feel they can touch the product`,
    
    service: `For service businesses — think like a lifestyle photographer:
- Describe the TRANSFORMATION or OUTCOME the service delivers
- Create scenes showing the emotional payoff (relief, joy, confidence, success)
- Use environmental storytelling — the space, the light, the mood tells the story
- Include human elements when appropriate (hands, silhouettes, implied presence)
- The viewer should FEEL what it's like to have this service in their life`,
    
    digital: `For digital products — think like a tech brand photographer:
- Describe device presentation (floating devices, minimal desk setup, isometric view)
- Specify screen content mood (abstract UI elements, data visualization, clean interfaces)
- Create a modern, forward-thinking environment (minimal workspace, futuristic elements)
- Use technology-authentic lighting (screen glow, ambient blue tones, clean white light)
- The viewer should feel "this will upgrade my life"`
  };

  const userPrompt = `Transform these selected ad concepts into PRODUCTION-READY image generation prompts.

=== BRAND CONTEXT ===
Brand: "${details.businessName}"
Industry: ${details.industry}
Niche: ${details.niche}
Product Type: ${details.productType}
${details.brandSlogan ? `Slogan: "${details.brandSlogan}"` : 'No slogan'}
${details.pricingInfo ? `Pricing: "${details.pricingInfo}"` : 'No pricing'}

${productTypeGuidelines[details.productType]}

=== SELECTED AD CONCEPTS ===
${selectedIdeas.map((idea, i) => `
${i + 1}. "${idea.title}"
   Concept: ${idea.description}
   Visual Direction: ${idea.visualConcept}
`).join('\n')}

=== YOUR TASK ===

For each concept, write a CINEMATIC prompt that reads like a shot description from a world-class photographer. The prompt should paint such a vivid picture that anyone reading it can SEE the exact image.

QUALITY STANDARD — compare these:

❌ WEAK PROMPT: "Create a professional ad for a shoe brand. Product centered, dramatic lighting, bold text, premium feel."

✅ STRONG PROMPT: "A single pristine white running shoe floating at a slight angle against a deep matte black background, lit from below with a cool blue uplight that catches the mesh texture and creates an ethereal glow around the sole. Tiny particles of light drift upward like sparks. The environment feels like a void of pure performance energy. The brand name should feel carved from light itself — clean, sharp, powerful. A subtle gradient from black to midnight blue gives depth. The composition is minimal but the impact is massive — this shoe is the future of running. The mood is electric, confident, and unstoppable."

YOUR PROMPT MUST INCLUDE:
1. **Scene/Environment**: Exact surfaces, backgrounds, props, atmosphere
2. **Lighting**: Direction, quality, color temperature, shadows
3. **Product/Hero Treatment**: How the main subject is presented and enhanced
4. **Color Palette Mood**: Warm/cool, specific tones, gradients, contrasts
5. **Composition & Camera Feel**: Angle, depth of field, focal point, spacing
6. **Emotional Energy**: What the viewer FEELS when they see this image
7. **Typography Direction**: NOT specific fonts — but the FEELING of the text (bold and industrial? elegant and thin? playful and rounded?)
8. **Text Content**: Brand name "${details.businessName}"${details.brandSlogan ? `, slogan "${details.brandSlogan}"` : ''}${details.pricingInfo ? `, price "${details.pricingInfo}"` : ''} — describe HOW they integrate into the scene

Each prompt should be 150-250 words of pure visual direction.

Respond with JSON:
{
  "prompts": [
    {
      "ideaId": "idea_1",
      "ideaTitle": "Campaign Title",
      "prompt": "A cinematic, detailed visual direction prompt..."
    }
  ]
}`;

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.85,
    response_format: { type: 'json_object' }
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const parsed = JSON.parse(content);
  return parsed.prompts;
}

export { getOpenAI };
