import { NextRequest, NextResponse } from 'next/server';
import { scrapeWebsite } from '@/lib/scraper';
import { analyzeBrand, ExtractedBrandInfo, brandInfoToBusinessDetails } from '@/lib/brand-analyzer';

export interface AnalyzeBrandResponse {
  success: boolean;
  brandInfo?: ExtractedBrandInfo;
  businessDetails?: ReturnType<typeof brandInfoToBusinessDetails>;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, scrapedData } = body;

    // Either provide URL (will scrape first) or pre-scraped data
    if (!url && !scrapedData) {
      return NextResponse.json(
        { success: false, error: 'URL or scrapedData is required' },
        { status: 400 }
      );
    }

    let dataToAnalyze = scrapedData;

    // If URL provided without scraped data, scrape first
    if (url && !scrapedData) {
      console.log(`[AnalyzeBrand] Scraping website: ${url}`);
      dataToAnalyze = await scrapeWebsite(url);
    }

    // Analyze the brand
    console.log(`[AnalyzeBrand] Analyzing brand from: ${dataToAnalyze.url}`);
    const startTime = Date.now();
    
    const brandInfo = await analyzeBrand(dataToAnalyze);
    
    const duration = Date.now() - startTime;
    console.log(`[AnalyzeBrand] Analysis complete in ${duration}ms. Brand: ${brandInfo.brandName}, Confidence: ${brandInfo.confidence.overall}`);

    // Also convert to BusinessDetails format for easy pipeline integration
    const businessDetails = brandInfoToBusinessDetails(brandInfo);

    return NextResponse.json({
      success: true,
      brandInfo,
      businessDetails,
    });
  } catch (error) {
    console.error('[AnalyzeBrand] Error:', error);
    
    const message = error instanceof Error ? error.message : 'Failed to analyze brand';
    
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
