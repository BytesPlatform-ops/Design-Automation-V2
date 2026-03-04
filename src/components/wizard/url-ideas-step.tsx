'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { IdeasSkeleton } from './ideas-skeleton';
import { ArrowLeft, ArrowRight, Sparkles, Image, Users, Lightbulb, Plus, X, PenLine } from 'lucide-react';
import { URLAdIdea } from '@/types';

interface URLIdeasStepProps {
  ideas: URLAdIdea[];
  isLoading: boolean;
  onSubmit: (selected: URLAdIdea[]) => void;
  onBack: () => void;
  brandColors?: { primary: string; secondary: string; accent: string };
}

export function URLIdeasStep({ ideas, isLoading, onSubmit, onBack, brandColors }: URLIdeasStepProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allIdeas, setAllIdeas] = useState<URLAdIdea[]>(ideas);
  const [showCustomForm, setShowCustomForm] = useState(false);
  
  // Custom idea form state
  const [customIdea, setCustomIdea] = useState({
    productName: '',
    headline: '',
    subheadline: '',
    visualConcept: '',
    adAngle: '',
    targetAudience: '',
    callToAction: 'Shop Now',
  });

  // Update allIdeas when ideas prop changes
  useEffect(() => {
    if (ideas.length > 0) {
      setAllIdeas(prev => {
        // Keep custom ideas and add new AI ideas
        const customIdeas = prev.filter(i => i.id.startsWith('custom-'));
        return [...ideas, ...customIdeas];
      });
    }
  }, [ideas]);

  const toggleIdea = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(allIdeas.map((i) => i.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSubmit = () => {
    const selected = allIdeas.filter((i) => selectedIds.has(i.id));
    onSubmit(selected);
  };

  const handleAddCustomIdea = () => {
    if (!customIdea.productName || !customIdea.headline || !customIdea.visualConcept) {
      return;
    }

    const newIdea: URLAdIdea = {
      id: `custom-idea-${Date.now()}`,
      productName: customIdea.productName,
      productImage: null,
      productPrice: null,
      headline: customIdea.headline,
      subheadline: customIdea.subheadline || 'Custom ad concept',
      bodyText: '',
      callToAction: customIdea.callToAction || 'Shop Now',
      adAngle: customIdea.adAngle || 'Custom',
      visualConcept: customIdea.visualConcept,
      colorScheme: brandColors || {
        primary: '#000000',
        secondary: '#333333',
        accent: '#0066FF',
      },
      targetAudience: customIdea.targetAudience || 'General audience',
      platform: 'Instagram',
      suggestedFormat: 'square',
    };

    setAllIdeas(prev => [...prev, newIdea]);
    setSelectedIds(prev => new Set([...prev, newIdea.id]));
    setShowCustomForm(false);
    setCustomIdea({
      productName: '',
      headline: '',
      subheadline: '',
      visualConcept: '',
      adAngle: '',
      targetAudience: '',
      callToAction: 'Shop Now',
    });
  };

  const removeCustomIdea = (id: string) => {
    setAllIdeas(prev => prev.filter(i => i.id !== id));
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  if (isLoading) {
    return <IdeasSkeleton />;
  }

  if (allIdeas.length === 0 && ideas.length === 0) {
    return (
      <div className="text-center py-12">
        <Lightbulb className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Ideas Generated</h3>
        <p className="text-muted-foreground mb-6">
          Something went wrong. Please go back and try again.
        </p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  // Use allIdeas which includes custom ideas
  const displayIdeas = allIdeas.length > 0 ? allIdeas : ideas;

  // Group ideas by product
  const ideasByProduct = displayIdeas.reduce((acc, idea) => {
    const product = idea.productName || 'General';
    if (!acc[product]) acc[product] = [];
    acc[product].push(idea);
    return acc;
  }, {} as Record<string, URLAdIdea[]>);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Choose Your Ad Ideas</h2>
        <p className="text-muted-foreground">
          Select the ad concepts you want to generate, or add your own custom idea.
        </p>
      </div>

      {/* Selection Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={selectedIds.size === displayIdeas.length}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            disabled={selectedIds.size === 0}
          >
            Clear
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowCustomForm(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Your Own
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">
          {selectedIds.size} of {displayIdeas.length} selected
        </span>
      </div>

      {/* Custom Idea Form Modal */}
      {showCustomForm && (
        <Card className="p-6 border-2 border-purple-500 bg-purple-50/50 dark:bg-purple-950/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <PenLine className="w-5 h-5 text-purple-600" />
              Create Your Own Ad Idea
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCustomForm(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="custom-product">Product/Service Name *</Label>
              <Input
                id="custom-product"
                placeholder="e.g., Premium Coffee Beans"
                value={customIdea.productName}
                onChange={(e) => setCustomIdea(prev => ({ ...prev, productName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-angle">Ad Angle</Label>
              <Input
                id="custom-angle"
                placeholder="e.g., Luxury, Eco-Friendly, Value"
                value={customIdea.adAngle}
                onChange={(e) => setCustomIdea(prev => ({ ...prev, adAngle: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="custom-headline">Headline *</Label>
              <Input
                id="custom-headline"
                placeholder="e.g., Wake Up to Perfection"
                value={customIdea.headline}
                onChange={(e) => setCustomIdea(prev => ({ ...prev, headline: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="custom-subheadline">Subheadline</Label>
              <Input
                id="custom-subheadline"
                placeholder="e.g., Premium roasted beans from sustainable farms"
                value={customIdea.subheadline}
                onChange={(e) => setCustomIdea(prev => ({ ...prev, subheadline: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="custom-visual">Visual Concept * (Describe the ad image)</Label>
              <Textarea
                id="custom-visual"
                placeholder="e.g., Coffee bag hero shot on marble countertop, surrounded by coffee beans and steam rising from a cup. Warm morning lighting with golden hour glow. Brand colors as gradient banner with bold headline."
                value={customIdea.visualConcept}
                onChange={(e) => setCustomIdea(prev => ({ ...prev, visualConcept: e.target.value }))}
                className="h-24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-audience">Target Audience</Label>
              <Input
                id="custom-audience"
                placeholder="e.g., Coffee enthusiasts aged 25-45"
                value={customIdea.targetAudience}
                onChange={(e) => setCustomIdea(prev => ({ ...prev, targetAudience: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-cta">Call to Action</Label>
              <Input
                id="custom-cta"
                placeholder="e.g., Shop Now, Learn More"
                value={customIdea.callToAction}
                onChange={(e) => setCustomIdea(prev => ({ ...prev, callToAction: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowCustomForm(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCustomIdea}
              disabled={!customIdea.productName || !customIdea.headline || !customIdea.visualConcept}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Idea
            </Button>
          </div>
        </Card>
      )}

      {/* Ideas grouped by product */}
      <div className="space-y-8">
        {Object.entries(ideasByProduct).map(([productName, productIdeas]) => (
          <div key={productName} className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Image className="w-5 h-5 text-primary" />
              {productName}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {productIdeas.map((idea) => (
                <Card
                  key={idea.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md relative ${
                    selectedIds.has(idea.id)
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  } ${idea.id.startsWith('custom-') ? 'border-purple-300 dark:border-purple-700' : ''}`}
                  onClick={() => toggleIdea(idea.id)}
                >
                  {/* Custom idea badge and delete */}
                  {idea.id.startsWith('custom-') && (
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                        Custom
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCustomIdea(idea.id);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(idea.id)}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => toggleIdea(idea.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1 pr-16">
                        {idea.headline}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {idea.subheadline}
                      </p>
                      
                      {/* Ad angle badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
                          {idea.adAngle}
                        </span>
                      </div>
                      
                      {/* Visual concept preview */}
                      <details className="text-xs text-muted-foreground mt-2">
                        <summary className="cursor-pointer font-medium hover:text-foreground">Visual Concept</summary>
                        <p className="mt-1 pl-2 border-l-2 border-muted">{idea.visualConcept}</p>
                      </details>
                      
                      {/* Product image indicator */}
                      {idea.productImage && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                          <Image className="w-3 h-3" />
                          Product image available
                        </div>
                      )}
                      
                      {/* Color preview */}
                      <div className="flex items-center gap-1 mt-2">
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: idea.colorScheme.primary }}
                          title="Primary color"
                        />
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: idea.colorScheme.secondary }}
                          title="Secondary color"
                        />
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: idea.colorScheme.accent }}
                          title="Accent color"
                        />
                        <span className="text-xs text-muted-foreground ml-1">
                          {idea.platform}
                        </span>
                      </div>
                      
                      {/* Target audience */}
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {idea.targetAudience}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="sm:w-auto">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={selectedIds.size === 0}
          className="sm:flex-1"
        >
          Generate {selectedIds.size} Ad{selectedIds.size !== 1 ? 's' : ''}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
