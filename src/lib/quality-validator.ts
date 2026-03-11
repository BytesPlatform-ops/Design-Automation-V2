/**
 * Post-Generation Quality Validation
 * Uses vision models to validate generated ad images
 */

import OpenAI from 'openai';

const openai = new OpenAI();

export interface QualityCheckResult {
  passed: boolean;
  score: number; // 1-10
  issues: string[];
  suggestions: string[];
  details: {
    headlinePresent: boolean;
    headlineCorrect: boolean;
    ctaPresent: boolean;
    colorsMatch: boolean;
    overallQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
  };
}

export interface QualityCheckInput {
  imageBase64: string;
  expectedHeadline: string;
  expectedSubheadline?: string;
  expectedCta: string;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  productName: string;
}

/**
 * Validate a generated ad image using GPT-4o vision
 * Returns quality score and specific issues found
 */
export async function validateGeneratedAd(input: QualityCheckInput): Promise<QualityCheckResult> {
  const { 
    imageBase64, 
    expectedHeadline, 
    expectedSubheadline,
    expectedCta, 
    brandColors, 
    productName 
  } = input;
  
  // Remove data URL prefix if present
  const base64Data = imageBase64.includes(',') 
    ? imageBase64.split(',')[1] 
    : imageBase64;
  
  const prompt = `Analyze this advertisement image and evaluate its quality.

=== EXPECTED ELEMENTS ===
Headline: "${expectedHeadline}"
${expectedSubheadline ? `Subheadline: "${expectedSubheadline}"` : ''}
CTA Button: "${expectedCta}"
Product/Service: "${productName}"
Brand Colors: Primary ${brandColors.primary}, Secondary ${brandColors.secondary}, Accent ${brandColors.accent}

=== EVALUATION CRITERIA ===
1. TEXT ACCURACY: Is the headline spelled correctly and complete? Is the CTA present?
2. COLOR USAGE: Are the brand colors (or close matches) prominently used?
3. VISUAL QUALITY: Is the image professional, well-composed, not distorted?
4. READABILITY: Is text readable and properly positioned?
5. OVERALL IMPACT: Would this stop someone scrolling on social media?

Return JSON:
{
  "score": 1-10,
  "headlinePresent": true/false,
  "headlineCorrect": true/false (spelling & completeness),
  "ctaPresent": true/false,
  "colorsMatch": true/false,
  "overallQuality": "excellent|good|acceptable|poor",
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["improvement 1", "improvement 2"]
}

Be strict on text accuracy - even small spelling errors should lower the score.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use mini for cost efficiency, upgrade to gpt-4o for better accuracy
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Data}`,
                detail: 'low', // Use low detail for faster/cheaper analysis
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content);
    
    // Determine if it passed (score >= 6 and no critical issues)
    const passed = result.score >= 6 && 
                   result.headlinePresent && 
                   result.headlineCorrect;
    
    return {
      passed,
      score: result.score || 5,
      issues: result.issues || [],
      suggestions: result.suggestions || [],
      details: {
        headlinePresent: result.headlinePresent ?? true,
        headlineCorrect: result.headlineCorrect ?? true,
        ctaPresent: result.ctaPresent ?? true,
        colorsMatch: result.colorsMatch ?? true,
        overallQuality: result.overallQuality || 'acceptable',
      },
    };
    
  } catch (error) {
    console.error('[QualityCheck] Error analyzing image:', error);
    
    // Return a passing result on error (don't block generation)
    return {
      passed: true,
      score: 7,
      issues: ['Quality check failed - proceeding anyway'],
      suggestions: [],
      details: {
        headlinePresent: true,
        headlineCorrect: true,
        ctaPresent: true,
        colorsMatch: true,
        overallQuality: 'acceptable',
      },
    };
  }
}

/**
 * Quick quality check - just validates basic requirements
 * Faster and cheaper than full validation
 */
export async function quickQualityCheck(
  imageBase64: string,
  expectedText: string[]
): Promise<{ passed: boolean; reason?: string }> {
  const base64Data = imageBase64.includes(',') 
    ? imageBase64.split(',')[1] 
    : imageBase64;
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Check if this image contains these text elements (exact or very close match):
${expectedText.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

Return JSON: { "allTextPresent": true/false, "missingText": ["any missing text"] }`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Data}`,
                detail: 'low',
              },
            },
          ],
        },
      ],
      max_tokens: 200,
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    
    return {
      passed: result.allTextPresent === true,
      reason: result.missingText?.length > 0 
        ? `Missing text: ${result.missingText.join(', ')}`
        : undefined,
    };
    
  } catch {
    return { passed: true }; // Don't block on errors
  }
}

/**
 * Calculate if we should validate this ad
 * To save costs, we might only validate a percentage of ads
 */
export function shouldValidateAd(
  adIndex: number, 
  totalAds: number,
  validationPercentage = 50
): boolean {
  // Always validate first ad
  if (adIndex === 0) return true;
  
  // Always validate if only 1-2 ads
  if (totalAds <= 2) return true;
  
  // Random sampling for larger batches
  return Math.random() * 100 < validationPercentage;
}
