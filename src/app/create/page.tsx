'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { BusinessDetailsStep } from '@/components/wizard/business-details-step';
import { BrandInfoStep } from '@/components/wizard/brand-info-step';
import { BrandAssetsStep } from '@/components/wizard/brand-assets-step';
import { SelectIdeasStep } from '@/components/wizard/select-ideas-step';
import { GeneratingStep } from '@/components/wizard/generating-step';
import { ResultsStep } from '@/components/wizard/results-step';
import { Progress } from '@/components/ui/progress';
import { BusinessDetails, MarketingIdea, GeneratedAd, BrandAssets } from '@/types';

const STEPS = [
  { id: 1, name: 'Business Details' },
  { id: 2, name: 'Brand Info' },
  { id: 3, name: 'Brand Assets' },
  { id: 4, name: 'Select Ideas' },
  { id: 5, name: 'Generating' },
  { id: 6, name: 'Results' },
];

export default function CreatePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails | null>(null);
  const [ideas, setIdeas] = useState<MarketingIdea[]>([]);
  const [selectedIdeas, setSelectedIdeas] = useState<MarketingIdea[]>([]);
  const [generatedAds, setGeneratedAds] = useState<GeneratedAd[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = (currentStep / STEPS.length) * 100;

  const handleBusinessDetailsSubmit = (details: BusinessDetails) => {
    setBusinessDetails(details);
    setCurrentStep(2);
  };

  const handleBrandInfoSubmit = (slogan: string, pricing: string) => {
    if (businessDetails) {
      setBusinessDetails({
        ...businessDetails,
        brandSlogan: slogan || undefined,
        pricingInfo: pricing || undefined,
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
          productType: businessDetails.productType,
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
    setCurrentStep(1);
    setBusinessDetails(null);
    setIdeas([]);
    setSelectedIdeas([]);
    setGeneratedAds([]);
    setError(null);
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
      {/* Progress Header */}
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

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="bg-card border rounded-xl p-6 md:p-8">
        {currentStep === 1 && (
          <BusinessDetailsStep onSubmit={handleBusinessDetailsSubmit} />
        )}

        {currentStep === 2 && businessDetails && (
          <BrandInfoStep 
            businessName={businessDetails.businessName}
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

        {currentStep === 6 && (
          <ResultsStep 
            ads={generatedAds}
            onStartOver={handleStartOver}
            aspectRatio={businessDetails?.aspectRatio}
            onRegenerate={handleRegenerateAd}
          />
        )}
      </div>
    </div>
  );
}
