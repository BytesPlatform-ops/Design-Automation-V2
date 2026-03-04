'use client';

import { useEffect, useState } from 'react';
import { Globe, Sparkles, Palette, Package, CheckCircle } from 'lucide-react';

interface AnalyzingStepProps {
  url: string;
}

const STEPS = [
  { icon: Globe, text: 'Connecting to website...', duration: 2000 },
  { icon: Package, text: 'Extracting content & products...', duration: 3000 },
  { icon: Palette, text: 'Analyzing brand identity...', duration: 4000 },
  { icon: Sparkles, text: 'Processing with AI...', duration: 5000 },
];

export function AnalyzingStep({ url }: AnalyzingStepProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    let cumulative = 0;

    STEPS.forEach((step, index) => {
      if (index > 0) {
        cumulative += STEPS[index - 1].duration;
        const timer = setTimeout(() => {
          setCurrentStepIndex(index);
        }, cumulative);
        timers.push(timer);
      }
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  const hostname = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  return (
    <div className="py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="relative inline-flex items-center justify-center w-20 h-20">
          {/* Animated rings */}
          <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-purple-500/40 animate-pulse" />
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Globe className="w-7 h-7 text-white animate-pulse" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold">Analyzing Website</h2>
        <p className="text-muted-foreground">
          Extracting brand identity from{' '}
          <span className="font-mono text-purple-500">{hostname}</span>
        </p>
      </div>

      {/* Progress Steps */}
      <div className="max-w-sm mx-auto space-y-3">
        {STEPS.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isComplete = index < currentStepIndex;
          const IconComponent = step.icon;

          return (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                isActive
                  ? 'bg-purple-500/10 border border-purple-500/30'
                  : isComplete
                  ? 'bg-green-500/5 border border-green-500/20'
                  : 'bg-muted/30 border border-transparent opacity-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-purple-500 text-white'
                    : isComplete
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isComplete ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <IconComponent className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                )}
              </div>
              <span
                className={`text-sm ${
                  isActive
                    ? 'text-foreground font-medium'
                    : isComplete
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-muted-foreground'
                }`}
              >
                {step.text}
              </span>
              {isActive && (
                <div className="ml-auto flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="text-center text-sm text-muted-foreground">
        <p>This usually takes 15-30 seconds</p>
        <p className="mt-1 text-xs">
          Tip: Make sure the website is publicly accessible
        </p>
      </div>
    </div>
  );
}
