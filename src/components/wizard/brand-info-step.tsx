'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Lightbulb } from 'lucide-react';

interface BrandInfoStepProps {
  businessName: string;
  onSubmit: (slogan: string, pricing: string) => void;
  onBack: () => void;
}

export function BrandInfoStep({ businessName, onSubmit, onBack }: BrandInfoStepProps) {
  const [slogan, setSlogan] = useState('');
  const [pricing, setPricing] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(slogan, pricing);
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
