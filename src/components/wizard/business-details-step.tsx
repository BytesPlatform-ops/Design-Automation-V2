'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BusinessDetails, ProductType, AspectRatio } from '@/types';
import { ArrowRight, Store, Briefcase, Monitor, Square, RectangleVertical, RectangleHorizontal } from 'lucide-react';

const INDUSTRIES = [
  'Food & Beverage',
  'Fashion & Apparel',
  'Health & Wellness',
  'Beauty & Personal Care',
  'Technology',
  'Education',
  'Real Estate',
  'Finance & Insurance',
  'Travel & Hospitality',
  'Entertainment',
  'Fitness & Sports',
  'Home & Garden',
  'Automotive',
  'Professional Services',
  'E-commerce',
  'Other',
];

const PRODUCT_TYPES: { value: ProductType; label: string; icon: any; description: string }[] = [
  {
    value: 'physical',
    label: 'Physical Product',
    icon: Store,
    description: 'Tangible items like food, apparel, electronics',
  },
  {
    value: 'service',
    label: 'Service',
    icon: Briefcase,
    description: 'Intangible offerings like consulting, salons, agencies',
  },
  {
    value: 'digital',
    label: 'Digital Product',
    icon: Monitor,
    description: 'Software, courses, eBooks, digital downloads',
  },
];

const ASPECT_RATIOS: { value: AspectRatio; label: string; icon: any; description: string; platforms: string }[] = [
  {
    value: '1:1',
    label: 'Square (1:1)',
    icon: Square,
    description: '1024 × 1024 px',
    platforms: 'Instagram Feed, Facebook Feed',
  },
  {
    value: '4:5',
    label: 'Portrait (4:5)',
    icon: RectangleVertical,
    description: '1024 × 1280 px',
    platforms: 'Instagram Feed, Facebook Feed',
  },
  {
    value: '9:16',
    label: 'Story (9:16)',
    icon: RectangleVertical,
    description: '1024 × 1820 px',
    platforms: 'Instagram/Facebook Stories, Reels, TikTok',
  },
  {
    value: '16:9',
    label: 'Landscape (16:9)',
    icon: RectangleHorizontal,
    description: '1820 × 1024 px',
    platforms: 'YouTube Thumbnails, Twitter/X, LinkedIn',
  },
];

interface BusinessDetailsStepProps {
  onSubmit: (details: BusinessDetails) => void;
}

export function BusinessDetailsStep({ onSubmit }: BusinessDetailsStepProps) {
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [niche, setNiche] = useState('');
  const [productType, setProductType] = useState<ProductType | ''>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');

  const isValid = businessName && industry && niche && productType;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    onSubmit({
      businessName,
      industry,
      niche,
      productType: productType as ProductType,
      aspectRatio,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Tell us about your business</h2>
        <p className="text-muted-foreground">
          We&apos;ll use this information to create tailored marketing campaign ideas.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name *</Label>
          <Input
            id="businessName"
            placeholder="e.g., Byte's Coffee House"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Industry *</Label>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger>
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="niche">Niche / Specialty *</Label>
          <Input
            id="niche"
            placeholder="e.g., Artisan cold brew coffee for remote workers"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Be specific! The more detail you provide, the better your ads will be.
          </p>
        </div>

        <div className="space-y-3">
          <Label>What do you sell? *</Label>
          <div className="grid gap-3">
            {PRODUCT_TYPES.map((type) => (
              <div
                key={type.value}
                className={`relative flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors ${
                  productType === type.value
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setProductType(type.value)}
              >
                <div className={`rounded-lg p-2 ${
                  productType === type.value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <type.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-sm text-muted-foreground">{type.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Image Aspect Ratio</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Choose the best format for your target platform
          </p>
          <div className="grid grid-cols-2 gap-3">
            {ASPECT_RATIOS.map((ratio) => (
              <div
                key={ratio.value}
                className={`relative flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors ${
                  aspectRatio === ratio.value
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setAspectRatio(ratio.value)}
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${
                    aspectRatio === ratio.value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <ratio.icon className="h-4 w-4" />
                  </div>
                  <div className="font-medium text-sm">{ratio.label}</div>
                </div>
                <div className="text-xs text-muted-foreground">{ratio.description}</div>
                <div className="text-xs text-primary/80">{ratio.platforms}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={!isValid}>
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </form>
  );
}
