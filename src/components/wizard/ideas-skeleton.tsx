'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Lightbulb, Palette, Target } from 'lucide-react';

export function IdeasSkeleton() {
  return (
    <div className="space-y-8">
      {/* Loading Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 animate-pulse">
          <Sparkles className="w-8 h-8 text-primary animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Crafting Your Ad Ideas...</h2>
          <p className="text-muted-foreground">Our AI creative director is brainstorming scroll-stopping concepts</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-primary">
          <Lightbulb className="w-4 h-4 animate-pulse" />
          <span>Analyzing brand</span>
        </div>
        <div className="flex items-center gap-2 text-primary/70">
          <Palette className="w-4 h-4" />
          <span>Designing visuals</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Target className="w-4 h-4" />
          <span>Optimizing for audience</span>
        </div>
      </div>

      {/* Skeleton Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border p-5 space-y-4 bg-card"
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <div className="flex gap-4">
              <Skeleton className="h-5 w-5 rounded shrink-0" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-3 w-16 ml-2" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading tip */}
      <p className="text-center text-xs text-muted-foreground">
        💡 Tip: Better product images = better ad results
      </p>
    </div>
  );
}
