'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Download, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles,
  X,
  ZoomIn,
  Copy,
  FileImage,
  ChevronDown,
  ExternalLink,
  Wand2,
  Loader2
} from 'lucide-react';
import { URLGeneratedAd, AspectRatio } from '@/types';
import { toast } from 'sonner';

interface URLResultsStepProps {
  ads: URLGeneratedAd[];
  brandName: string;
  aspectRatio: AspectRatio;
  onStartOver: () => void;
  onUpdateAd?: (adId: string, newImageData: string) => void;
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

export function URLResultsStep({ ads, brandName, aspectRatio, onStartOver, onUpdateAd }: URLResultsStepProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [previewAd, setPreviewAd] = useState<URLGeneratedAd | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpg'>('png');
  const [showFormatDropdown, setShowFormatDropdown] = useState<string | null>(null);
  
  // Edit state
  const [editingAd, setEditingAd] = useState<URLGeneratedAd | null>(null);
  const [editRequest, setEditRequest] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleEditAd = async () => {
    if (!editingAd || !editRequest.trim()) {
      toast.error('Please describe what you want to change');
      return;
    }

    setIsEditing(true);
    try {
      const response = await fetch('/api/edit-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: editingAd.imageData,
          editRequest: editRequest.trim(),
          brandName,
          ideaTitle: editingAd.productName,
          ideaDescription: editingAd.headline,
          aspectRatio,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to edit ad');
      }

      const data = await response.json();
      toast.success('Ad edited successfully!');
      
      // Update the ad in the list
      if (onUpdateAd) {
        onUpdateAd(editingAd.id, data.imageUrl);
      }
      
      setEditingAd(null);
      setEditRequest('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error('Edit failed', { description: message });
    } finally {
      setIsEditing(false);
    }
  };

  const handleDownload = async (ad: URLGeneratedAd, format: 'png' | 'jpg' = 'png') => {
    setDownloadingId(ad.id);
    try {
      const response = await fetch(ad.imageData);
      const blob = await response.blob();
      
      let finalBlob = blob;
      let extension = format;
      
      // Convert to JPG if requested (for base64 data URLs)
      if (format === 'jpg' && ad.imageData.startsWith('data:image/png')) {
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
          img.src = ad.imageData;
        });
        
        finalBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b || blob), 'image/jpeg', 0.92);
        });
      }
      
      const url = window.URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${brandName.toLowerCase().replace(/\s+/g, '-')}-${ad.productName.toLowerCase().replace(/\s+/g, '-')}-ad.${extension}`;
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
      setShowFormatDropdown(null);
    }
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    toast.info(`Downloading ${ads.length} images...`);
    try {
      for (const ad of ads) {
        await handleDownload(ad, downloadFormat);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      toast.success('All downloads complete!');
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleCopyToClipboard = async (ad: URLGeneratedAd) => {
    try {
      const response = await fetch(ad.imageData);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      toast.success('Image copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy image');
      console.error(error);
    }
  };

  const handleOpenInNewTab = (ad: URLGeneratedAd) => {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>${brandName} - ${ad.productName} Ad</title></head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#111;">
            <img src="${ad.imageData}" alt="${ad.productName}" style="max-width:100%;max-height:100vh;"/>
          </body>
        </html>
      `);
    }
  };

  const aspectRatioClass = getAspectRatioClass(aspectRatio);
  const gridClass = getGridClass(aspectRatio);

  if (ads.length === 0) {
    return (
      <div className="text-center py-12">
        <FileImage className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Ads Generated</h3>
        <p className="text-muted-foreground mb-6">
          Something went wrong during generation.
        </p>
        <Button onClick={onStartOver}>Start Over</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preview Modal */}
      {previewAd && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewAd(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full">
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
              src={previewAd.imageData}
              alt={previewAd.productName}
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
              <h3 className="text-white font-semibold">{previewAd.productName}</h3>
              <p className="text-white/70 text-sm">{previewAd.headline}</p>
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={(e) => { e.stopPropagation(); handleDownload(previewAd, 'png'); }}
                >
                  <Download className="h-4 w-4 mr-1" /> PNG
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={(e) => { e.stopPropagation(); handleDownload(previewAd, 'jpg'); }}
                >
                  <Download className="h-4 w-4 mr-1" /> JPG
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(previewAd); }}
                >
                  <Copy className="h-4 w-4 mr-1" /> Copy
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={(e) => { e.stopPropagation(); handleOpenInNewTab(previewAd); }}
                >
                  <ExternalLink className="h-4 w-4 mr-1" /> Open
                </Button>
                <Button 
                  size="sm" 
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setPreviewAd(null);
                    setEditingAd(previewAd);
                  }}
                >
                  <Wand2 className="h-4 w-4 mr-1" /> Edit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingAd && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => !isEditing && setEditingAd(null)}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Preview */}
            <div className="md:w-1/2 bg-gray-100 dark:bg-gray-800 p-4 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={editingAd.imageData}
                alt={editingAd.productName}
                className="max-w-full max-h-[50vh] md:max-h-[70vh] object-contain rounded-lg"
              />
            </div>
            
            {/* Edit Panel */}
            <div className="md:w-1/2 p-6 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-purple-600" />
                    Edit with AI
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {editingAd.productName}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingAd(null)}
                  disabled={isEditing}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    What would you like to change?
                  </label>
                  <Textarea
                    placeholder="Examples:&#10;• Change the background to a beach scene&#10;• Make the headline larger&#10;• Add a 20% OFF badge&#10;• Change the color scheme to blue&#10;• Remove the person from the background"
                    value={editRequest}
                    onChange={(e) => setEditRequest(e.target.value)}
                    className="h-40 resize-none"
                    disabled={isEditing}
                  />
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-sm">
                  <p className="font-medium text-purple-800 dark:text-purple-300 mb-1">
                    💡 AI Edit Tips
                  </p>
                  <ul className="text-purple-700 dark:text-purple-400 text-xs space-y-1">
                    <li>• Be specific about what you want changed</li>
                    <li>• Mention colors, positions, or sizes when relevant</li>
                    <li>• The AI will preserve the overall ad style</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex gap-3 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditingAd(null)}
                  disabled={isEditing}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={handleEditAd}
                  disabled={isEditing || !editRequest.trim()}
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Editing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Apply Edit
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-4">
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Your Ads Are Ready! 🎉</h2>
        <p className="text-muted-foreground">
          Generated {ads.length} stunning ad{ads.length !== 1 ? 's' : ''} for {brandName}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border">
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">{ads.length}</p>
          <p className="text-xs text-muted-foreground">Ads Created</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">{aspectRatio}</p>
          <p className="text-xs text-muted-foreground">Aspect Ratio</p>
        </div>
        <div className="text-center">
          <div className="flex justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">AI Generated</p>
        </div>
      </div>

      {/* Download All Button */}
      <div className="flex justify-center gap-3">
        <div className="relative">
          <Button
            onClick={handleDownloadAll}
            disabled={downloadingAll}
            size="lg"
            className="gap-2 pr-10"
          >
            <Download className="w-4 h-4" />
            {downloadingAll ? 'Downloading...' : `Download All (${downloadFormat.toUpperCase()})`}
          </Button>
          <div className="absolute right-0 top-0 bottom-0 flex items-center border-l border-primary-foreground/20">
            <Button
              variant="ghost"
              size="sm"
              className="h-full px-2 hover:bg-primary-foreground/10 rounded-l-none"
              onClick={() => setDownloadFormat(downloadFormat === 'png' ? 'jpg' : 'png')}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Ads Grid */}
      <div className={`grid gap-6 ${gridClass}`}>
        {ads.map((ad) => (
          <Card key={ad.id} className="overflow-hidden group relative">
            {/* Image */}
            <div 
              className={`relative ${aspectRatioClass} bg-muted cursor-pointer`}
              onClick={() => setPreviewAd(ad)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ad.imageData}
                alt={ad.headline}
                className="w-full h-full object-cover"
              />
              
              {/* Zoom indicator */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/50 rounded-full p-2">
                  <ZoomIn className="w-4 h-4 text-white" />
                </div>
              </div>
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => { e.stopPropagation(); setPreviewAd(ad); }}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <div className="relative">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setShowFormatDropdown(showFormatDropdown === ad.id ? null : ad.id);
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {showFormatDropdown === ad.id && (
                    <div 
                      className="absolute top-full mt-1 right-0 bg-white dark:bg-gray-800 rounded-md shadow-lg border z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => handleDownload(ad, 'png')}
                      >
                        Download PNG
                      </button>
                      <button
                        className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => handleDownload(ad, 'jpg')}
                      >
                        Download JPG
                      </button>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(ad); }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => { e.stopPropagation(); handleOpenInNewTab(ad); }}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setEditingAd(ad);
                    setEditRequest('');
                  }}
                >
                  <Wand2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-sm line-clamp-1">{ad.productName}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {ad.headline}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {aspectRatio}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t justify-center">
        <Button variant="outline" onClick={onStartOver} size="lg">
          <RotateCcw className="mr-2 h-4 w-4" />
          Create More Ads
        </Button>
      </div>
    </div>
  );
}
