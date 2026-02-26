'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Lightbulb, ListChecks } from 'lucide-react';
import { ProductType } from '@/types';

interface BrandInfoStepProps {
  businessName: string;
  productType: ProductType;
  onSubmit: (slogan: string, pricing: string, adCopyPoints: string) => void;
  onBack: () => void;
}

export function BrandInfoStep({ businessName, productType, onSubmit, onBack }: BrandInfoStepProps) {
  const [slogan, setSlogan] = useState('');
  const [pricing, setPricing] = useState('');
  const [adCopyPoints, setAdCopyPoints] = useState('');

  const showAdCopyPoints = productType === 'service' || productType === 'digital';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(slogan, pricing, adCopyPoints);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Brand Details for {businessName}</h2>
        <p className="text-muted-foreground">
          Add your slogan and pricing to embed in your ads. These are optional - 
          our AI can generate compelling text if you skip.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
        <div className="flex gap-3">
          <Lightbulb className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Pro tip:</strong> Ads with specific pricing and catchy slogans 
            tend to perform better. Consider including both for maximum impact!
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="slogan">Brand Slogan (Optional)</Label>
          <Textarea
            id="slogan"
            placeholder="e.g., 'Fuel Your Focus' or 'Quality You Can Taste'"
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            A catchy tagline that represents your brand. Will be prominently displayed in ads.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pricing">Pricing Information (Optional)</Label>
          <Input
            id="pricing"
            placeholder="e.g., 'Starting at $9.99' or 'From $49/month'"
            value={pricing}
            onChange={(e) => setPricing(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Include currency and any context (e.g., &quot;Starting at&quot;, &quot;Only&quot;, &quot;From&quot;).
          </p>
        </div>

        {/* Ad Copy Points — only for Service & Digital products */}
        {showAdCopyPoints && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-purple-500" />
              <Label htmlFor="adCopyPoints">Key Selling Points for Ad (Optional)</Label>
            </div>
            <Textarea
              id="adCopyPoints"
              placeholder={productType === 'service' 
                ? `e.g.,\nLive interactive sessions\nFlexible scheduling from anywhere\nExpert certified instructors\nFree consultation available`
                : `e.g.,\nCreate invoices in 30 seconds\nAuto payment reminders\nMulti-currency support\nFree forever plan available`
              }
              value={adCopyPoints}
              onChange={(e) => setAdCopyPoints(e.target.value)}
              rows={5}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              List key features, benefits, or bullet points you want displayed on the ad. 
              {productType === 'service' 
                ? ' Great for highlighting what makes your service unique — these will appear as text overlay on your ad.'
                : ' Perfect for showcasing your product features — these will appear as text overlay on your ad.'
              }
            </p>
            <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-3">
              <p className="text-xs text-purple-700 dark:text-purple-300">
                💡 <strong>Works best with 3-5 short bullet points.</strong> The AI will arrange them beautifully in your ad alongside your slogan and branding.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" className="flex-1" size="lg">
          Generate Ideas
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
