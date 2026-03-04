'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Sparkles, 
  Upload, 
  X, 
  Image as ImageIcon,
  Download,
  RotateCcw,
  Loader2,
  Palette,
  Wand2,
  CheckCircle2,
  Info,
  MessageSquare,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import { AspectRatio } from '@/types';

interface BackgroundGeneratorProps {
  onBack: () => void;
}

const ASPECT_RATIOS: { value: AspectRatio; label: string; icon: string }[] = [
  { value: '1:1', label: 'Square', icon: '⬜' },
  { value: '4:5', label: 'Portrait', icon: '📱' },
  { value: '9:16', label: 'Story', icon: '📲' },
  { value: '16:9', label: 'Landscape', icon: '🖥️' },
];

const STYLES = [
  { value: 'photorealistic', label: 'Photorealistic', description: 'Ultra-realistic photography' },
  { value: 'illustrated', label: 'Illustrated', description: 'Clean digital illustration' },
  { value: 'abstract', label: 'Abstract', description: 'Artistic & creative' },
  { value: 'minimal', label: 'Minimal', description: 'Clean & simple' },
];

export function BackgroundGenerator({ onBack }: BackgroundGeneratorProps) {
  const [step, setStep] = useState<'input' | 'generating' | 'result'>('input');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form state
  const [visualizationPrompt, setVisualizationPrompt] = useState('');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [style, setStyle] = useState('photorealistic');
  const [projectName, setProjectName] = useState('');
  const [useColors, setUseColors] = useState(false);
  const [brandColors, setBrandColors] = useState({
    primary: '#1a1a2e',
    secondary: '#16213e',
    accent: '#e94560',
  });
  
  // Result state
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  // Edit state
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProductImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!visualizationPrompt.trim()) {
      toast.error('Please describe your visualization');
      return;
    }

    setIsGenerating(true);
    setStep('generating');

    try {
      const response = await fetch('/api/background-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visualizationPrompt: visualizationPrompt.trim(),
          productImageUrl: productImage || undefined,
          aspectRatio,
          brandColors: useColors ? brandColors : undefined,
          projectName: projectName.trim() || 'Background Generation',
          style,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Generation failed');
      }

      const data = await response.json();
      setGeneratedImage(data.imageData);
      setImageSize({ width: data.width, height: data.height });
      setStep('result');
      toast.success('4K background generated!');
    } catch (error) {
      toast.error('Generation failed', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
      setStep('input');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (format: 'png' | 'jpg') => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      
      let finalBlob = blob;
      let extension = format;
      
      if (format === 'jpg' && generatedImage.includes('image/png')) {
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
          img.src = generatedImage;
        });
        
        finalBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b || blob), 'image/jpeg', 0.95);
        });
      }
      
      const url = window.URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `background-4k-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Download failed');
    }
  };

  const handleStartOver = () => {
    setStep('input');
    setGeneratedImage(null);
    setVisualizationPrompt('');
    setProductImage(null);
    setShowEditPanel(false);
    setEditPrompt('');
  };

  const handleEditWithAI = async () => {
    if (!editPrompt.trim() || !generatedImage) return;
    
    setIsEditing(true);
    
    try {
      const response = await fetch('/api/background-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: generatedImage,
          editRequest: editPrompt.trim(),
          aspectRatio,
          style,
          brandColors: useColors ? brandColors : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Edit failed');
      }

      const data = await response.json();
      setGeneratedImage(data.imageData);
      setImageSize({ width: data.width, height: data.height });
      setEditPrompt('');
      setShowEditPanel(false);
      toast.success('Background edited successfully!');
    } catch (error) {
      toast.error('Edit failed', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsEditing(false);
    }
  };

  // Generating Step
  if (step === 'generating') {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 mb-6">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Creating Your 4K Background</h2>
        <p className="text-muted-foreground mb-8">
          Generating premium quality image without text...
        </p>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Crafting stunning visuals...
          </p>
          <p className="flex items-center justify-center gap-2">
            <Wand2 className="w-4 h-4 text-pink-500" />
            Applying professional styling...
          </p>
          <p className="flex items-center justify-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-500" />
            Rendering at 4K resolution...
          </p>
        </div>
      </div>
    );
  }

  // Result Step
  if (step === 'result' && generatedImage) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-4">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Your 4K Background is Ready! 🎨</h2>
          <p className="text-muted-foreground">
            {imageSize.width}x{imageSize.height} • No text • Ready for your design
          </p>
        </div>

        {/* Image Preview */}
        <Card className="overflow-hidden">
          <div className="bg-[#111] p-4 flex items-center justify-center min-h-[400px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generatedImage}
              alt="Generated background"
              className="max-w-full max-h-[600px] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </Card>

        {/* Download Options */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Button size="lg" onClick={() => handleDownload('png')} className="gap-2">
            <Download className="w-4 h-4" />
            Download PNG (Lossless)
          </Button>
          <Button size="lg" variant="secondary" onClick={() => handleDownload('jpg')} className="gap-2">
            <Download className="w-4 h-4" />
            Download JPG (Smaller)
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            onClick={() => setShowEditPanel(!showEditPanel)}
            className="gap-2 border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30"
          >
            <MessageSquare className="w-4 h-4" />
            Edit with AI
          </Button>
        </div>

        {/* Edit Panel */}
        {showEditPanel && (
          <Card className="p-4 border-purple-500 bg-purple-50/50 dark:bg-purple-950/20">
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <Wand2 className="w-4 h-4" />
                What would you like to change?
              </Label>
              <div className="flex gap-2">
                <Textarea
                  placeholder="e.g., Make the lighting warmer, Add more depth, Change background to sunset colors, Make it more dramatic..."
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="min-h-[80px] flex-1"
                  disabled={isEditing}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleEditWithAI}
                  disabled={!editPrompt.trim() || isEditing}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Editing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Apply Edit
                    </>
                  )}
                </Button>
                <Button variant="ghost" onClick={() => setShowEditPanel(false)} disabled={isEditing}>
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Tip: Be specific about what you want to change. The AI will maintain the no-text rule.
              </p>
            </div>
          </Card>
        )}

        {/* Info */}
        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4 text-center">
          <p className="text-sm text-purple-800 dark:text-purple-300">
            <Info className="w-4 h-4 inline mr-1" />
            This image has NO text. Import into Figma, Photoshop, or Canva to add your own typography.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center pt-4 border-t">
          <Button variant="outline" onClick={handleStartOver} size="lg">
            <RotateCcw className="mr-2 h-4 w-4" />
            Generate Another
          </Button>
          <Button variant="outline" onClick={onBack} size="lg">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Input Step
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 mb-4">
          <Wand2 className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Generate Background (No Text)</h2>
        <p className="text-muted-foreground">
          Create stunning 4K ad backgrounds for designers. Add your own text later.
        </p>
      </div>

      <Card className="p-6 space-y-6">
        {/* Project Name */}
        <div className="space-y-2">
          <Label htmlFor="project-name">Project Name (Optional)</Label>
          <Input
            id="project-name"
            placeholder="e.g., Summer Campaign Background"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>

        {/* Visualization Prompt */}
        <div className="space-y-2">
          <Label htmlFor="visualization" className="flex items-center gap-2">
            Visualization Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="visualization"
            placeholder="Describe your ideal background in detail...

Examples:
• Luxury marble countertop with soft golden hour lighting, rose petals scattered, champagne glass nearby, warm and romantic mood

• Minimalist white studio setup with soft shadows, clean modern aesthetic, subtle gradient from cream to white

• Tropical beach scene at sunset, palm trees silhouette, orange and pink sky reflecting on calm water

• Dark moody kitchen with slate countertop, steam rising, copper pots, dramatic side lighting"
            value={visualizationPrompt}
            onChange={(e) => setVisualizationPrompt(e.target.value)}
            className="min-h-[150px]"
          />
          <p className="text-xs text-muted-foreground">
            Be specific about colors, lighting, mood, surfaces, and composition.
          </p>
        </div>

        {/* Product Image Upload */}
        <div className="space-y-2">
          <Label>Product Image (Optional)</Label>
          <p className="text-xs text-muted-foreground mb-2">
            If you upload a product image, it will be incorporated into the background.
          </p>
          
          {productImage ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={productImage}
                alt="Product"
                className="h-32 w-auto rounded-lg border object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={() => setProductImage(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload product image</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
          )}
        </div>

        {/* Style Selection */}
        <div className="space-y-2">
          <Label>Style</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStyle(s.value)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  style === s.value
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                    : 'hover:border-purple-300'
                }`}
              >
                <p className="font-medium text-sm">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-2">
          <Label>Aspect Ratio (4K Output)</Label>
          <div className="grid grid-cols-4 gap-3">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.value}
                type="button"
                onClick={() => setAspectRatio(ar.value)}
                className={`p-3 rounded-lg border text-center transition-all ${
                  aspectRatio === ar.value
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                    : 'hover:border-purple-300'
                }`}
              >
                <span className="text-2xl">{ar.icon}</span>
                <p className="text-sm font-medium mt-1">{ar.value}</p>
                <p className="text-xs text-muted-foreground">{ar.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Brand Colors */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="use-colors"
              checked={useColors}
              onChange={(e) => setUseColors(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="use-colors" className="cursor-pointer flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Use Brand Colors
            </Label>
          </div>
          
          {useColors && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <Label className="text-xs">Primary</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandColors.primary}
                    onChange={(e) => setBrandColors(prev => ({ ...prev, primary: e.target.value }))}
                    className="w-10 h-8 rounded cursor-pointer"
                  />
                  <Input
                    value={brandColors.primary}
                    onChange={(e) => setBrandColors(prev => ({ ...prev, primary: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Secondary</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandColors.secondary}
                    onChange={(e) => setBrandColors(prev => ({ ...prev, secondary: e.target.value }))}
                    className="w-10 h-8 rounded cursor-pointer"
                  />
                  <Input
                    value={brandColors.secondary}
                    onChange={(e) => setBrandColors(prev => ({ ...prev, secondary: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Accent</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandColors.accent}
                    onChange={(e) => setBrandColors(prev => ({ ...prev, accent: e.target.value }))}
                    className="w-10 h-8 rounded cursor-pointer"
                  />
                  <Input
                    value={brandColors.accent}
                    onChange={(e) => setBrandColors(prev => ({ ...prev, accent: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Generate Button */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} size="lg">
          Back
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={!visualizationPrompt.trim() || isGenerating}
          size="lg"
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate 4K Background
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
