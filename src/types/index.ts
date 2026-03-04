// ============================================
// Database Types
// ============================================

export type ProductType = 'physical' | 'service' | 'digital';

export type CampaignStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface User {
  id: string;
  email: string;
  credits: number;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string | null;
  business_name: string;
  industry: string;
  niche: string;
  product_type: ProductType;
  brand_slogan: string | null;
  pricing_info: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  project_id: string;
  idea_title: string;
  idea_description: string;
  dynamic_prompt: string;
  status: CampaignStatus;
  created_at: string;
}

export interface GeneratedImage {
  id: string;
  campaign_id: string;
  image_url: string;
  storage_path: string;
  resolution: string;
  created_at: string;
}

// ============================================
// API Request/Response Types
// ============================================

export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9';

export interface BrandAssets {
  logoUrl?: string;           // Base64 or URL of uploaded logo
  productImageUrl?: string;   // Base64 or URL of product/service image
  primaryColor?: string;      // Hex color code
  secondaryColor?: string;    // Hex color code
}

export interface BusinessDetails {
  businessName: string;
  industry: string;
  niche: string;
  productType: ProductType;
  brandSlogan?: string;
  pricingInfo?: string;
  adCopyPoints?: string;
  aspectRatio?: AspectRatio;
  brandAssets?: BrandAssets;
}

export interface MarketingIdea {
  id: string;
  title: string;
  description: string;
  hooks: string[];
  hashtags: string[];
  visualConcept: string;
}

export interface GenerateIdeasRequest {
  businessName: string;
  industry: string;
  niche: string;
  productType: ProductType;
}

export interface GenerateIdeasResponse {
  ideas: MarketingIdea[];
}

export interface ExpandPromptsRequest {
  selectedIdeas: MarketingIdea[];
  projectDetails: BusinessDetails;
}

export interface DynamicPrompt {
  ideaId: string;
  ideaTitle: string;
  prompt: string;
}

export interface ExpandPromptsResponse {
  prompts: DynamicPrompt[];
}

export interface CreateAdsRequest {
  prompts: DynamicPrompt[];
  brandName: string;
  slogan?: string;
  pricing?: string;
  adCopyPoints?: string;
  productType: ProductType;
  industry?: string;
  niche?: string;
  aspectRatio?: AspectRatio;
  brandAssets?: BrandAssets;
}

export interface GeneratedAd {
  id: string;
  ideaId: string;
  ideaTitle: string;
  imageUrl: string;
  prompt: string;
}

export interface CreateAdsResponse {
  images: GeneratedAd[];
  projectId: string;
}

// ============================================
// UI State Types
// ============================================

export interface WizardState {
  currentStep: number;
  businessDetails: BusinessDetails | null;
  ideas: MarketingIdea[];
  selectedIdeas: MarketingIdea[];
  generatedAds: GeneratedAd[];
  isLoading: boolean;
  error: string | null;
}

export type WizardStep = 
  | 'business-details'
  | 'brand-info'
  | 'select-ideas'
  | 'generating'
  | 'results';

// ============================================
// URL Flow Types
// ============================================

export interface URLScrapedProduct {
  name: string;
  price: string | null;
  originalPrice: string | null;
  currency: string | null;
  image: string | null;
  images: string[];
  description: string | null;
  category: string | null;
  variants: string[];
  inStock: boolean;
  url: string | null;
}

export interface URLBrandAnalysis {
  brandName: string;
  tagline: string;
  industry: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  suggestedFontStyle: 'modern' | 'classic' | 'playful' | 'elegant' | 'bold';
  brandVoice: string;
  targetAudience: string;
  uniqueSellingPoints: string[];
  keyMessages: string[];
  products: Array<{
    name: string;
    price: string | null;
    description: string;
    image: string | null;
    keyFeatures: string[];
    suggestedAdAngle: string;
  }>;
  productType: ProductType;
  isEcommerce: boolean;
  adRecommendations: {
    bestPlatforms: string[];
    suggestedTones: string[];
    visualStyle: string;
    callToAction: string;
  };
}

export interface URLAdIdea {
  id: string;
  productName: string;
  productImage: string | null;
  productPrice: string | null;
  headline: string;
  subheadline: string;
  bodyText: string;
  callToAction: string;
  adAngle: string;
  visualConcept: string;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  targetAudience: string;
  platform: string;
  suggestedFormat: 'square' | 'portrait' | 'landscape';
}

export interface URLGeneratedAd {
  id: string;
  ideaId: string;
  imageData: string;
  productName: string;
  headline: string;
  aspectRatio: string;
  prompt?: string; // For viewing/editing
}

export type URLFlowStep = 
  | 'url-input'
  | 'url-analyzing'
  | 'url-brand-review'
  | 'url-product-select'
  | 'url-ideas'
  | 'url-generating'
  | 'url-results';
