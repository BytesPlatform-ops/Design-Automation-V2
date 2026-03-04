'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { EntryChoiceStep } from '@/components/wizard/entry-choice-step';
import { URLInputStep } from '@/components/wizard/url-input-step';
import { BrandReviewStep } from '@/components/wizard/brand-review-step';
import { ProductSelectionStep } from '@/components/wizard/product-selection-step';
import { BusinessDetailsStep } from '@/components/wizard/business-details-step';
import { BrandInfoStep } from '@/components/wizard/brand-info-step';
import { BrandAssetsStep } from '@/components/wizard/brand-assets-step';
import { SelectIdeasStep } from '@/components/wizard/select-ideas-step';
import { GeneratingStep } from '@/components/wizard/generating-step';
import { ResultsStep } from '@/components/wizard/results-step';
import { URLIdeasStep } from '@/components/wizard/url-ideas-step';
import { URLResultsStep } from '@/components/wizard/url-results-step';
import { BackgroundGenerator } from '@/components/wizard/background-generator';
import { Progress } from '@/components/ui/progress';
import { BusinessDetails, MarketingIdea, GeneratedAd, BrandAssets, AspectRatio, URLBrandAnalysis, URLAdIdea, URLGeneratedAd } from '@/types';
import { ExtractedBrandInfo, brandInfoToBusinessDetails } from '@/lib/brand-analyzer';

// Entry flow type: 'url' for website scraping, 'manual' for traditional flow, 'background' for no-text backgrounds
type EntryFlow = 'url' | 'manual' | 'background' | null;

// Steps for manual flow (existing)
const MANUAL_STEPS = [
  { id: 1, name: 'Business Details' },
  { id: 2, name: 'Brand Info' },
  { id: 3, name: 'Brand Assets' },
  { id: 4, name: 'Select Ideas' },
  { id: 5, name: 'Generating' },
  { id: 6, name: 'Results' },
];

// Steps for URL flow (new dedicated pipeline)
const URL_STEPS = [
  { id: 1, name: 'Enter URL' },
  { id: 2, name: 'Review Brand' },
  { id: 3, name: 'Select Products' },
  { id: 4, name: 'Ad Ideas' },
  { id: 5, name: 'Generating' },
  { id: 6, name: 'Results' },
];

export default function CreatePage() {
  // Entry flow state - null means show choice screen
  const [entryFlow, setEntryFlow] = useState<EntryFlow>(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails | null>(null);
  const [ideas, setIdeas] = useState<MarketingIdea[]>([]);
  const [selectedIdeas, setSelectedIdeas] = useState<MarketingIdea[]>([]);
  const [generatedAds, setGeneratedAds] = useState<GeneratedAd[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // URL flow specific state
  const [scrapedURL, setScrapedURL] = useState<string | null>(null);
  const [extractedBrandInfo, setExtractedBrandInfo] = useState<ExtractedBrandInfo | null>(null);
  
  // NEW: URL-specific pipeline state
  const [urlBrandAnalysis, setUrlBrandAnalysis] = useState<URLBrandAnalysis | null>(null);
  const [urlSelectedProducts, setUrlSelectedProducts] = useState<URLBrandAnalysis['products']>([]);
  const [urlAdIdeas, setUrlAdIdeas] = useState<URLAdIdea[]>([]);
  const [urlSelectedIdeas, setUrlSelectedIdeas] = useState<URLAdIdea[]>([]);
  const [urlGeneratedAds, setUrlGeneratedAds] = useState<URLGeneratedAd[]>([]);
  const [urlAspectRatio, setUrlAspectRatio] = useState<AspectRatio>('1:1');

  // Get current steps based on flow
  const STEPS = entryFlow === 'url' ? URL_STEPS : MANUAL_STEPS;
  const progress = entryFlow ? (currentStep / STEPS.length) * 100 : 0;

  // Handle entry choice
  const handleChooseURL = () => {
    setEntryFlow('url');
    setCurrentStep(1);
  };

  const handleChooseManual = () => {
    setEntryFlow('manual');
    setCurrentStep(1);
  };

  const handleChooseBackground = () => {
    setEntryFlow('background');
    setCurrentStep(1);
  };

  // Handle URL submission - use NEW enhanced scraper
  const handleURLSubmit = async (url: string) => {
    setScrapedURL(url);
    
    try {
      // Call the NEW url-scrape API with enhanced scraper
      const response = await fetch('/api/url-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze website');
      }

      const data = await response.json();
      
      if (!data.success || !data.analysis) {
        throw new Error('No brand information extracted');
      }

      // Store the analysis from new pipeline
      setUrlBrandAnalysis(data.analysis);
      
      // Also set extractedBrandInfo for backward compatibility with BrandReviewStep
      setExtractedBrandInfo({
        brandName: data.analysis.brandName,
        tagline: data.analysis.tagline,
        industry: data.analysis.industry,
        description: data.analysis.brandVoice,
        primaryColor: data.analysis.primaryColor,
        secondaryColor: data.analysis.secondaryColor,
        accentColor: data.analysis.accentColor || null,
        logoUrl: data.scrapedData?.logo || null,
        toneOfVoice: data.analysis.brandVoice,
        niche: data.analysis.industry,
        productType: data.analysis.productType,
        products: data.analysis.products.map((p: URLBrandAnalysis['products'][0]) => ({
          name: p.name,
          price: p.price,
          description: p.description,
          imageUrl: p.image,
        })),
        uniqueSellingPoints: data.analysis.uniqueSellingPoints,
        targetAudience: data.analysis.targetAudience,
        socialLinks: Object.values(data.scrapedData?.socialLinks || {}) as string[],
        confidence: {
          brandName: 0.9,
          colors: 0.8,
          products: 0.9,
          overall: 0.85,
        },
      });
      
      setCurrentStep(2);
      toast.success('Website analyzed!', { 
        description: `Found ${data.analysis.products.length} products for ${data.analysis.brandName}` 
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze website';
      throw new Error(message);
    }
  };

  // Handle brand review submission - URL flow
  const handleBrandReviewSubmit = (updatedBrandInfo: ExtractedBrandInfo) => {
    setExtractedBrandInfo(updatedBrandInfo);
    
    // Also update urlBrandAnalysis with any edits
    if (urlBrandAnalysis) {
      setUrlBrandAnalysis({
        ...urlBrandAnalysis,
        brandName: updatedBrandInfo.brandName,
        tagline: updatedBrandInfo.tagline || urlBrandAnalysis.tagline,
        industry: updatedBrandInfo.industry,
        brandVoice: updatedBrandInfo.description || urlBrandAnalysis.brandVoice,
        primaryColor: updatedBrandInfo.primaryColor || urlBrandAnalysis.primaryColor,
        secondaryColor: updatedBrandInfo.secondaryColor || urlBrandAnalysis.secondaryColor,
      });
    }
    
    setCurrentStep(3); // Go to product selection
  };

  // Handle product selection - URL flow with NEW pipeline
  const handleProductSelectionSubmit = async (
    selectedProducts: ExtractedBrandInfo['products'],
    aspectRatio: AspectRatio
  ) => {
    if (!urlBrandAnalysis) return;
    
    setUrlAspectRatio(aspectRatio);
    
    // Map selected products to urlBrandAnalysis format
    const urlProducts = selectedProducts.map(p => {
      // Find matching product in urlBrandAnalysis for full data
      const fullProduct = urlBrandAnalysis.products.find(up => up.name === p.name);
      return fullProduct || {
        name: p.name,
        price: p.price || null,
        description: p.description || `Quality ${p.name}`,
        image: p.imageUrl || null,
        keyFeatures: [],
        suggestedAdAngle: `Highlight the quality of ${p.name}`,
      };
    });
    
    setUrlSelectedProducts(urlProducts);
    setCurrentStep(4);
    
    // Generate ad ideas using NEW URL-specific ideation
    await generateURLIdeas(urlProducts);
  };

  // NEW: Generate ideas using URL-specific ideation API
  const generateURLIdeas = async (products: URLBrandAnalysis['products']) => {
    if (!urlBrandAnalysis) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/url-ideation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: urlBrandAnalysis,
          selectedProducts: products,
          platforms: urlBrandAnalysis.adRecommendations?.bestPlatforms || ['Instagram', 'Facebook'],
          adsPerProduct: 5,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate ad ideas');
      }

      const data = await response.json();
      setUrlAdIdeas(data.ideas);
      toast.success(`Generated ${data.ideas.length} ad ideas!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      toast.error('Failed to generate ideas', { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Handle URL idea selection and generate ads
  const handleURLIdeasSelected = async (selected: URLAdIdea[]) => {
    setUrlSelectedIdeas(selected);
    setCurrentStep(5);
    await generateURLAds(selected);
  };

  // NEW: Generate ads using URL-specific generation API
  const generateURLAds = async (selectedIdeas: URLAdIdea[]) => {
    if (!urlBrandAnalysis) return;

    setIsLoading(true);
    setError(null);

    try {
      toast.info('Creating your ads...', { description: 'This may take 30-60 seconds' });

      const response = await fetch('/api/url-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideas: selectedIdeas,
          aspectRatio: urlAspectRatio,
          brandName: urlBrandAnalysis.brandName,
          brandColors: {
            primary: urlBrandAnalysis.primaryColor,
            secondary: urlBrandAnalysis.secondaryColor,
            accent: urlBrandAnalysis.accentColor,
          },
          logoUrl: extractedBrandInfo?.logoUrl,
          productType: urlBrandAnalysis.productType || 'physical',
          industry: urlBrandAnalysis.industry || 'General',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate ads');
      }

      const data = await response.json();
      setUrlGeneratedAds(data.ads);
      setCurrentStep(6);
      toast.success(`Successfully generated ${data.ads.length} ads!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      toast.error('Failed to generate ads', { description: message });
      setCurrentStep(4); // Go back to ideas on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleBusinessDetailsSubmit = (details: BusinessDetails) => {
    setBusinessDetails(details);
    setCurrentStep(2);
  };

  const handleBrandInfoSubmit = (slogan: string, pricing: string, adCopyPoints: string) => {
    if (businessDetails) {
      setBusinessDetails({
        ...businessDetails,
        brandSlogan: slogan || undefined,
        pricingInfo: pricing || undefined,
        adCopyPoints: adCopyPoints || undefined,
      });
    }
    setCurrentStep(3);
  };

  const handleBrandAssetsSubmit = (assets: BrandAssets) => {
    if (businessDetails) {
      setBusinessDetails({
        ...businessDetails,
        brandAssets: assets,
      });
    }
    setCurrentStep(4);
    generateIdeas();
  };

  const handleBrandAssetsSkip = () => {
    setCurrentStep(4);
    generateIdeas();
  };

  const generateIdeas = async () => {
    if (!businessDetails) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ideation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(businessDetails),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate ideas');
      }

      const data = await response.json();
      setIdeas(data.ideas);
      toast.success('Generated 5 campaign ideas!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      toast.error('Failed to generate ideas', { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdeasSelected = async (selected: MarketingIdea[]) => {
    setSelectedIdeas(selected);
    setCurrentStep(5);
    await generateAds(selected);
  };

  const generateAds = async (selected: MarketingIdea[]) => {
    if (!businessDetails) return;

    setIsLoading(true);
    setError(null);

    try {
      toast.info('Creating your ads...', { description: 'This may take 30-60 seconds' });
      
      // First, expand ideas to prompts
      const promptsResponse = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedIdeas: selected,
          projectDetails: businessDetails,
        }),
      });

      if (!promptsResponse.ok) {
        const errorData = await promptsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate prompts');
      }

      const promptsData = await promptsResponse.json();

      // Then generate images
      const generationResponse = await fetch('/api/generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: promptsData.prompts,
          brandName: businessDetails.businessName,
          slogan: businessDetails.brandSlogan,
          pricing: businessDetails.pricingInfo,
          adCopyPoints: businessDetails.adCopyPoints,
          productType: businessDetails.productType,
          industry: businessDetails.industry,
          niche: businessDetails.niche,
          aspectRatio: businessDetails.aspectRatio || '1:1',
          brandAssets: businessDetails.brandAssets,
        }),
      });

      if (!generationResponse.ok) {
        const errorData = await generationResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate ads');
      }

      const generationData = await generationResponse.json();
      setGeneratedAds(generationData.images);
      setCurrentStep(6);
      toast.success(`Successfully generated ${generationData.images.length} ads!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      toast.error('Failed to generate ads', { description: message });
      setCurrentStep(4); // Go back to selection on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOver = () => {
    setEntryFlow(null); // Go back to entry choice
    setCurrentStep(1);
    setBusinessDetails(null);
    setIdeas([]);
    setSelectedIdeas([]);
    setGeneratedAds([]);
    setError(null);
    // Reset URL flow state
    setScrapedURL(null);
    setExtractedBrandInfo(null);
    // Reset NEW URL pipeline state
    setUrlBrandAnalysis(null);
    setUrlSelectedProducts([]);
    setUrlAdIdeas([]);
    setUrlSelectedIdeas([]);
    setUrlGeneratedAds([]);
    setUrlAspectRatio('1:1');
  };

  // Go back to entry choice from step 1
  const handleBackToChoice = () => {
    setEntryFlow(null);
    setCurrentStep(1);
    // Reset URL flow state when going back
    setScrapedURL(null);
    setExtractedBrandInfo(null);
  };

  const handleRegenerateAd = async (ad: GeneratedAd): Promise<GeneratedAd | null> => {
    if (!businessDetails) return null;

    try {
      // Create a single prompt from the existing ad
      const singlePrompt = {
        ideaId: ad.ideaId,
        ideaTitle: ad.ideaTitle,
        prompt: ad.prompt,
      };

      // Generate just this one image
      const generationResponse = await fetch('/api/generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: [singlePrompt],
          brandName: businessDetails.businessName,
          slogan: businessDetails.brandSlogan,
          pricing: businessDetails.pricingInfo,
          productType: businessDetails.productType,
          aspectRatio: businessDetails.aspectRatio || '1:1',
        }),
      });

      if (!generationResponse.ok) {
        throw new Error('Failed to regenerate');
      }

      const data = await generationResponse.json();
      if (data.images && data.images.length > 0) {
        // Return the new ad with the original ID so it replaces correctly
        return { ...data.images[0], id: ad.id };
      }
      return null;
    } catch (error) {
      console.error('Regeneration error:', error);
      return null;
    }
  };

  return (
    <div className="container max-w-4xl py-6 md:py-10 px-4">
      {/* Entry Choice Screen - No progress bar */}
      {!entryFlow && (
        <div className="bg-card border rounded-xl p-6 md:p-8">
          <EntryChoiceStep 
            onChooseURL={handleChooseURL}
            onChooseManual={handleChooseManual}
            onChooseBackground={handleChooseBackground}
          />
        </div>
      )}

      {/* Flow in progress - Show progress bar and steps */}
      {entryFlow && (
        <>
          {/* Progress Header - Only for URL and Manual flows */}
          {entryFlow !== 'background' && (
            <div className="mb-6 md:mb-8">
              {/* Mobile: Show current step only */}
              <div className="flex md:hidden justify-between items-center mb-2">
                <span className="text-sm font-medium text-primary">
                  Step {currentStep}: {STEPS[currentStep - 1]?.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {currentStep}/{STEPS.length}
                </span>
              </div>
              
              {/* Desktop: Show all steps */}
              <div className="hidden md:flex justify-between mb-2">
                {STEPS.map((step) => (
                  <div 
                    key={step.id}
                    className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {step.name}
                  </div>
                ))}
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Step Content */}
          <div className="bg-card border rounded-xl p-6 md:p-8">
            {/* ===== MANUAL FLOW STEPS ===== */}
            {entryFlow === 'manual' && (
              <>
                {currentStep === 1 && (
                  <BusinessDetailsStep 
                    onSubmit={handleBusinessDetailsSubmit}
                    onBack={handleBackToChoice}
                  />
                )}

                {currentStep === 2 && businessDetails && (
                  <BrandInfoStep 
                    businessName={businessDetails.businessName}
                    productType={businessDetails.productType}
                    onSubmit={handleBrandInfoSubmit}
                    onBack={() => setCurrentStep(1)}
                  />
                )}

                {currentStep === 3 && businessDetails && (
                  <BrandAssetsStep
                    productType={businessDetails.productType}
                    businessName={businessDetails.businessName}
                    onSubmit={handleBrandAssetsSubmit}
                    onBack={() => setCurrentStep(2)}
                    onSkip={handleBrandAssetsSkip}
                  />
                )}

                {currentStep === 4 && (
                  <SelectIdeasStep
                    ideas={ideas}
                    isLoading={isLoading}
                    onSubmit={handleIdeasSelected}
                    onBack={() => setCurrentStep(3)}
                  />
                )}

                {currentStep === 5 && (
                  <GeneratingStep selectedCount={selectedIdeas.length} />
                )}

                {currentStep === 6 && businessDetails && (
                  <ResultsStep 
                    ads={generatedAds}
                    onStartOver={handleStartOver}
                    aspectRatio={businessDetails.aspectRatio}
                    onRegenerate={handleRegenerateAd}
                    businessDetails={businessDetails}
                  />
                )}
              </>
            )}

            {/* ===== URL FLOW STEPS (NEW DEDICATED PIPELINE) ===== */}
            {entryFlow === 'url' && (
              <>
                {currentStep === 1 && (
                  <URLInputStep
                    onSubmit={handleURLSubmit}
                    onBack={handleBackToChoice}
                  />
                )}

                {/* Step 2: Brand Review */}
                {currentStep === 2 && extractedBrandInfo && scrapedURL && (
                  <BrandReviewStep
                    brandInfo={extractedBrandInfo}
                    websiteUrl={scrapedURL}
                    onSubmit={handleBrandReviewSubmit}
                    onBack={() => setCurrentStep(1)}
                  />
                )}

                {/* Step 3: Product Selection */}
                {currentStep === 3 && extractedBrandInfo && (
                  <ProductSelectionStep
                    brandInfo={extractedBrandInfo}
                    onSubmit={handleProductSelectionSubmit}
                    onBack={() => setCurrentStep(2)}
                  />
                )}

                {/* Step 4: URL-specific Ad Ideas */}
                {currentStep === 4 && (
                  <URLIdeasStep
                    ideas={urlAdIdeas}
                    isLoading={isLoading}
                    onSubmit={handleURLIdeasSelected}
                    onBack={() => setCurrentStep(3)}
                    brandColors={urlBrandAnalysis ? {
                      primary: urlBrandAnalysis.primaryColor,
                      secondary: urlBrandAnalysis.secondaryColor,
                      accent: urlBrandAnalysis.accentColor,
                    } : undefined}
                  />
                )}

                {/* Step 5: Generating */}
                {currentStep === 5 && (
                  <GeneratingStep selectedCount={urlSelectedIdeas.length} />
                )}

                {/* Step 6: URL-specific Results */}
                {currentStep === 6 && urlBrandAnalysis && (
                  <URLResultsStep 
                    ads={urlGeneratedAds}
                    brandName={urlBrandAnalysis.brandName}
                    aspectRatio={urlAspectRatio}
                    onStartOver={handleStartOver}
                    onUpdateAd={(adId, newImageData) => {
                      setUrlGeneratedAds(prev => 
                        prev.map(ad => 
                          ad.id === adId 
                            ? { ...ad, imageData: newImageData }
                            : ad
                        )
                      );
                    }}
                  />
                )}
              </>
            )}

            {/* ===== BACKGROUND FLOW (NO TEXT - FOR DESIGNERS) ===== */}
            {entryFlow === 'background' && (
              <BackgroundGenerator onBack={handleBackToChoice} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
