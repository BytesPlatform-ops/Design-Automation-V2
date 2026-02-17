import { NextRequest, NextResponse } from 'next/server';
import { generateMarketingIdeas } from '@/lib/openai';
import { GenerateIdeasRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: GenerateIdeasRequest = await request.json();

    // Validate required fields
    if (!body.businessName || !body.industry || !body.niche || !body.productType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate ideas using OpenAI
    const ideas = await generateMarketingIdeas({
      businessName: body.businessName,
      industry: body.industry,
      niche: body.niche,
      productType: body.productType,
    });

    return NextResponse.json({ ideas });
  } catch (error) {
    console.error('Ideation API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate ideas' },
      { status: 500 }
    );
  }
}
