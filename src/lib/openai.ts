import OpenAI from 'openai';
import { 
  BusinessDetails, 
  MarketingIdea, 
  DynamicPrompt 
} from '@/types';

// Lazy initialization to avoid build-time errors
let openaiClient: OpenAI | null = null;

/**
 * Get current seasonal/trend context based on date and region
 */
function getSeasonalContext(): string {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();
  
  const events: string[] = [];
  const trends: string[] = [];

  // === SEASONAL EVENTS (approximate dates) ===
  
  // Ramadan/Eid (shifts yearly — approximate for 2025-2027 range)
  if ((month === 2 && day >= 10) || (month === 3 && day <= 15)) {
    events.push('Ramadan season — iftar gatherings, spiritual warmth, crescent moon motifs, purple/gold/green color palettes, family togetherness, generous giving spirit');
  }
  if ((month === 3 && day >= 20) || (month === 4 && day <= 5)) {
    events.push('Eid ul-Fitr season — celebration, joy, gift-giving, festive colors, sweets, new clothes, family reunions');
  }
  if ((month === 5 && day >= 5) || (month === 5 && day <= 20)) {
    events.push('Eid ul-Adha season — sacrifice, sharing, family feasts, warm earthy tones, traditional values');
  }
  
  // Western Holidays
  if (month === 11 && day >= 20) {
    events.push('Christmas season — warm reds/greens/golds, cozy festive vibes, gift-giving, holiday sparkle, snow elements');
  }
  if (month === 11 && day >= 25 && day <= 30) {
    events.push('Black Friday / Cyber Monday — bold deal graphics, urgency, countdown energy, red/black/yellow sale aesthetic');
  }
  if (month === 0 && day <= 7) {
    events.push('New Year — fresh starts, resolutions, "New Year New You" energy, midnight blue/gold/silver palettes');
  }
  if (month === 1 && day >= 7 && day <= 15) {
    events.push('Valentine\'s Day — love, romance, red/pink/rose gold, hearts, couples, self-love angle');
  }
  if (month === 2 && day >= 1 && day <= 10) {
    events.push('International Women\'s Day (March 8) — empowerment, bold feminine energy, purple/gold');
  }
  if (month === 4 && day >= 5 && day <= 15) {
    events.push('Mother\'s Day season — warmth, gratitude, soft pastels, floral elements, gift-worthy messaging');
  }
  if (month === 5 && day >= 10 && day <= 20) {
    events.push('Father\'s Day season — masculine warmth, bold/rugged, navy/whiskey tones, appreciation');
  }
  if (month === 9 && day >= 25) {
    events.push('Halloween — dark/playful, orange/black/purple, spooky-fun energy, limited edition vibes');
  }
  
  // Regional (South Asian)
  if (month === 10 && day >= 1 && day <= 15) {
    events.push('Diwali season — festival of lights, diyas, gold/orange/warm glow, sparklers, celebration');
  }
  if (month === 7 && day >= 10 && day <= 15) {
    events.push('Pakistan Independence Day (Aug 14) — green/white, national pride, patriotic energy');
  }
  
  // Seasonal moods
  if (month >= 5 && month <= 7) {
    trends.push('SUMMER vibes — bright colors, outdoor energy, refreshing tones, sunshine, heat, cooling products highlighted');
  } else if (month >= 8 && month <= 10) {
    trends.push('AUTUMN/FALL vibes — warm amber/copper/burgundy, cozy textures, harvest mood, layered comfort');
  } else if (month >= 11 || month <= 1) {
    trends.push('WINTER vibes — cool blues/silvers, cozy warmth contrast, indoor comfort, holiday spirit');
  } else {
    trends.push('SPRING vibes — fresh greens, bloom/renewal energy, pastels, new beginnings, outdoor optimism');
  }

  // === CURRENT DESIGN TRENDS (2025-2026) ===
  trends.push('2025-2026 REALISTIC design trends to consider: Neo-brutalism (raw, bold, unpolished typography), maximalist color clashing, organic flowing shapes, bold serif typography comeback, editorial-style product photography (most effective!), dark mode aesthetics, warm grain/analog film revival, earth-tone minimalism, textured paper/fabric overlays in design, cinematic color grading, natural material focus (stone, wood, linen, ceramic), muted luxury palettes');

  let context = '';
  if (events.length > 0) {
    context += `\n\n🎯 SEASONAL CONTEXT (background info only — use sparingly, MAX 1 idea can reference this, and ONLY if it genuinely fits the brand/product):\n${events.map(e => `- ${e}`).join('\n')}`;
  }
  context += `\n\n🎨 CURRENT SEASON & DESIGN TRENDS (subtle influence only — do NOT make entire ideas about seasons):\n${trends.map(t => `- ${t}`).join('\n')}`;
  
  return context;
}

/**
 * Get platform-specific context based on aspect ratio
 */
function getPlatformContext(aspectRatio?: string): string {
  switch (aspectRatio) {
    case '1:1':
      return `\n\n📱 PLATFORM: Instagram/Facebook Feed Post (Square)
- Must be thumb-stopping in a crowded feed
- Text must be readable at phone-screen size
- Visual hierarchy crucial — users scroll FAST (1.7 seconds average)
- High contrast and bold elements perform best
- Consider how it looks as a small thumbnail`;
    case '4:5':
      return `\n\n📱 PLATFORM: Instagram Feed (Portrait — takes more screen space = more attention)
- Vertical advantage — fills more of the phone screen than square
- Keep key elements in center-top (bottom may be cropped in grid preview)
- Portrait framing favors tall compositions and standing products
- This format gets 20% more engagement than square on Instagram`;
    case '9:16':
      return `\n\n📱 PLATFORM: Instagram/TikTok/Facebook Story or Reel (Full Vertical)
- FULL SCREEN experience — immersive, no distractions
- Text should be in the center 60% (top/bottom are covered by UI elements)
- Must grab attention in first 0.5 seconds
- Bold, striking, high-impact visuals work best
- Keep brand name and CTA in the safe zone (away from edges)
- Think: magazine cover layout but vertical`;
    case '16:9':
      return `\n\n📱 PLATFORM: YouTube/LinkedIn/Twitter Banner (Landscape/Widescreen)
- Cinematic widescreen format — think movie poster or billboard
- Great for panoramic scenes and wide product layouts
- Text works best at left-third or center
- LinkedIn audience expects professional polish
- YouTube thumbnails need BOLD text and expressive visuals`;
    default:
      return `\n\n📱 PLATFORM: Social media feed ad (optimize for scroll-stopping impact)`;
  }
}

/**
 * Get industry-specific competitor references and best practices
 */
function getIndustryInspirations(industry: string): string {
  const inspirations: Record<string, string> = {
    'Food & Beverage': `STUDY THESE TOP BRANDS for inspiration (adapt, don't copy):
- Coca-Cola: Emotional storytelling, happiness association, iconic red
- Starbucks: Lifestyle integration, cozy aesthetic, seasonal limited editions
- McDonald's: Bold simplicity, "I'm Lovin' It" energy, appetite-appeal close-ups
- Local chai/food brands: Authenticity, cultural connection, street-food energy
BEST PRACTICES: Close-up hero shots that trigger appetite, steam/freshness cues, warm color palettes, lifestyle context showing enjoyment`,
    
    'Fashion & Apparel': `STUDY THESE TOP BRANDS for inspiration:
- Nike: Aspirational athlete energy, bold minimalism, empowerment messaging
- Zara: Editorial sophistication, clean layouts, model-centric storytelling
- Khaadi/Sapphire: Cultural fusion, fabric texture focus, seasonal collections
BEST PRACTICES: Model/lifestyle shots, fabric texture close-ups, outfit context, editorial lighting, seasonal trend alignment`,
    
    'Technology': `STUDY THESE TOP BRANDS for inspiration:
- Apple: Ultra-minimal, product-as-art, white space mastery, one hero element
- Samsung: Feature demonstrations, vibrant screens, lifestyle integration
- Spotify: Bold gradients, duotone imagery, music-meets-visual energy
BEST PRACTICES: Clean product renders, feature callouts, dark mode aesthetics, futuristic environments, screen-on-device mockups`,
    
    'Health & Fitness': `STUDY THESE TOP BRANDS for inspiration:
- Nike Training: Sweat and determination, dramatic lighting, athlete stories
- Gymshark: Community-driven, transformation stories, bold body-positive imagery
- Peloton: Premium lifestyle, home fitness aspiration, warm but energetic
BEST PRACTICES: Action shots with motion energy, before/after transformations, motivational text, sweat/texture realism, gym environment lighting`,
    
    'Beauty & Skincare': `STUDY THESE TOP BRANDS for inspiration:
- Glossier: Dewy minimalism, skin-positive, soft pink aesthetic, real skin texture
- Fenty Beauty: Inclusive diversity, bold colors, fashion-forward, high-energy
- The Ordinary: Clinical clean, ingredient-focused, honest transparency
BEST PRACTICES: Skin texture close-ups, product-on-skin application shots, dewy/glowing lighting, ingredient visualization, clean clinical layouts`,
    
    'Real Estate': `STUDY THESE TOP BRANDS for inspiration:
- Emaar: Luxury lifestyle aspiration, golden hour architecture, skyline drama
- DHA: Trust, security, family-centric, green spaces, community living
- Zameen.com: Clear property info, location highlights, investment angle
BEST PRACTICES: Golden hour exterior shots, interior lifestyle scenes, aerial/drone perspectives, family aspiration, investment value messaging`,
    
    'Automotive': `STUDY THESE TOP BRANDS for inspiration:
- BMW: Performance precision, dramatic lighting on bodywork, "Ultimate Driving Machine" energy
- Tesla: Futuristic minimalism, tech-forward, sustainability angle
- Toyota: Reliability, adventure, family, "Let's Go Places" lifestyle
BEST PRACTICES: Dramatic car-as-hero lighting, road/landscape context, speed/power suggestion, interior luxury details, reflection/surface quality`,
    
    'Education': `STUDY THESE TOP BRANDS for inspiration:
- Coursera/Udemy: Transformation promise, career growth, accessible knowledge
- Khan Academy: Friendly, approachable, diverse learners, bright optimistic colors
- University brands: Prestige, campus beauty, alumni success, tradition
BEST PRACTICES: Student success stories, bright optimistic palettes, knowledge/growth metaphors, campus or study lifestyle, career transformation`,
    
    'Jewelry & Luxury': `STUDY THESE TOP BRANDS for inspiration:
- Tiffany & Co: Iconic blue, elegant simplicity, gift-giving moments
- Cartier: Red + gold opulence, dramatic close-ups, royalty association
- Local jewelers: Cultural wedding context, bridal sets, gold investment
BEST PRACTICES: Macro close-ups on skin, dramatic sparkle lighting, velvet/silk surfaces, gift-box reveals, cultural occasion context`,
  };

  // Try exact match first, then partial match
  for (const [key, value] of Object.entries(inspirations)) {
    if (industry.toLowerCase().includes(key.toLowerCase().split(' ')[0])) {
      return value;
    }
  }

  return `STUDY the TOP 5 brands in the ${industry} industry. What makes their ads scroll-stopping? Adapt their visual language and production quality for this brand. Research what aesthetic, lighting, composition, and messaging patterns the BEST ${industry} brands use.`;
}

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
  const biz = details.businessName;
  const season = getSeasonalContext();
  const isPhysical = details.productType === 'physical';
  const isService = details.productType === 'service';
  
  return [
    {
      id: 'idea_1',
      title: `${productName} Premium Showcase`,
      description: `Hero product shot with cinematic ${details.industry} styling. The kind of image that makes someone stop scrolling and say "I need this."`,
      hooks: [`Discover ${productName}`, `${biz} Presents`, 'Elevate Your Standard'],
      hashtags: [`#${biz.replace(/\s+/g, '')}`, `#${details.industry.replace(/[\s&]+/g, '')}`, '#PremiumQuality', '#ShopNow'],
      visualConcept: `${isPhysical ? `Hero shot of ${productName} on a dark textured surface with dramatic side-lighting creating depth and shadows` : isService ? `Split composition showing transformation — the before struggle vs. the after confidence of using ${biz}` : `Sleek device mockup floating at an angle with ${productName} interface glowing on screen, against a gradient background`}. "${biz}" in bold modern typography top-center. ${details.pricingInfo ? `"${details.pricingInfo}" in an attention-grabbing badge bottom-right.` : 'Strong call-to-action button at bottom.'} ${details.brandSlogan ? `"${details.brandSlogan}" as a subtle tagline.` : ''} Cinematic quality, premium feel.`
    },
    {
      id: 'idea_2',
      title: `${details.industry} Lifestyle Vision`,
      description: `Show ${productName} in a real-world lifestyle context. Not just the product — the LIFE it enables. Aspirational but authentic.`,
      hooks: ['Live Better', `The ${biz} Lifestyle`, 'Made For You'],
      hashtags: ['#Lifestyle', '#Aesthetic', `#${biz.replace(/\s+/g, '')}Life`, '#Goals'],
      visualConcept: `${isPhysical ? `${productName} in a warm, lived-in lifestyle setting — on a kitchen counter, beside a morning coffee, golden natural light streaming in` : isService ? `A person confidently enjoying the results of ${biz} — radiant, relaxed, in a beautiful natural setting` : `Someone using ${productName} at a minimal desk setup, focused and productive, soft ambient lighting`}. Shot feels candid and authentic, not staged. "${biz}" branding subtle but present. ${details.pricingInfo ? `"${details.pricingInfo}" worked into the design naturally.` : ''} Warm, inviting color palette.`
    },
    {
      id: 'idea_3',
      title: 'Bold Statement Ad',
      description: `Typography-led design where the MESSAGE is the hero. The kind of ad that communicates in 2 seconds flat.`,
      hooks: [`Why ${biz}?`, 'Don\'t Settle', `${productName}. Period.`],
      hashtags: ['#Bold', '#Statement', `#${details.industry.replace(/[\s&]+/g, '')}`, '#NowAvailable'],
      visualConcept: `Bold typographic design — large, impactful text "${details.brandSlogan || biz}" takes center stage against a rich, solid-color background. ${isPhysical ? `Small ${productName} image at bottom as anchor element` : 'Subtle visual texture in the background'}. Modern sans-serif or bold serif font feeling. ${details.pricingInfo ? `"${details.pricingInfo}" in a contrasting accent color.` : ''} Minimal but powerful. High contrast between text and background.`
    },
    {
      id: 'idea_4',
      title: 'Trust & Social Proof',
      description: `Build instant credibility. Combine product quality with social validation — the ad that makes people think "everyone else already has this."`,
      hooks: ['Trusted by Thousands', `Why Everyone Loves ${biz}`, '★★★★★ Rated'],
      hashtags: ['#Trusted', '#CustomerFavorite', '#TopRated', '#Reviews'],
      visualConcept: `Clean, trustworthy layout with ${isPhysical ? `${productName} beautifully presented` : `${biz} branding`} alongside 5-star rating visual and a short testimonial quote. Light, airy background — white or soft cream. "${biz}" logo prominent. ${details.pricingInfo ? `Price "${details.pricingInfo}" shown clearly.` : 'Clear CTA at bottom.'} Professional, credible, clean design that screams reliability.`
    },
    {
      id: 'idea_5',
      title: 'Seasonal / Trending Concept',
      description: `Tap into current cultural moments or trending aesthetics. Makes the brand feel RELEVANT and current, not generic.`,
      hooks: ['Limited Edition', `This Season's Must-Have`, 'Trending Now'],
      hashtags: ['#Trending', '#NewDrop', '#MustHave', `#${biz.replace(/\s+/g, '')}2026`],
      visualConcept: `${isPhysical ? `${productName} presented with current seasonal aesthetic — think trending color palettes and textures of 2025-2026 (soft gradients, organic shapes, neo-brutalist typography)` : `${biz} branded in a trendy, contemporary visual style that feels fresh and current`}. Could incorporate seasonal elements if relevant. Modern, editorial feel — like a high-end magazine ad meets Instagram content. "${biz}" in a fresh, contemporary typography style. ${details.pricingInfo ? `"${details.pricingInfo}" in accent element.` : ''} Feels like the brand is ahead of the curve.`
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

  // Get dynamic context
  const seasonalContext = getSeasonalContext();
  const platformContext = getPlatformContext(details.aspectRatio);
  const industryInspirations = getIndustryInspirations(details.industry);

  const systemPrompt = `You are an elite creative director at a world-class advertising agency. You create ad concepts that are BOTH visually stunning AND commercially effective.

Your specialty: Creating SCROLL-STOPPING single-image ads for social media that look like they cost $100,000 to produce — but are REALISTIC and achievable.

CRITICAL RULES:

1. SINGLE IMAGE ADS ONLY — not a campaign, not a video, not a carousel

2. EACH IDEA = UNIQUE — vary the mood, angle, scene, and approach across all 5

3. THE visualConcept IS EVERYTHING — it directly drives the AI image generator (Gemini). Quality here = quality of final image.

4. COMMERCIAL EFFECTIVENESS FIRST:
   - Every idea must be designed to SELL the product, not just look artistic
   - The target audience must INSTANTLY understand what's being sold
   - The product/brand must be the HERO in every concept
   - Think: "Would the actual target customer stop scrolling and want to BUY?"
   - A restaurant owner doesn't want retro-futurism. A biryani lover doesn't care about surreal cloudscapes.

5. AI GENERATION FEASIBILITY — THIS IS CRITICAL:
   - Every concept must be REALISTIC for AI image generation
   - NEVER suggest: surreal floating objects, neon gradient meshes, crystal bowls in clouds, retro-futurism abstractions, waterfalls of products, hyper-realistic single grain close-ups, dreamlike cloudscapes, impossible physics, abstract digital art, 3D renders floating in void
   - ALWAYS suggest: Natural photography scenes, studio setups, lifestyle environments, close-up product shots, real-world settings with tangible props
   - The final image should look like a REAL professional photograph, NOT digital art or fantasy
   - Reality check: "Could a photographer recreate this scene in a real studio?" If NO, don't suggest it.

6. INDUSTRY AUTHENTICITY — match the visual language that customers in THIS industry expect

6. SEASONAL AWARENESS — MAXIMUM 1 out of 5 ideas can reference the current season or holiday, and ONLY if it genuinely enhances the brand. The other 4 ideas must be SEASON-AGNOSTIC (would work any time of year). DO NOT make multiple ideas about winter/summer/holidays.

8. NO GENERIC TEMPLATES — every concept should feel custom-crafted for this exact business

For visualConcept, write a PHOTOGRAPHER'S SHOT LIST:
- EXACT scene/environment (not "clean background" but "brushed concrete counter with morning light from the left window")
- Lighting: direction, quality, color temperature (golden hour, studio softbox, natural window, dramatic side-light)
- Composition: camera angle, product placement, rule of thirds, depth of field
- Materials/surfaces: specific tangible textures (slate, wood grain, linen cloth, wet glass)
- Props: real-world items that enhance the scene (spices, fabrics, devices — things that EXIST)
- Color palette: 2-3 dominant colors as a mood (warm earth tones, cool minimalist blues, etc.)
- Emotional tone: ONE clear emotion per concept (cozy, energetic, luxurious, fresh, urgent, etc.)

Always respond with valid JSON.`;

  const userPrompt = `Create 5 UNIQUE, STUNNING ad image concepts for this ${details.industry} business:

=== BRAND PROFILE ===
Business Name: "${details.businessName}"
Industry: ${details.industry}
Product/Service: ${details.niche}
Product Type: ${details.productType} (${details.productType === 'physical' ? 'tangible product you can hold/see' : details.productType === 'digital' ? 'software/app/digital tool' : 'service business'})
${details.brandSlogan ? `Brand Slogan: "${details.brandSlogan}"` : 'No slogan provided'}
${details.pricingInfo ? `Pricing: "${details.pricingInfo}"` : 'No pricing provided'}
${details.adCopyPoints ? `
KEY SELLING POINTS (user wants these displayed on the ad):
${details.adCopyPoints}
→ These must appear as VISIBLE TEXT on the final ad. Plan visual concepts with enough layout space to showcase these as beautifully designed elements alongside the hero visual.` : ''}
${platformContext}
${seasonalContext}

=== INDUSTRY INTELLIGENCE ===
${industryInspirations}

=== YOUR TASK ===
Create 5 distinctly different ad concepts. Each must:
1. Be a SINGLE IMAGE ad optimized for the platform above
2. Feature "${details.businessName}" brand name prominently
${details.pricingInfo ? `3. Display the price "${details.pricingInfo}" in an eye-catching way` : '3. Include a compelling call-to-action'}
${details.brandSlogan ? `4. Incorporate the slogan "${details.brandSlogan}"` : ''}

=== HOW TO CREATE THE 5 IDEAS ===

Do NOT follow a fixed formula. Instead, think like a real creative director:
- What would make someone in ${details.industry} STOP scrolling?
- What visual HASN'T been done a million times in this industry?
- What emotion will make the viewer ACT?
- What would the TOP brand in ${details.industry} post tomorrow?

Your 5 ideas should NATURALLY span different approaches. Some REALISTIC directions (pick what fits BEST — don't force all):

• Product-as-hero (premium studio showcase, close-up detail, beautiful product photography)
• Lifestyle context (product in real life, aspirational scene, someone enjoying/using it)
• Bold typography-led (words ARE the visual, minimal but impactful, strong message)
• Mood/atmosphere (sensory, emotional, cinematic, texture-rich — but REAL scenes)
• Editorial style (magazine-quality photography, behind-the-scenes of the brand)
• Cultural moment (tie to current season/event if one is happening now)
• Social proof (review-style, "as seen on", testimonial aesthetic, trust signals)
• Problem → Solution (show the pain point, then the product as hero — split frame)
• Ingredient/process showcase (what makes this product special — raw materials, craftsmanship)
• Comparison/before-after (transformation story in one frame)

Choose the 5 directions that will be MOST EFFECTIVE for "${details.businessName}" specifically.

A food brand might need: appetite hero + recipe lifestyle + Ramadan special + social proof + ingredient showcase
A tech brand might need: product on desk + feature callout + dark mode showcase + lifestyle setup + comparison
A salon might need: transformation before/after + luxurious interior + seasonal bridal + testimonial + treatment close-up

THINK SPECIFICALLY for ${details.industry} / ${details.niche}.

⚠️ REALITY CHECK — DO NOT GENERATE:
- Surreal/fantasy scenes (no floating objects in clouds, no dreamscapes, no impossible physics)
- Abstract digital art (no neon gradient meshes, no retro-futurism, no 3D voids)
- Scenes that can't exist in real life (no waterfall of products, no single grain macro in space)
- Concepts that confuse the viewer about WHAT is being sold
- Ideas that only appeal to art directors, not actual BUYERS

=== VISUAL CONCEPT QUALITY STANDARD ===
Your visualConcept must be SPECIFIC enough to direct a photographer.

BAD (too generic): "Product on clean background with dramatic lighting and bold text"
GOOD (specific & cinematic): "Hero product placed on a weathered wooden table with natural grain, backlit by soft window light creating translucent edges. Background: warm blurred bokeh of cafe ambient light. Brand name in bold serif typography overlaid top-left with semi-transparent white backdrop. Price tag as a vintage-style leather label hanging from string. Shallow depth of field, everything feels warm, artisanal, and accessible."

CRITICAL - NO REPETITION ACROSS IDEAS:
- Each visualConcept must use COMPLETELY DIFFERENT surfaces/materials/environments
- Each must have DIFFERENT lighting (side-lit, backlit, overhead, neon, natural, dramatic)
- Each must have DIFFERENT color palette mood (warm vs cool vs vibrant vs muted vs dark)
- Each must have DIFFERENT emotional energy (calm vs urgent vs playful vs premium vs raw)
- The 5 ads should look like they came from 5 DIFFERENT photoshoots

Include in every visualConcept:
- Exact scene description (surfaces, materials, environment) - UNIQUE PER IDEA
- Lighting direction and quality - VARIED
- Text placement and style feeling
- Color palette mood - CONTRASTING
- Emotional tone - ALL DIFFERENT

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
    temperature: 0.90,
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

TREND & CULTURAL AWARENESS:
- If a seasonal event is relevant, weave its visual language naturally (festive lights, warm tones for holidays, fresh greens for spring launches, etc.)
- Reference current 2025 design movements when they fit (neo-brutalism, AI surrealism, glassmorphism, grain/analog revival)
- DON'T force trends — only use them when they genuinely enhance the concept

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

  const seasonalContext = getSeasonalContext();
  const platformContext = getPlatformContext(details.aspectRatio);

  const userPrompt = `Transform these selected ad concepts into PRODUCTION-READY image generation prompts.

=== BRAND CONTEXT ===
Brand: "${details.businessName}"
Industry: ${details.industry}
Niche: ${details.niche}
Product Type: ${details.productType}
${details.brandSlogan ? `Slogan: "${details.brandSlogan}"` : 'No slogan'}
${details.pricingInfo ? `Pricing: "${details.pricingInfo}"` : 'No pricing'}
${details.adCopyPoints ? `
KEY SELLING POINTS (must appear as designed elements on the ad):
${details.adCopyPoints}
→ Your expanded prompts MUST instruct the image generator to include these as beautifully DESIGNED visual elements on the ad — NOT as a plain text list. Describe a premium presentation style (feature cards, elegant panels, icon-paired labels, etc.) that integrates naturally into the ad composition.` : ''}

${productTypeGuidelines[details.productType]}

=== CURRENT CONTEXT (USE IF RELEVANT) ===
${seasonalContext}
${platformContext}

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
