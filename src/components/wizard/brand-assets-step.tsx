'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { BrandAssets, ProductType } from '@/types';
import { 
  ArrowLeft, 
  ArrowRight, 
  Upload, 
  Image as ImageIcon, 
  Palette,
  X,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface BrandAssetsStepProps {
  productType: ProductType;
  businessName: string;
  onSubmit: (assets: BrandAssets) => void;
  onBack: () => void;
  onSkip: () => void;
}

const PRODUCT_TYPE_TIPS: Record<ProductType, { imageLabel: string; imageTip: string; examples: string }> = {
  physical: {
    imageLabel: 'Product Photo',
    imageTip: 'Upload a high-quality photo of your product. This will be the star of your ad.',
    examples: 'e.g., Product on white background, product in use, lifestyle shot'
  },
  service: {
    imageLabel: 'Service Image',
    imageTip: 'Upload a photo representing your service - team photo, work sample, or happy customer.',
    examples: 'e.g., Before/after, team at work, customer testimonial photo'
  },
  digital: {
    imageLabel: 'Screenshot / UI',
    imageTip: 'Upload a screenshot of your app, website, or digital product interface.',
    examples: 'e.g., App screenshot, dashboard view, landing page'
  }
};

const PRESET_COLORS = [
  { name: 'Blue', primary: '#3B82F6', secondary: '#1E40AF' },
  { name: 'Green', primary: '#22C55E', secondary: '#15803D' },
  { name: 'Purple', primary: '#8B5CF6', secondary: '#6D28D9' },
  { name: 'Red', primary: '#EF4444', secondary: '#B91C1C' },
  { name: 'Orange', primary: '#F97316', secondary: '#C2410C' },
  { name: 'Pink', primary: '#EC4899', secondary: '#BE185D' },
  { name: 'Teal', primary: '#14B8A6', secondary: '#0F766E' },
  { name: 'Gold', primary: '#EAB308', secondary: '#A16207' },
];

export function BrandAssetsStep({ productType, businessName, onSubmit, onBack, onSkip }: BrandAssetsStepProps) {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [productImageUrl, setProductImageUrl] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<string>('#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState<string>('#1E40AF');
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

  const tips = PRODUCT_TYPE_TIPS[productType];

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    setUrl: (url: string) => void
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    const assets: BrandAssets = {};
    
    if (logoUrl) assets.logoUrl = logoUrl;
    if (productImageUrl) assets.productImageUrl = productImageUrl;
    if (primaryColor) assets.primaryColor = primaryColor;
    if (secondaryColor) assets.secondaryColor = secondaryColor;
    
    onSubmit(assets);
  };

  const selectPresetColors = (preset: typeof PRESET_COLORS[0]) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
  };

  const hasAnyAsset = logoUrl || productImageUrl;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" />
          Brand Assets
        </h2>
        <p className="text-muted-foreground">
          Upload your brand assets for more personalized, professional ads. 
          <span className="text-primary font-medium"> All fields are optional.</span>
        </p>
      </div>

      {/* Tip Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4 flex gap-3">
        <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-200">Pro Tip for {productType} products</p>
          <p className="text-amber-700 dark:text-amber-300">{tips.imageTip}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Logo Upload */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Logo (Optional)</Label>
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              logoUrl ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onClick={() => logoInputRef.current?.click()}
          >
            {logoUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={logoUrl} 
                  alt="Logo preview" 
                  className="max-h-24 mx-auto object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLogoUrl('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload logo</p>
                <p className="text-xs text-muted-foreground/70 mt-1">PNG, JPG up to 5MB</p>
              </>
            )}
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileUpload(e, setLogoUrl)}
          />
        </div>

        {/* Product/Service Image Upload */}
        <div className="space-y-3">
          <Label className="text-base font-medium">{tips.imageLabel} (Recommended)</Label>
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              productImageUrl ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onClick={() => productInputRef.current?.click()}
          >
            {productImageUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={productImageUrl} 
                  alt="Product preview" 
                  className="max-h-24 mx-auto object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProductImageUrl('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload {tips.imageLabel.toLowerCase()}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{tips.examples}</p>
              </>
            )}
          </div>
          <input
            ref={productInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileUpload(e, setProductImageUrl)}
          />
        </div>
      </div>

      {/* Brand Colors */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Brand Colors (Optional)</Label>
        
        {/* Preset Colors */}
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset.name}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all ${
                primaryColor === preset.primary
                  ? 'border-primary bg-primary/10 font-medium'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => selectPresetColors(preset)}
            >
              <div 
                className="w-4 h-4 rounded-full border border-white/20"
                style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }}
              />
              {preset.name}
            </button>
          ))}
        </div>

        {/* Custom Color Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryColor" className="text-sm">Primary Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                id="primaryColor"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#3B82F6"
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryColor" className="text-sm">Secondary Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                id="secondaryColor"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#1E40AF"
                className="font-mono"
              />
            </div>
          </div>
        </div>

        {/* Color Preview */}
        <div 
          className="h-16 rounded-lg flex items-center justify-center text-white font-semibold text-lg"
          style={{ 
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` 
          }}
        >
          {businessName}
        </div>
      </div>

      {/* No Assets Warning */}
      {!hasAnyAsset && (
        <div className="bg-muted/50 border rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium">No images uploaded</p>
            <p>AI will generate creative visuals based on your description. For best results, upload your actual product/logo.</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onSkip}
          className="text-muted-foreground"
        >
          Skip for now
        </Button>
        <Button onClick={handleSubmit} className="flex-1">
          Continue with Assets
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
