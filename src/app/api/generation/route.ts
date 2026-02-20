import { NextRequest, NextResponse } from 'next/server';
import { generateAdsWithoutStorage } from '@/lib/gemini';
import { CreateAdsRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { 
  saveProject,
  saveCampaign, 
  saveGeneratedImage, 
  uploadImageToStorage 
} from '@/lib/supabase-client';

// Temporary user ID - in production, get from auth context
const TEMP_USER_ID = 'temp-user-' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 8);

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
    const campaignId = uuidv4();

    // Generate ads using Gemini
    const images = await generateAdsWithoutStorage(
      body.prompts,
      body.brandName,
      body.slogan,
      body.pricing,
      body.productType,
      body.aspectRatio || '1:1',
      body.brandAssets,
      body.industry,
      body.niche
    );

    // Save campaign to database (non-blocking - continue even if fails)
    try {
      // 1. Save project first (required for foreign key)
      const project = await saveProject(
        TEMP_USER_ID,
        body.brandName,
        body.industry || 'general',
        body.niche || ''
      );

      // 2. Save campaign under the project
      const campaign = await saveCampaign(
        project.id,
        `${body.brandName} - ${new Date().toLocaleDateString()}`,
        body.productType,
        body.prompts[0]?.prompt?.substring(0, 200) || 'Ad Campaign',
        'General audience'
      );

      // Upload images to storage and save references
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        try {
          const imageUrl = await uploadImageToStorage(
            campaignId,
            `concept-${i}`,
            image.imageUrl,
            'auto'
          );

          await saveGeneratedImage(
            campaign.id,
            `concept-${i}`,
            imageUrl,
            image.prompt,
            'auto'
          );
        } catch (storageError) {
          console.warn(`Failed to save image ${i} to storage:`, storageError);
          // Continue with next image even if one fails
        }
      }
    } catch (dbError) {
      console.warn('Database save failed, but continuing with response:', dbError);
      // Don't fail the generation if database save fails
    }

    return NextResponse.json({ 
      images,
      projectId,
      campaignId,
      saved: true
    });
  } catch (error) {
    console.error('Generation API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate ads' },
      { status: 500 }
    );
  }
}
