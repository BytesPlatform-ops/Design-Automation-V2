import { NextRequest, NextResponse } from 'next/server';
import { generateSingleImageWithContext } from '@/lib/gemini';
import { BrandAssets, AspectRatio, ProductType } from '@/types';

export interface EditAdRequest {
  imageUrl: string; // Current image to edit
  editRequest: string; // User's edit request (e.g., "Make text bigger", "Change to red")
  
  // Original context to maintain consistency
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
}

export async function POST(request: NextRequest) {
  try {
    const body: EditAdRequest = await request.json();

    // Validate required fields
    if (!body.imageUrl || !body.editRequest) {
      return NextResponse.json(
        { error: 'Image URL and edit request required' },
        { status: 400 }
      );
    }

    if (!body.brandName || !body.ideaTitle) {
      return NextResponse.json(
        { error: 'Brand context required' },
        { status: 400 }
      );
    }

    // Generate edited image using Gemini with context
    const editedImage = await generateSingleImageWithContext(
      {
        ideaId: 'edit',
        ideaTitle: body.ideaTitle,
        prompt: body.ideaDescription,
      },
      body.brandName,
      body.slogan,
      body.pricing,
      body.productType,
      body.aspectRatio || '1:1',
      body.brandAssets,
      body.imageUrl, // Pass current image for reference
      body.editRequest, // Pass user's edit request
      body.industry,
      body.niche
    );

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${editedImage}`,
    });
  } catch (error) {
    console.error('Edit AD API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to edit ad' },
      { status: 500 }
    );
  }
}
