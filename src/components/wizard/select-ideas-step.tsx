'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { IdeasSkeleton } from '@/components/wizard/ideas-skeleton';
import { MarketingIdea } from '@/types';
import { ArrowLeft, ArrowRight, Sparkles, Loader2, TrendingUp, Plus, X } from 'lucide-react';

interface SelectIdeasStepProps {
  ideas: MarketingIdea[];
  isLoading: boolean;
  onSubmit: (selectedIdeas: MarketingIdea[]) => void;
  onBack: () => void;
}

export function SelectIdeasStep({ ideas, isLoading, onSubmit, onBack }: SelectIdeasStepProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customIdeas, setCustomIdeas] = useState<MarketingIdea[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customVisual, setCustomVisual] = useState('');

  const allIdeas = [...ideas, ...customIdeas];

  const toggleIdea = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleAddCustomIdea = () => {
    if (!customTitle.trim() || !customDescription.trim()) return;
    
    const newIdea: MarketingIdea = {
      id: `custom_${Date.now()}`,
      title: customTitle,
      description: customDescription,
      visualConcept: customVisual || customDescription,
      hooks: [customTitle],
      hashtags: ['#Custom'],
    };
    
    setCustomIdeas([...customIdeas, newIdea]);
    setSelectedIds(new Set([...selectedIds, newIdea.id]));
    setCustomTitle('');
    setCustomDescription('');
    setCustomVisual('');
    setShowCustomForm(false);
  };

  const removeCustomIdea = (id: string) => {
    setCustomIdeas(customIdeas.filter(i => i.id !== id));
    const newSelected = new Set(selectedIds);
    newSelected.delete(id);
    setSelectedIds(newSelected);
  };

  const handleSubmit = () => {
    const selectedIdeas = allIdeas.filter((idea) => selectedIds.has(idea.id));
    onSubmit(selectedIdeas);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="font-medium">Analyzing Your Business</p>
            <p className="text-sm text-muted-foreground">
              Our AI is researching market trends and crafting campaign ideas...
            </p>
          </div>
        </div>
        <IdeasSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Select Your Campaign Ideas
        </h2>
        <p className="text-muted-foreground">
          We generated 5 unique ideas. Select 1-5 ideas to generate ads. 
          Selecting multiple enables A/B testing!
        </p>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3 text-sm text-green-800 dark:text-green-200">
          <strong>{selectedIds.size} idea{selectedIds.size > 1 ? 's' : ''} selected</strong> - 
          You&apos;ll get {selectedIds.size} unique ad variation{selectedIds.size > 1 ? 's' : ''} for A/B testing
        </div>
      )}

      <div className="space-y-4">
        {allIdeas.map((idea) => {
          const isCustom = idea.id.startsWith('custom_');
          return (
          <div
            key={idea.id}
            className={`relative rounded-lg border p-5 cursor-pointer transition-all ${
              selectedIds.has(idea.id)
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'hover:border-primary/50'
            }`}
            onClick={() => toggleIdea(idea.id)}
          >
            {isCustom && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  removeCustomIdea(idea.id);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <div className="flex gap-4">
              <Checkbox
                checked={selectedIds.has(idea.id)}
                onCheckedChange={() => toggleIdea(idea.id)}
                className="mt-1"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{idea.title}</h3>
                    {isCustom && <Badge variant="outline" className="text-xs">Your Idea</Badge>}
                  </div>
                  <p className="text-muted-foreground mt-1">{idea.description}</p>
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Visual Concept:</div>
                  <p className="text-sm text-muted-foreground">{idea.visualConcept}</p>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Viral Hooks:</div>
                  <div className="flex flex-wrap gap-2">
                    {idea.hooks.map((hook, i) => (
                      <Badge key={i} variant="secondary">
                        {hook}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {idea.hashtags.map((tag, i) => (
                    <span key={i} className="text-xs text-primary">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )})}
      </div>

      {/* Add Custom Idea Section */}
      {!showCustomForm ? (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={() => setShowCustomForm(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Your Own Idea
        </Button>
      ) : (
        <div className="rounded-lg border border-primary/50 bg-primary/5 p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold">Add Your Own Ad Idea</h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCustomForm(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="customTitle">Ad Headline / Title *</Label>
              <Input
                id="customTitle"
                placeholder='e.g., "Introducing Triple Patty Burger - Now Available!"'
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="customDescription">What should this ad communicate? *</Label>
              <Textarea
                id="customDescription"
                placeholder='e.g., "Show our new burger with melting cheese, highlight the price $9.99, make it look delicious and premium"'
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="customVisual">Visual Description (optional)</Label>
              <Textarea
                id="customVisual"
                placeholder='e.g., "Close-up shot of the burger on a wooden board, steam rising, dark background, brand logo in corner"'
                value={customVisual}
                onChange={(e) => setCustomVisual(e.target.value)}
                rows={2}
              />
            </div>
            
            <Button 
              onClick={handleAddCustomIdea}
              disabled={!customTitle.trim() || !customDescription.trim()}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add This Idea
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={handleSubmit} 
          className="flex-1" 
          size="lg"
          disabled={selectedIds.size === 0}
        >
          Generate {selectedIds.size > 0 ? selectedIds.size : ''} Ad{selectedIds.size !== 1 ? 's' : ''}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
