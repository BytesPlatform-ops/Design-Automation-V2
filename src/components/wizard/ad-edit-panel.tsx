'use client';

import { useState } from 'react';
import { GeneratedAd, BrandAssets, AspectRatio, ProductType } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface AdEditPanelProps {
  ad: GeneratedAd;
  brandName: string;
  ideaTitle: string;
  ideaDescription: string;
  slogan?: string;
  pricing?: string;
  productType: ProductType;
  industry?: string;
  niche?: string;
  aspectRatio?: AspectRatio;
  brandAssets?: BrandAssets;
  onEditComplete: (editedImageUrl: string) => void;
  isLoading?: boolean;
}

export function AdEditPanel({
  ad,
  brandName,
  ideaTitle,
  ideaDescription,
  slogan,
  pricing,
  productType,
  industry,
  niche,
  aspectRatio,
  brandAssets,
  onEditComplete,
  isLoading = false,
}: AdEditPanelProps) {
  const [editRequest, setEditRequest] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = async () => {
    if (!editRequest.trim()) {
      toast.error('Please describe what you want to change');
      return;
    }

    setIsEditing(true);
    try {
      const response = await fetch('/api/edit-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: ad.imageUrl,
          editRequest: editRequest.trim(),
          brandName,
          ideaTitle,
          ideaDescription,
          slogan,
          pricing,
          productType,
          industry,
          niche,
          aspectRatio,
          brandAssets,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to edit ad');
      }

      const data = await response.json();
      toast.success('Ad edited successfully!');
      onEditComplete(data.imageUrl);
      setEditRequest('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error('Edit failed', { description: message });
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Edit This Ad</h3>
        <p className="mt-1 text-sm text-gray-600">
          Describe the changes you want. Your brand context is remembered and edits are applied intelligently.
        </p>
      </div>

      <div className="space-y-3">
        <Textarea
          value={editRequest}
          onChange={(e) => setEditRequest(e.target.value)}
          placeholder="e.g., 'Make the text bigger', 'Change to red', 'Less dramatic, more minimal', 'Add more gold', 'Remove the price'..."
          className="min-h-24 resize-none"
          disabled={isEditing || isLoading}
        />

        <div className="flex gap-3">
          <Button
            onClick={handleEdit}
            disabled={isEditing || isLoading || !editRequest.trim()}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isEditing ? (
              <>
                <span className="mr-2 animate-spin">✨</span>
                Editing...
              </>
            ) : (
              'Apply Edit'
            )}
          </Button>
        </div>

        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
          <p className="font-medium">💡 Quick tips:</p>
          <ul className="mt-2 space-y-1 list-inside text-blue-700">
            <li>• Be specific: "bigger text" works better than "change it"</li>
            <li>• Brand context is preserved: price, logo, brand name stay smart</li>
            <li>• Multiple edits: You can edit the same ad multiple times</li>
            <li>• Examples: "luxury feel", "modern minimal", "more colorful", "remove clutter"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
