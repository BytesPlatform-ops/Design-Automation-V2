import { NextRequest, NextResponse } from 'next/server';
import { generateAdsWithoutStorage } from '@/lib/gemini';
import { CreateAdsRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body: CreateAdsRequest = await request.json();

    // Validate required fields
    if (!body.prompts || body.prompts.length === 0) {
      return NextResponse.json(
        { error: 'No prompts provided' },
        { status: 400 }
      );
    }

    if (!body.brandName) {
      return NextResponse.json(
        { error: 'Brand name required' },
        { status: 400 }
      );
    }

    const projectId = uuidv4();

    // Generate ads using Gemini (without Supabase storage)
    const images = await generateAdsWithoutStorage(
      body.prompts,
      body.brandName,
      body.slogan,
      body.pricing,
      body.productType,
      body.aspectRatio || '1:1',
      body.brandAssets
    );

    return NextResponse.json({ 
      images,
      projectId 
    });
  } catch (error) {
    console.error('Generation API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate ads' },
      { status: 500 }
    );
  }
}
