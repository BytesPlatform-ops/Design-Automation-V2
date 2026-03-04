'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  CheckCircle2,
  Edit2,
  Palette,
  Target,
  Sparkles,
  Building2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { ExtractedBrandInfo } from '@/lib/brand-analyzer';
import { ProductType } from '@/types';

interface BrandReviewStepProps {
  brandInfo: ExtractedBrandInfo;
  websiteUrl: string;
  onSubmit: (updatedBrandInfo: ExtractedBrandInfo) => void;
  onBack: () => void;
}

export function BrandReviewStep({
  brandInfo: initialBrandInfo,
  websiteUrl,
  onSubmit,
  onBack,
}: BrandReviewStepProps) {
  const [brandInfo, setBrandInfo] = useState<ExtractedBrandInfo>(initialBrandInfo);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  // Helpers to update nested state
  const updateField = <K extends keyof ExtractedBrandInfo>(
    key: K,
    value: ExtractedBrandInfo[K]
  ) => {
    setBrandInfo((prev) => ({ ...prev, [key]: value }));
  };

  const updateUSP = (index: number, value: string) => {
    const newUSPs = [...brandInfo.uniqueSellingPoints];
    newUSPs[index] = value;
    updateField('uniqueSellingPoints', newUSPs);
  };

  const addUSP = () => {
    updateField('uniqueSellingPoints', [...brandInfo.uniqueSellingPoints, '']);
  };

  const removeUSP = (index: number) => {
    const newUSPs = brandInfo.uniqueSellingPoints.filter((_, i) => i !== index);
    updateField('uniqueSellingPoints', newUSPs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(brandInfo);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-500';
    if (score >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return 'High confidence';
    if (score >= 0.5) return 'Moderate confidence';
    return 'Low confidence - please verify';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 mb-4">
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold">Review Extracted Brand</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          We analyzed{' '}
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-500 hover:underline inline-flex items-center gap-1"
          >
            {new URL(websiteUrl).hostname}
            <ExternalLink className="w-3 h-3" />
          </a>
          . Review and edit the extracted information below.
        </p>
      </div>

      {/* Confidence Overview */}
      <div className="bg-muted/50 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Extraction Confidence:</span>
            <Badge
              variant="outline"
              className={getConfidenceColor(brandInfo.confidence.overall)}
            >
              {Math.round(brandInfo.confidence.overall * 100)}%
            </Badge>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>
              Brand: <span className={getConfidenceColor(brandInfo.confidence.brandName)}>
                {Math.round(brandInfo.confidence.brandName * 100)}%
              </span>
            </span>
            <span>
              Colors: <span className={getConfidenceColor(brandInfo.confidence.colors)}>
                {Math.round(brandInfo.confidence.colors * 100)}%
              </span>
            </span>
            <span>
              Products: <span className={getConfidenceColor(brandInfo.confidence.products)}>
                {Math.round(brandInfo.confidence.products * 100)}%
              </span>
            </span>
          </div>
        </div>
        {brandInfo.confidence.overall < 0.5 && (
          <div className="mt-3 flex items-start gap-2 text-sm text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Some information may be incomplete. Please review and correct any inaccuracies.
            </span>
          </div>
        )}
      </div>

      {/* Brand Identity Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-500" />
            Brand Identity
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setEditingSection(editingSection === 'identity' ? null : 'identity')
            }
          >
            <Edit2 className="w-4 h-4 mr-1" />
            {editingSection === 'identity' ? 'Done' : 'Edit'}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="brandName">Brand Name</Label>
            <Input
              id="brandName"
              value={brandInfo.brandName}
              onChange={(e) => updateField('brandName', e.target.value)}
              disabled={editingSection !== 'identity'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline / Slogan</Label>
            <Input
              id="tagline"
              value={brandInfo.tagline || ''}
              onChange={(e) => updateField('tagline', e.target.value || null)}
              placeholder="Enter tagline if available"
              disabled={editingSection !== 'identity'}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Brand Description</Label>
            <Textarea
              id="description"
              value={brandInfo.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              disabled={editingSection !== 'identity'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={brandInfo.industry}
              onChange={(e) => updateField('industry', e.target.value)}
              disabled={editingSection !== 'identity'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="niche">Niche</Label>
            <Input
              id="niche"
              value={brandInfo.niche}
              onChange={(e) => updateField('niche', e.target.value)}
              disabled={editingSection !== 'identity'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="productType">Product Type</Label>
            <Select
              value={brandInfo.productType}
              onValueChange={(value: ProductType) => updateField('productType', value)}
              disabled={editingSection !== 'identity'}
            >
              <SelectTrigger id="productType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="physical">Physical Product</SelectItem>
                <SelectItem value="digital">Digital Product</SelectItem>
                <SelectItem value="service">Service</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Visual Identity Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-500" />
            Visual Identity
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setEditingSection(editingSection === 'visual' ? null : 'visual')
            }
          >
            <Edit2 className="w-4 h-4 mr-1" />
            {editingSection === 'visual' ? 'Done' : 'Edit'}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded-lg border"
                style={{ backgroundColor: brandInfo.primaryColor }}
              />
              <Input
                id="primaryColor"
                value={brandInfo.primaryColor}
                onChange={(e) => updateField('primaryColor', e.target.value)}
                placeholder="#000000"
                disabled={editingSection !== 'visual'}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondaryColor">Secondary Color</Label>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded-lg border"
                style={{ backgroundColor: brandInfo.secondaryColor }}
              />
              <Input
                id="secondaryColor"
                value={brandInfo.secondaryColor}
                onChange={(e) => updateField('secondaryColor', e.target.value)}
                placeholder="#ffffff"
                disabled={editingSection !== 'visual'}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accentColor">Accent Color</Label>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded-lg border"
                style={{ backgroundColor: brandInfo.accentColor || 'transparent' }}
              />
              <Input
                id="accentColor"
                value={brandInfo.accentColor || ''}
                onChange={(e) => updateField('accentColor', e.target.value || null)}
                placeholder="Optional"
                disabled={editingSection !== 'visual'}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {brandInfo.logoUrl && (
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <img
              src={brandInfo.logoUrl}
              alt="Brand logo"
              className="w-16 h-16 object-contain rounded-lg bg-white"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div>
              <p className="text-sm font-medium">Logo Detected</p>
              <p className="text-xs text-muted-foreground truncate max-w-xs">
                {brandInfo.logoUrl}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Brand Voice Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            Brand Voice & Audience
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setEditingSection(editingSection === 'voice' ? null : 'voice')
            }
          >
            <Edit2 className="w-4 h-4 mr-1" />
            {editingSection === 'voice' ? 'Done' : 'Edit'}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="toneOfVoice">Tone of Voice</Label>
            <Input
              id="toneOfVoice"
              value={brandInfo.toneOfVoice}
              onChange={(e) => updateField('toneOfVoice', e.target.value)}
              placeholder="e.g., Professional, friendly, bold"
              disabled={editingSection !== 'voice'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Input
              id="targetAudience"
              value={brandInfo.targetAudience}
              onChange={(e) => updateField('targetAudience', e.target.value)}
              placeholder="e.g., Young professionals, 25-40"
              disabled={editingSection !== 'voice'}
            />
          </div>
        </div>
      </div>

      {/* USPs Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Unique Selling Points
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditingSection(editingSection === 'usp' ? null : 'usp')}
          >
            <Edit2 className="w-4 h-4 mr-1" />
            {editingSection === 'usp' ? 'Done' : 'Edit'}
          </Button>
        </div>

        <div className="space-y-2">
          {brandInfo.uniqueSellingPoints.map((usp, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={usp}
                onChange={(e) => updateUSP(index, e.target.value)}
                placeholder={`USP ${index + 1}`}
                disabled={editingSection !== 'usp'}
              />
              {editingSection === 'usp' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeUSP(index)}
                  className="text-red-500 hover:text-red-600"
                >
                  ×
                </Button>
              )}
            </div>
          ))}
          {editingSection === 'usp' && brandInfo.uniqueSellingPoints.length < 6 && (
            <Button type="button" variant="outline" size="sm" onClick={addUSP}>
              + Add USP
            </Button>
          )}
        </div>
      </div>

      {/* Products Preview */}
      {brandInfo.products.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">
            Products/Services Found ({brandInfo.products.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {brandInfo.products.slice(0, 4).map((product, index) => (
              <div
                key={index}
                className="flex gap-3 p-3 border rounded-lg bg-muted/30"
              >
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  {product.price && (
                    <p className="text-xs text-purple-500">{product.price}</p>
                  )}
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {product.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {brandInfo.products.length > 4 && (
            <p className="text-sm text-muted-foreground">
              +{brandInfo.products.length - 4} more products will be available in next step
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" size="lg" onClick={onBack}>
          ← Back
        </Button>
        <Button type="submit" className="flex-1" size="lg">
          Continue to Product Selection
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </form>
  );
}
