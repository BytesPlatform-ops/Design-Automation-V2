import { NextRequest, NextResponse } from 'next/server';
import { scrapeWebsite, UnifiedScrapedData } from '@/lib/unified-scraper';

export interface ScrapeWebsiteResponse {
  success: boolean;
  data?: UnifiedScrapedData;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Basic URL validation
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Scrape the website
    console.log(`[Scraper] Starting scrape for: ${normalizedUrl}`);
    const startTime = Date.now();
    
    const scrapedData = await scrapeWebsite(normalizedUrl);
    
    const duration = Date.now() - startTime;
    console.log(`[Scraper] Completed in ${duration}ms. Found ${scrapedData.allImages.length} images, ${scrapedData.products.length} products (method: ${scrapedData.extractionMethod})`);

    return NextResponse.json({
      success: true,
      data: scrapedData,
    });
  } catch (error) {
    console.error('[Scraper] Error:', error);
    
    const message = error instanceof Error ? error.message : 'Failed to scrape website';
    
    // Handle specific error types
    if (message.includes('Failed to fetch')) {
      return NextResponse.json(
        { success: false, error: 'Could not reach the website. Please check the URL and try again.' },
        { status: 502 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
