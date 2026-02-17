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

  const systemPrompt = `You are an expert ad creative director specializing in product showcase advertisements.
Your job is to create DIRECT, PRODUCT-FOCUSED ad concepts - not abstract marketing campaigns.
You create ads that SHOWCASE the actual product/service with clear messaging like:
- "Introducing [Product Name]" 
- "Now Available - [Price]"
- "[Product] - [Key Benefit]"
- "Order Today - [Offer]"

Think like you're creating a single Instagram/Facebook ad image, NOT a multi-channel campaign.
Always respond with valid JSON.`;

  const userPrompt = `Create 5 PRODUCT-FOCUSED AD CONCEPTS for this business:

Business Name: ${details.businessName}
Industry: ${details.industry}
Product/Service: ${details.niche}
Product Type: ${details.productType}
${details.brandSlogan ? `Brand Slogan: ${details.brandSlogan}` : ''}
${details.pricingInfo ? `Pricing: ${details.pricingInfo}` : ''}

IMPORTANT: These are SINGLE AD IMAGE concepts, not campaign strategies!

Each ad should be like a real Instagram/Facebook product ad:
- SHOW the actual product/service
- Include the brand name "${details.businessName}" prominently
- Have a clear headline (e.g., "Introducing...", "Now Available", "Try Today")
${details.pricingInfo ? `- Display the price "${details.pricingInfo}"` : '- Include a call-to-action'}
${details.brandSlogan ? `- Use the slogan "${details.brandSlogan}"` : ''}

For each ad concept, provide:
1. A short title describing the ad type (3-5 words)
2. What this specific ad shows and says (2-3 sentences)
3. 2-3 headline options for the ad
4. 3-4 relevant hashtags
5. DETAILED visual description: exactly what the ad image contains, where text is placed, the product positioning

Think: What would a professional social media ad for "${details.niche}" look like?

Respond with JSON:
{
  "ideas": [
    {
      "id": "idea_1",
      "title": "Ad Type Title",
      "description": "What this ad shows and communicates",
      "hooks": ["Headline Option 1", "Headline Option 2"],
      "hashtags": ["#hashtag1", "#hashtag2"],
      "visualConcept": "Detailed description of the ad image - product placement, text placement, colors, style"
    }
  ]
}`;

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.8,
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

  const systemPrompt = `You are an expert at crafting prompts for AI image generation.
Your specialty is creating prompts that produce stunning, professional marketing visuals.
You understand how to describe lighting, composition, style, and mood for best results.
The generated images must include text elements (brand name, slogan, pricing) naturally.
Always respond with valid JSON.`;

  const productTypeGuidelines = {
    physical: `For physical products:
- The product should be the hero of the image
- Place it in a stunning, contextual environment
- Use professional product photography lighting
- Make the product look premium and desirable`,
    
    service: `For service businesses:
- Focus on the emotional outcome/transformation
- Use lifestyle imagery showing happy customers
- Convey the feeling of the service benefit
- Include aspirational elements`,
    
    digital: `For digital products:
- Use mockup marketing (product on screens)
- Show the product on modern devices (laptop, tablet, phone)
- Include UI elements if relevant
- Create a tech-forward, modern aesthetic`
  };

  const userPrompt = `Create detailed image generation prompts for these selected marketing ideas:

Business Details:
- Name: ${details.businessName}
- Industry: ${details.industry}
- Niche: ${details.niche}
- Product Type: ${details.productType}
${details.brandSlogan ? `- Slogan: "${details.brandSlogan}"` : ''}
${details.pricingInfo ? `- Pricing: ${details.pricingInfo}` : ''}

${productTypeGuidelines[details.productType]}

Selected Campaign Ideas:
${selectedIdeas.map((idea, i) => `
${i + 1}. ${idea.title}
   Concept: ${idea.description}
   Visual: ${idea.visualConcept}
`).join('\n')}

For each idea, create a highly detailed prompt that:
1. Describes the exact scene, composition, and layout
2. Specifies lighting, colors, and mood
3. Includes where and how to place the text "${details.businessName}"
4. ${details.brandSlogan ? `Includes the slogan "${details.brandSlogan}"` : 'Creates an impactful headline'}
5. ${details.pricingInfo ? `Incorporates the pricing "${details.pricingInfo}"` : 'Includes a call-to-action'}
6. Ensures 2K resolution quality (2048x2048)
7. Makes text highly legible and professionally integrated

Respond with JSON:
{
  "prompts": [
    {
      "ideaId": "idea_1",
      "ideaTitle": "Campaign Title",
      "prompt": "The complete, detailed prompt for image generation..."
    }
  ]
}`;

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
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
