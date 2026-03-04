'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AnalyzingStep } from './analyzing-step';
import { 
  Globe, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface URLInputStepProps {
  onSubmit: (url: string) => Promise<void>;
  onBack: () => void;
}

export function URLInputStep({ onSubmit, onBack }: URLInputStepProps) {
  const [url, setUrl] = useState('');
  const [consent, setConsent] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingUrl, setAnalyzingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [urlValid, setUrlValid] = useState<boolean | null>(null);

  // Validate URL format
  const validateURL = (value: string): boolean => {
    if (!value.trim()) return false;
    try {
      // Add protocol if missing
      let urlToTest = value;
      if (!urlToTest.startsWith('http://') && !urlToTest.startsWith('https://')) {
        urlToTest = 'https://' + urlToTest;
      }
      const parsed = new URL(urlToTest);
      // Basic domain validation
      return parsed.hostname.includes('.') && parsed.hostname.length > 3;
    } catch {
      return false;
    }
  };

  const handleURLChange = (value: string) => {
    setUrl(value);
    setError(null);
    if (value.trim()) {
      setUrlValid(validateURL(value));
    } else {
      setUrlValid(null);
    }
  };

  const normalizeURL = (value: string): string => {
    let normalized = value.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    return normalized;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!urlValid || !consent) return;
    
    const normalizedURL = normalizeURL(url);
    setAnalyzingUrl(normalizedURL);
    setIsAnalyzing(true);
    setError(null);
    
    try {
      await onSubmit(normalizedURL);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze website. Please try again.');
      setIsAnalyzing(false);
      setAnalyzingUrl(null);
    }
  };

  const isValid = urlValid === true && consent;

  // Show analyzing step when processing
  if (isAnalyzing && analyzingUrl) {
    return <AnalyzingStep url={analyzingUrl} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
          <Globe className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold">Enter Your Website URL</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          We&apos;ll analyze your website to extract brand identity, colors, products, and more to generate perfect ads.
        </p>
      </div>

      {/* URL Input */}
      <div className="space-y-3">
        <Label htmlFor="website-url" className="text-base font-medium">
          Website URL
        </Label>
        <div className="relative">
          <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="website-url"
            type="text"
            placeholder="example.com or https://example.com"
            value={url}
            onChange={(e) => handleURLChange(e.target.value)}
            className={`pl-12 pr-12 h-14 text-lg ${
              urlValid === false 
                ? 'border-red-500 focus-visible:ring-red-500' 
                : urlValid === true 
                  ? 'border-green-500 focus-visible:ring-green-500' 
                  : ''
            }`}
            disabled={isAnalyzing}
          />
          {urlValid !== null && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              {urlValid ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          )}
        </div>
        {urlValid === false && url.trim() && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Please enter a valid website URL
          </p>
        )}
      </div>

      {/* What We'll Extract */}
      <div className="bg-muted/50 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          What we&apos;ll extract from your website:
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            'Brand name & tagline',
            'Primary & accent colors',
            'Logo and brand imagery',
            'Products & services',
            'Brand voice & tone',
            'Target audience signals',
            'Key selling points',
            'Visual style preferences'
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Consent Checkbox */}
      <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
        <Checkbox
          id="consent"
          checked={consent}
          onCheckedChange={(checked) => setConsent(checked === true)}
          disabled={isAnalyzing}
          className="mt-0.5"
        />
        <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
          I confirm that I have the right to use content from this website and agree to the{' '}
          <span className="text-purple-500 hover:underline cursor-pointer">Terms of Service</span>.
          The website will be accessed to extract publicly available information for ad generation.
        </Label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button 
          type="button" 
          variant="outline" 
          size="lg" 
          onClick={onBack}
          disabled={isAnalyzing}
        >
          ← Back
        </Button>
        <Button 
          type="submit" 
          className="flex-1" 
          size="lg" 
          disabled={!isValid || isAnalyzing}
        >
          Analyze Website
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </form>
  );
}
