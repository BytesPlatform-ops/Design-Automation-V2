'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowRight,
  Package,
  Check,
  Image as ImageIcon,
  Sparkles,
  Plus,
  X,
} from 'lucide-react';
import { ExtractedBrandInfo } from '@/lib/brand-analyzer';
import { AspectRatio } from '@/types';

interface ProductSelectionStepProps {
  brandInfo: ExtractedBrandInfo;
  onSubmit: (selectedProducts: ExtractedBrandInfo['products'], aspectRatio: AspectRatio) => void;
  onBack: () => void;
}

// Helper to check if price is valid (not 0, rs.0, free, empty, etc.)
const isValidPrice = (price: string | null | undefined): boolean => {
  if (!price) return false;
  const normalizedPrice = price.toLowerCase().replace(/[^a-z0-9.]/g, '');
  // Invalid if: empty, "0", "rs0", "rs.0", "free", "0.00", etc.
  if (normalizedPrice === '' || normalizedPrice === '0' || normalizedPrice === 'rs0' || 
      normalizedPrice === 'free' || normalizedPrice === '0.00' || normalizedPrice === '000' ||
      /^rs?\\.?0+$/.test(normalizedPrice)) {
    return false;
  }
  return true;
};

export function ProductSelectionStep({
  brandInfo,
  onSubmit,
  onBack,
}: ProductSelectionStepProps) {
  const [allProducts, setAllProducts] = useState(brandInfo.products);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(brandInfo.products.slice(0, 3).map((_, i) => i)) // Default select first 3
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [showAddForm, setShowAddForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');

  const toggleProduct = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      // Max 5 products
      if (newSelected.size < 5) {
        newSelected.add(index);
      }
    }
    setSelectedIndices(newSelected);
  };

  const selectAll = () => {
    const maxSelect = Math.min(allProducts.length, 5);
    setSelectedIndices(new Set(Array.from({ length: maxSelect }, (_, i) => i)));
  };

  const clearSelection = () => {
    setSelectedIndices(new Set());
  };

  const addCustomProduct = () => {
    if (!customName.trim()) return;
    const newProduct = {
      name: customName.trim(),
      description: customDescription.trim() || `${customName.trim()} from ${brandInfo.brandName}`,
      price: customPrice.trim() || undefined,
      imageUrl: customImageUrl.trim() || undefined,
    };
    const newIndex = allProducts.length;
    setAllProducts(prev => [...prev, newProduct]);
    // Auto-select the new product if under limit
    if (selectedIndices.size < 5) {
      setSelectedIndices(prev => new Set([...prev, newIndex]));
    }
    // Reset form
    setCustomName('');
    setCustomPrice('');
    setCustomDescription('');
    setCustomImageUrl('');
    setShowAddForm(false);
  };

  const removeCustomProduct = (index: number) => {
    // Only allow removing products that were manually added (beyond original list)
    if (index < brandInfo.products.length) return;
    setAllProducts(prev => prev.filter((_, i) => i !== index));
    // Adjust selected indices
    setSelectedIndices(prev => {
      const newSet = new Set<number>();
      for (const i of prev) {
        if (i < index) newSet.add(i);
        else if (i > index) newSet.add(i - 1);
        // skip the removed index
      }
      return newSet;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedProducts = allProducts.filter((_, i) => selectedIndices.has(i));
    onSubmit(selectedProducts, aspectRatio);
  };

  const products = allProducts;
  const hasProducts = products.length > 0;
  const selectedCount = selectedIndices.size;
  const canSubmit = selectedCount > 0 || !hasProducts;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 mb-4">
          <Package className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold">Select Products for Ads</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {hasProducts
            ? `We found ${products.length} products on ${brandInfo.brandName}'s website. Select which ones you want to create ads for.`
            : `No specific products were found. We'll create brand-focused ads for ${brandInfo.brandName}.`}
        </p>
      </div>

      {/* Aspect Ratio Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Ad Format</Label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: '1:1' as AspectRatio, label: 'Square', desc: 'Instagram, Facebook' },
            { value: '9:16' as AspectRatio, label: 'Portrait', desc: 'Stories, Reels, TikTok' },
            { value: '16:9' as AspectRatio, label: 'Landscape', desc: 'YouTube, Display' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setAspectRatio(option.value)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                aspectRatio === option.value
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-muted hover:border-purple-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <ImageIcon className="w-4 h-4" />
                <span className="font-medium text-sm">{option.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{option.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Product Selection */}
      {hasProducts && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">
              {brandInfo.productType === 'service' ? 'Services' : 'Products'} ({selectedCount}/{Math.min(products.length, 5)} selected)
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={selectedCount === Math.min(products.length, 5)}
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={selectedCount === 0}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {products.map((product, index) => {
              const isSelected = selectedIndices.has(index);
              const isDisabled = !isSelected && selectedCount >= 5;
              const isCustom = index >= brandInfo.products.length;

              return (
                <div
                  key={index}
                  onClick={() => !isDisabled && toggleProduct(index)}
                  className={`flex gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all relative ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/5'
                      : isDisabled
                      ? 'border-muted opacity-50 cursor-not-allowed'
                      : 'border-muted hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center">
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      className="pointer-events-none"
                    />
                  </div>

                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      {isCustom && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                          Custom
                        </Badge>
                      )}
                    </div>
                    {product.price && isValidPrice(product.price) && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {product.price}
                      </Badge>
                    )}
                    {product.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>

                  {isSelected && !isCustom && (
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}

                  {isCustom && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomProduct(index);
                      }}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-muted hover:bg-destructive hover:text-white flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add Custom Product Button / Form */}
            {!showAddForm ? (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-muted hover:border-purple-300 hover:bg-purple-500/5 transition-all cursor-pointer min-h-[80px]"
              >
                <Plus className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground font-medium">Add Product</span>
              </button>
            ) : (
              <div className="p-4 rounded-xl border-2 border-purple-300 bg-purple-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Add Custom Product</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setCustomName('');
                      setCustomPrice('');
                      setCustomDescription('');
                      setCustomImageUrl('');
                    }}
                    className="w-5 h-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <Input
                  placeholder="Product name *"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Input
                  placeholder="Price (optional)"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="h-8 text-sm"
                />
                <Textarea
                  placeholder="Short description (optional)"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  className="text-sm min-h-[60px] resize-none"
                  rows={2}
                />
                <div className="space-y-1">
                  <Input
                    placeholder="Product image URL (optional)"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    className="h-8 text-sm"
                  />
                  {customImageUrl && (
                    <div className="flex items-center gap-2">
                      <img
                        src={customImageUrl}
                        alt="Preview"
                        className="w-10 h-10 object-cover rounded border"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span className="text-[10px] text-muted-foreground">Preview</span>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={addCustomProduct}
                  disabled={!customName.trim()}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            )}
          </div>

          {selectedCount >= 5 && (
            <p className="text-sm text-muted-foreground text-center">
              Maximum of 5 products can be selected at once
            </p>
          )}
        </div>
      )}

      {/* No Products State */}
      {!hasProducts && (
        <div className="text-center py-8 space-y-4 bg-muted/30 rounded-xl">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/10">
            <Sparkles className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className="font-medium">No specific products found</p>
            <p className="text-sm text-muted-foreground mt-1">
              We&apos;ll create general brand ads highlighting {brandInfo.brandName}&apos;s
              unique value propositions and services.
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
        <h4 className="font-medium text-sm">Ad Generation Summary</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Brand:</div>
          <div className="font-medium">{brandInfo.brandName}</div>
          
          <div className="text-muted-foreground">Format:</div>
          <div className="font-medium">{aspectRatio}</div>
          
          <div className="text-muted-foreground">Products:</div>
          <div className="font-medium">
            {hasProducts ? `${selectedCount} selected` : 'Brand-focused'}
          </div>
          
          <div className="text-muted-foreground">Ideas to generate:</div>
          <div className="font-medium text-purple-500">5 campaign ideas</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" size="lg" onClick={onBack}>
          ← Back
        </Button>
        <Button type="submit" className="flex-1" size="lg" disabled={!canSubmit}>
          Generate Campaign Ideas
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </form>
  );
}
