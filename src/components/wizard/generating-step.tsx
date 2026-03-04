'use client';

import { Loader2, Sparkles, Palette, Wand2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';

interface GeneratingStepProps {
  selectedCount: number;
}

const STAGES = [
  { message: 'Crafting detailed prompts...', icon: Wand2 },
  { message: 'Generating high-fidelity images...', icon: Palette },
  { message: 'Rendering text with precision...', icon: Sparkles },
  { message: 'Finalizing your ads...', icon: Sparkles },
];

export function GeneratingStep({ selectedCount }: GeneratingStepProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progress stages
    const interval = setInterval(() => {
      setStageIndex((prev) => {
        if (prev < STAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 5000);

    // Simulate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) {
          return prev + Math.random() * 5;
        }
        return prev;
      });
    }, 500);

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, []);

  const CurrentIcon = STAGES[stageIndex].icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-8">
      <div className="relative">
        <div className="absolute inset-0 animate-ping">
          <Loader2 className="h-16 w-16 text-primary/30" />
        </div>
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold">Creating Your Ads</h3>
        <p className="text-muted-foreground max-w-md">
          Generating {selectedCount} high-quality ad{selectedCount > 1 ? 's' : ''} with 
          perfect text rendering at 2K resolution...
        </p>
      </div>

      <div className="w-full max-w-md space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <CurrentIcon className="h-4 w-4" />
          {STAGES[stageIndex].message}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8 mt-8">
        {Array.from({ length: selectedCount }).map((_, i) => (
          <div
            key={i}
            className="w-24 h-24 rounded-lg bg-muted animate-pulse flex items-center justify-center"
          >
            <Sparkles className="h-8 w-8 text-muted-foreground/30" />
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        This typically takes 30-60 seconds depending on the number of ads
      </p>
    </div>
  );
}
