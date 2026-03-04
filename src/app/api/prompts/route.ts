import { NextRequest, NextResponse } from 'next/server';
import { expandToPrompts } from '@/lib/openai';
import { ExpandPromptsRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: ExpandPromptsRequest = await request.json();

    // Validate required fields
    if (!body.selectedIdeas || body.selectedIdeas.length === 0) {
      return NextResponse.json(
        { error: 'No ideas selected' },
        { status: 400 }
      );
    }

    if (!body.projectDetails) {
      return NextResponse.json(
        { error: 'Project details required' },
        { status: 400 }
      );
    }

    // Expand ideas to detailed prompts using OpenAI
    const prompts = await expandToPrompts(body.selectedIdeas, body.projectDetails);

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('Prompts API error:', error);
    return NextResponse.json(
      { error: 'Failed to expand prompts' },
      { status: 500 }
    );
  }
}
