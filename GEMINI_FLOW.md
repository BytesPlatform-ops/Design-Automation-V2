# 🎬 COMPLETE FLOW: Kya Gemini ko Prompt Mein Jata Hai?

## 📊 High-Level Chain

```
User Input (Business Details)
    ↓
OpenAI ideation (5 ad ideas generate)
    ↓
User selects ideas
    ↓
OpenAI expandToPrompts() → CINEMATIC PROMPTS (150-250 words each)
    ↓
Gemini generateSingleImage() + generateAdsWithoutStorage()
    ↓
Gemini receives MULTI-PART REQUEST:
  ├─ Part 1: Product Image (base64) [if uploaded]
  ├─ Part 2: Logo Image (base64) [if uploaded]
  └─ Part 3: MASSIVE TEXT PROMPT with all context
    ↓
Gemini generates ad images
```

---

## 🔧 STEP-BY-STEP: What Gets Sent to Gemini

### INPUT TO `generateSingleImage()` Function

```typescript
generateSingleImage(
  prompt: DynamicPrompt,                    // ← OpenAI's expanded prompt + metadata
  brandName: string,                        // "Milan Foods"
  slogan: string | undefined,               // "Fresh From Farm"
  pricing: string | undefined,              // "Rs. 250/kg"
  productType: ProductType,                 // "physical" | "digital" | "service"
  aspectRatio: AspectRatio = '1:1',        // "1:1" | "4:5" | "9:16" | "16:9"
  brandAssets?: BrandAssets,                // Logo URL, Product Image URL, Colors
  industry?: string,                        // "Food & Beverage"
  niche?: string                            // "Premium Basmati Rice"
)
```

### Parts Array Sent to Gemini (In This Order)

#### **PART 1: Product Image** (if user uploaded)
```typescript
{
  inlineData: {
    mimeType: "image/jpeg" | "image/png",
    data: "base64_encoded_image_data_here..."  // ← Actual image bytes
  }
}
```

#### **PART 2: Logo Image** (if user uploaded)
```typescript
{
  inlineData: {
    mimeType: "image/jpeg" | "image/png",
    data: "base64_encoded_logo_data_here..."  // ← Actual logo bytes
  }
}
```

#### **PART 3: MASSIVE TEXT PROMPT** (The Core Instruction)

---

## 📝 PART 3: THE TEXT PROMPT — ALL 4 SCENARIOS

### 🎯 SCENARIO A: Product Image + Logo BOTH Provided

```
You are a world-class advertising creative director with 20+ years experience 
at top agencies. You've created iconic campaigns across every industry...

=== YOUR CREATIVE BRIEF ===

INDUSTRY: Food & Beverage
PRODUCT/SERVICE: Premium Basmati Rice
PRODUCT TYPE: physical

PRODUCT (FIRST uploaded image):
- This is the HERO product — preserve its exact appearance, colors, packaging, and design perfectly
- Enhance with premium studio lighting and realistic shadows appropriate to this product category
- Position as the dominant focal point

LOGO (SECOND uploaded image):
- Place in a natural corner position — preserve exactly as uploaded
- Do NOT duplicate or modify the logo anywhere

BRAND COLORS PROVIDED: Use #F5DEB3 as primary and #8B4513 as secondary. 
Incorporate these as the dominant palette while ensuring contrast and readability.

BACKGROUND & SCENE:
- Study the product and create a scene that feels AUTHENTIC to the Food & Beverage industry
- Think: warm golden lighting, rich textures, appetite appeal
- Dramatic lighting, depth, and cinematic quality that makes the product IRRESISTIBLE

Campaign Theme: Premium Rice Selection
=== CREATIVE DIRECTION FROM ART DIRECTOR ===
[FULL 200+ WORD PROMPT FROM OPENAI - No truncation anymore!
 A detailed cinematic scene description with specific lighting,
 composition, materials, mood, color palette, camera angle...]

=== TYPOGRAPHY DIRECTION (Use Your Expert Judgment) ===

You have FULL CREATIVE FREEDOM for typography. As an expert, you understand:

HEADLINE: "Fresh From Farm"
- Choose typography that feels NATIVE to Food & Beverage industry
- Analyze the scene colors and pick text colors that create PERFECT CONTRAST
- Use your expertise to decide: metallic, solid, gradient, or textured finish
- Position where it has MAXIMUM IMPACT without competing with product
- Ensure it's bold, commanding, and readable at any size

PRICE ELEMENT: "Rs. 250/kg"
- Design a price presentation that feels NATIVE to this specific ad's aesthetic
- Choose shape (badge, ribbon, burst, tag, banner, elegant text) based on what fits THIS scene
- Select colors that POP against the background while feeling cohesive
- Make it IMPOSSIBLE TO MISS but not tacky — you know the balance
- Position strategically (typically bottom-right) for natural eye flow

CTA: "Order Now"                          ← ⭐ SMART CTA (not always "Buy Now")
- Design a CTA element that is the NATURAL next step for a Food & Beverage customer
- Choose colors that create URGENCY while matching the ad's premium feel
- Make it PROMINENT and CLICKABLE-looking
- Position at bottom area, sized for impact

=== YOUR EXPERTISE PRINCIPLES ===
- Visual hierarchy: Product → Headline → Price → CTA
- Color theory: Complementary/contrasting colors for readability
- Breathing room: Text needs space, never cramped or overlapping
- Legibility: Every element readable even as a small thumbnail
- Cohesion: All text elements feel like they belong together
- Industry authenticity: This should look like it was made BY a Food brand, FOR Food customers

AVOID: Duplicating any element, cluttered layouts, competing focal points, text lost in busy areas, 
        generic/stock-photo aesthetics.

CREATE: A Food-industry-leading advertisement that would win awards and stop scrolling.
```

---

### 🎯 SCENARIO B: ONLY Product Image (No Logo)

```
=== YOUR CREATIVE BRIEF ===

INDUSTRY: Food & Beverage
PRODUCT/SERVICE: Premium Basmati Rice
PRODUCT TYPE: physical

PRODUCT (uploaded image):
- This is the HERO product — preserve its exact appearance...
- [Same as above]

[NO LOGO SECTION — SKIPPED]

BRAND NAME: "Milan Foods"
- Include the brand name prominently in the ad
- Choose a placement and style that feels natural for Food & Beverage advertising

BACKGROUND & SCENE:
[Same industry-aware guidance...]

Campaign Theme: Premium Rice Selection
=== CREATIVE DIRECTION FROM ART DIRECTOR ===
[Full expanded prompt from OpenAI...]

[Typography, Price, CTA same as above...]
```

---

### 🎯 SCENARIO C: ONLY Logo (No Product Image)

```
=== YOUR CREATIVE BRIEF ===

INDUSTRY: Food & Beverage
PRODUCT/SERVICE: Premium Basmati Rice
PRODUCT TYPE: physical

LOGO (uploaded image):
- Place in a natural corner position — preserve exactly as uploaded
- Analyze the logo's colors and style to inform the overall design direction
- Do NOT duplicate or modify the logo

BRAND: Milan Foods
Campaign Theme: Premium Rice Selection
=== CREATIVE DIRECTION FROM ART DIRECTOR ===
[Full expanded prompt...]

BACKGROUND & SCENE:
- Create a luxurious, aspirational environment that reflects the Food & Beverage industry
- Think: warm golden lighting, rich textures...
- The scene should feel like a premium Food brand campaign
- Dramatic lighting, depth, and cinematic quality

=== TYPOGRAPHY DIRECTION ===

BRAND NAME: "Milan Foods"
- Make it COMMANDING and memorable
- Choose typography that reflects both the brand's personality and Food & Beverage industry norms
- Position prominently

HEADLINE: "Fresh From Farm"
PRICE ELEMENT: "Rs. 250/kg"
CTA: "Order Now"
```

---

### 🎯 SCENARIO D: NO IMAGES AT ALL (Pure Text-to-Image)

```
=== BRAND CONTEXT ===
Brand: Milan Foods
Industry: Food & Beverage
Product/Service: Premium Basmati Rice
Product Type: physical
Campaign Theme: Premium Rice Selection
=== CREATIVE DIRECTION FROM ART DIRECTOR ===
[Full expanded prompt...]

NO BRAND COLORS PROVIDED: You have FULL creative freedom. Analyze the Food & Beverage 
industry aesthetic and choose a color palette that feels authentic, premium, and appropriate. 
Study what top brands in Food & Beverage use and create something equally compelling.

=== VISUAL CREATION ===

You must CREATE a stunning visual that represents this Food & Beverage brand. 
Study what the TOP brands in Food & Beverage do and create something equally compelling.

YOUR CREATIVE APPROACH (choose the best):
- OPTION A: PRODUCT/BRAND VISUALIZATION
- OPTION B: LIFESTYLE & ASPIRATION
- OPTION C: ABSTRACT PREMIUM

APPROACH FOR PHYSICAL PRODUCTS:
- Imagine and CREATE what this Premium Basmati Rice product looks like
- Place it in a premium, industry-authentic environment
- Think: warm golden lighting, rich textures, appetite appeal
- Make the viewer DESIRE this product/service

=== CRITICAL VISUAL REQUIREMENTS ===
- This ad must be SCROLL-STOPPING on social media
- Create a scene so visually striking people pause immediately
- The visual should feel AUTHENTIC to the Food & Beverage industry — NOT generic
- NOT a stock photo look — this must feel CUSTOM and PREMIUM

=== TYPOGRAPHY ===
BRAND NAME: "Milan Foods"
- Make it ICONIC and memorable
- Position prominently at top

HEADLINE: "Fresh From Farm"
PRICE/OFFER: "Rs. 250/kg"
CTA: "Order Now"
```

---

## 🎨 KEY DATA FLOWING INTO PROMPT

### From `BusinessDetails`:
```
{
  businessName: "Milan Foods",
  industry: "Food & Beverage",           ← ⭐ Used for mood guide
  niche: "Premium Basmati Rice",         ← ⭐ Used for scene context
  productType: "physical",               ← ⭐ Used for creative approach
  brandSlogan: "Fresh From Farm",        ← ⭐ Used as HEADLINE
  pricingInfo: "Rs. 250/kg",            ← ⭐ Used as PRICE ELEMENT
  brandAssets: {
    logoUrl: "data:image/png;base64,...",        ← ⭐ Sent as inline image
    productImageUrl: "data:image/jpeg;base64,..", ← ⭐ Sent as inline image
    primaryColor: "#F5DEB3",             ← ⭐ Used in color directive
    secondaryColor: "#8B4513"            ← ⭐ Used in color directive
  },
  aspectRatio: "1:1"                     ← ⭐ Used for image size (1024x1024)
}
```

### From OpenAI `expandToPrompts()` → `prompt.prompt`:
```
"A stunning product shot of premium basmati rice grains arranged on aged marble slab,
lit with warm golden rim light from behind creating luminous edges. Soft diffused overhead
key light reveals the grain texture. Background: deep warm gradient from chocolate brown
to burnt sienna. Rice grains catching light like jewels. Brand name 'Milan Foods' in elegant
serif typography with subtle gold metallic finish, positioned top-center. Price 'Rs. 250/kg'
in a warm bronze circular badge bottom-right. 'Order Now' CTA as a warm golden button
with dark text, bottom-center. The mood is premium, artisanal, trustworthy. Shallow depth
of field keeps focus on the hero rice. Color palette: warm earth tones with gold accents.
Cinematic, editorial food photography quality."

← This ENTIRE 180+ word prompt is now injected into
  "=== CREATIVE DIRECTION FROM ART DIRECTOR ===" section
  (Previously was truncated to 150 chars — HUGE improvement!)
```

---

## 🧠 SMART FUNCTIONS CALLED DURING PROMPT BUILDING

### 1️⃣ `getSmartCTA(productType, industry)`
```typescript
// Input: "physical", "Food & Beverage"
// Output: "Order Now"   ← Not always "Buy Now"!

// Different outputs per industry:
- Food → "Order Now"
- Fashion → "Shop Now"
- SaaS → "Try Free"
- Fitness → "Start Training"
- Salon → "Book Now"
- Real Estate → "Schedule a Visit"
- etc...
```

### 2️⃣ `getIndustryMoodGuide(industry, productType)`
```typescript
// Input: "Food & Beverage", "physical"
// Output: 
"Think: appetite appeal — warm golden lighting, rich textures, 
the product looking absolutely delicious and irresistible. 
Evoke the sensory experience of taste and aroma."

// Different per 17+ industries:
- Food → appetite appeal, golden hour, sensory
- Fashion → editorial, poses, runway aesthetic
- Tech → minimal, clean, futuristic
- Fitness → energy, motion blur, intensity
- Beauty → soft ethereal light, radiant textures
- Real Estate → architectural, golden hour, luxury
- Automotive → premium lighting, reflections, power
- etc...
```

---

## 📤 FINAL API CALL TO GEMINI

```typescript
const model = getGenAI().getGenerativeModel({
  model: 'gemini-3-pro-image-preview',
  generationConfig: { temperature: 0.7 }
});

const result = await model.generateContent({
  contents: [{
    role: 'user',
    parts: [
      { inlineData: { mimeType: 'image/jpeg', data: productImageBase64 } },  // Part 1
      { inlineData: { mimeType: 'image/png', data: logoImageBase64 } },      // Part 2
      { text: massiveTextPromptWith500+Lines }                               // Part 3
    ]
  }],
  generationConfig: {
    responseModalities: ['image', 'text']
  }
});
```

---

## 🎯 SUMMARY: What Makes the Difference?

| Component | Impact | Quality |
|-----------|--------|---------|
| **Inline Images** (Product + Logo) | Gemini sees actual brand assets | ✅ Context-aware |
| **Industry Label** | Scene mood & CTA adapted | ✅ Nike ≠ Restaurant |
| **Full OpenAI Prompt** (not truncated) | Cinematic direction | ✅ 200 words → not 150 chars |
| **Smart CTA** | Right call-to-action per industry | ✅ "Order Now" vs "Book Now" |
| **Smart Color Directive** | Optional colors + AI freedom | ✅ Brand colors OR creative freedom |
| **Industry Mood Guide** | Lighting/texture/feeling adapted | ✅ Food gets "appetite appeal" |
| **Typography Section** | Full creative freedom w/ principles | ✅ Bold, commanding, readable |
| **Visual Hierarchy** | Product → Brand → Headline → Price → CTA | ✅ Professional composition |

---

## 🚀 EXECUTION FLOW (User Perspective)

```
1. User enters: Business Name, Industry, Niche, Product Type, Slogan, Price
2. System calls generateMarketingIdeas() → 5 unique industry-specific ideas
3. User picks 3 ideas
4. System calls expandToPrompts() → 3 detailed 200+ word cinematic prompts
5. System calls generateSingleImage() for each prompt with:
   - User's logo (if provided) as inline image
   - User's product image (if provided) as inline image
   - All user data injected into the massive prompt
   - Industry context for smart decisions
   - Smart CTA based on their industry
6. Gemini generates 3 stunning ads
7. User can edit with AI or regenerate
```

---

## 📋 CHECKLIST: What Gets Passed?

- ✅ Product image (base64) — Gemini analyzes & preserves
- ✅ Logo image (base64) — Gemini places smartly
- ✅ Brand name — Used in all scenarios
- ✅ Slogan — Used as headline
- ✅ Pricing — Used as price element
- ✅ Industry name — Used for mood guide + scene context
- ✅ Niche/Product name — Used for context
- ✅ Product type — Used for creative approach selection
- ✅ Brand colors — Used IF provided, otherwise AI has freedom
- ✅ Aspect ratio — Used for image dimensions
- ✅ Full expanded prompt — 200+ word cinematic direction
- ✅ Smart CTA — Industry-appropriate call-to-action
- ✅ Smart mood guide — Industry-specific lighting/atmosphere
- ✅ Visual hierarchy principles — Clear composition direction
