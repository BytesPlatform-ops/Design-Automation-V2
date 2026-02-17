'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GeneratedAd, AspectRatio, DynamicPrompt, ProductType } from '@/types';
import { 
  Download, 
  RefreshCw, 
  CheckCircle, 
  Share2,
  Sparkles,
  ExternalLink,
  X,
  ZoomIn,
  Copy,
  RotateCcw,
  FileImage,
  ChevronDown
} from 'lucide-react';

interface ResultsStepProps {
  ads: GeneratedAd[];
  onStartOver: () => void;
  aspectRatio?: AspectRatio;
  onRegenerate?: (ad: GeneratedAd) => Promise<GeneratedAd | null>;
}

// Get aspect ratio CSS class
function getAspectRatioClass(aspectRatio?: AspectRatio): string {
  switch (aspectRatio) {
    case '4:5':
      return 'aspect-[4/5]';
    case '9:16':
      return 'aspect-[9/16]';
    case '16:9':
      return 'aspect-video';
    case '1:1':
    default:
      return 'aspect-square';
  }
}

// Get grid class based on aspect ratio
function getGridClass(aspectRatio?: AspectRatio): string {
  switch (aspectRatio) {
    case '9:16':
      return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    case '16:9':
      return 'grid-cols-1 md:grid-cols-2';
    case '4:5':
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    case '1:1':
    default:
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  }
}

export function ResultsStep({ ads: initialAds, onStartOver, aspectRatio = '1:1', onRegenerate }: ResultsStepProps) {
  const [ads, setAds] = useState<GeneratedAd[]>(initialAds);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [previewAd, setPreviewAd] = useState<GeneratedAd | null>(null);
  const [showPromptId, setShowPromptId] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpg'>('png');

  const handleDownload = async (ad: GeneratedAd, format: 'png' | 'jpg' = 'png') => {
    setDownloadingId(ad.id);
    try {
      const response = await fetch(ad.imageUrl);
      const blob = await response.blob();
      
      let finalBlob = blob;
      let extension = format;
      
      // Convert to JPG if requested (for base64 data URLs)
      if (format === 'jpg' && ad.imageUrl.startsWith('data:image/png')) {
        const img = new Image();
        const canvas = document.createElement('canvas');
        
        await new Promise<void>((resolve) => {
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
            }
            resolve();
          };
          img.src = ad.imageUrl;
        });
        
        finalBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b || blob), 'image/jpeg', 0.92);
        });
      }
      
      const url = window.URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ad.ideaTitle.replace(/\s+/g, '-').toLowerCase()}-ad.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    toast.info(`Downloading ${ads.length} images...`);
    for (const ad of ads) {
      await handleDownload(ad, downloadFormat);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    toast.success('All downloads complete!');
  };

  const handleCopyPrompt = async (ad: GeneratedAd) => {
    try {
      await navigator.clipboard.writeText(ad.prompt);
      toast.success('Prompt copied to clipboard');
    } catch {
      toast.error('Failed to copy prompt');
    }
  };

  const handleRegenerate = async (ad: GeneratedAd) => {
    if (!onRegenerate) {
      toast.error('Regeneration not available');
      return;
    }
    
    setRegeneratingId(ad.id);
    try {
      toast.info('Regenerating ad...', { description: 'This may take 15-30 seconds' });
      const newAd = await onRegenerate(ad);
      if (newAd) {
        setAds(prev => prev.map(a => a.id === ad.id ? newAd : a));
        toast.success('Ad regenerated successfully!');
      }
    } catch (error) {
      toast.error('Failed to regenerate');
    } finally {
      setRegeneratingId(null);
    }
  };

  const aspectRatioClass = getAspectRatioClass(aspectRatio);
  const gridClass = getGridClass(aspectRatio);

  return (
    <div className="space-y-6">
      {/* Preview Modal */}
      {previewAd && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewAd(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={() => setPreviewAd(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewAd.imageUrl}
              alt={previewAd.ideaTitle}
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
              <h3 className="text-white font-semibold">{previewAd.ideaTitle}</h3>
              <div className="flex gap-2 mt-2">
                <Button 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(previewAd);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PNG
                </Button>
                <Button 
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(previewAd, 'jpg');
                  }}
                >
                  <FileImage className="mr-2 h-4 w-4" />
                  JPG
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  className="text-white border-white/50 hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyPrompt(previewAd);
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Prompt
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Your Ads Are Ready!
          </h2>
          <p className="text-muted-foreground">
            {ads.length} publish-ready ad{ads.length > 1 ? 's' : ''} generated • {aspectRatio} aspect ratio
          </p>
        </div>
        <Badge variant="secondary" className="text-green-600">
          <Sparkles className="mr-1 h-3 w-3" />
          A/B Test Ready
        </Badge>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button variant="outline" onClick={handleDownloadAll}>
          <Download className="mr-2 h-4 w-4" />
          Download All ({downloadFormat.toUpperCase()})
        </Button>
        <div className="flex rounded-md border overflow-hidden">
          <Button 
            variant={downloadFormat === 'png' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none"
            onClick={() => setDownloadFormat('png')}
          >
            PNG
          </Button>
          <Button 
            variant={downloadFormat === 'jpg' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none"
            onClick={() => setDownloadFormat('jpg')}
          >
            JPG
          </Button>
        </div>
        <Button variant="outline">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </div>

      <div className={`grid gap-4 ${gridClass}`}>
        {ads.map((ad, index) => (
          <div 
            key={ad.id}
            className="rounded-xl border overflow-hidden bg-card group"
          >
            <div className={`${aspectRatioClass} relative bg-muted cursor-pointer`} onClick={() => setPreviewAd(ad)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ad.imageUrl}
                alt={ad.ideaTitle}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="absolute top-3 left-3">
                <Badge>Variation {index + 1}</Badge>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-sm line-clamp-2">{ad.ideaTitle}</h3>
              </div>

              {/* Expandable Prompt Section */}
              {showPromptId === ad.id && (
                <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="font-medium text-foreground">AI Prompt Used:</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2"
                      onClick={() => handleCopyPrompt(ad)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="line-clamp-4">{ad.prompt}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  size="sm"
                  className="flex-1" 
                  onClick={() => handleDownload(ad, downloadFormat)}
                  disabled={downloadingId === ad.id}
                >
                  {downloadingId === ad.id ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      {downloadFormat.toUpperCase()}
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowPromptId(showPromptId === ad.id ? null : ad.id)}
                  title="View prompt"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                {onRegenerate && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRegenerate(ad)}
                    disabled={regeneratingId === ad.id}
                    title="Regenerate"
                  >
                    {regeneratingId === ad.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                  <a href={ad.imageUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Want to create more ads with different ideas?
          </p>
          <Button onClick={onStartOver}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Create New Campaign
          </Button>
        </div>
      </div>
    </div>
  );
}
