/**
 * Brand Profile Service
 * Manages persistent brand profiles in Supabase for caching and reuse
 */

import { createServerSupabaseClient } from './supabase';
import { URLBrandAnalysis } from '@/app/api/url-scrape/route';

export interface BrandProfile {
  id: string;
  domain: string;
  url: string;
  brand_name: string;
  tagline: string | null;
  industry: string;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  suggested_font_style: 'modern' | 'classic' | 'playful' | 'elegant' | 'bold' | null;
  brand_voice: string | null;
  target_audience: string | null;
  unique_selling_points: string[];
  key_messages: string[];
  products: URLBrandAnalysis['products'];
  product_type: 'physical' | 'digital' | 'service';
  service_sub_type: 'food-restaurant' | 'saas-platform' | 'intangible' | null;
  is_ecommerce: boolean;
  ad_recommendations: URLBrandAnalysis['adRecommendations'];
  confidence_score: number;
  last_scraped_at: string;
  scrape_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Extract normalized domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^www\./, '');
  }
}

/**
 * Check if a cached brand profile exists and is fresh enough
 * @param maxAgeHours - Maximum age of the cache in hours (default: 168 = 7 days)
 */
export async function getCachedBrandProfile(
  url: string,
  maxAgeHours = 168
): Promise<{ profile: BrandProfile | null; isStale: boolean }> {
  try {
    const supabase = createServerSupabaseClient();
    const domain = extractDomain(url);
    
    const { data, error } = await supabase
      .from('brand_profiles')
      .select('*')
      .eq('domain', domain)
      .single();
    
    if (error || !data) {
      return { profile: null, isStale: false };
    }
    
    // Check if cache is stale
    const lastScraped = new Date(data.last_scraped_at);
    const ageHours = (Date.now() - lastScraped.getTime()) / (1000 * 60 * 60);
    const isStale = ageHours > maxAgeHours;
    
    console.log(`[BrandProfile] Cache hit for ${domain}, age: ${ageHours.toFixed(1)}h, stale: ${isStale}`);
    
    return { 
      profile: data as BrandProfile, 
      isStale 
    };
  } catch (error) {
    console.error('[BrandProfile] Error fetching cached profile:', error);
    return { profile: null, isStale: false };
  }
}

/**
 * Save or update a brand profile in Supabase
 */
export async function saveBrandProfile(
  url: string,
  analysis: URLBrandAnalysis,
  confidenceScore = 0.8
): Promise<BrandProfile | null> {
  try {
    const supabase = createServerSupabaseClient();
    const domain = extractDomain(url);
    
    const profileData = {
      domain,
      url,
      brand_name: analysis.brandName,
      tagline: analysis.tagline || null,
      industry: analysis.industry,
      primary_color: analysis.primaryColor || null,
      secondary_color: analysis.secondaryColor || null,
      accent_color: analysis.accentColor || null,
      logo_url: null, // Could be extracted from scrape
      suggested_font_style: analysis.suggestedFontStyle || null,
      brand_voice: analysis.brandVoice || null,
      target_audience: analysis.targetAudience || null,
      unique_selling_points: analysis.uniqueSellingPoints || [],
      key_messages: analysis.keyMessages || [],
      products: analysis.products || [],
      product_type: analysis.productType,
      service_sub_type: analysis.serviceSubType || null,
      is_ecommerce: analysis.isEcommerce || false,
      ad_recommendations: analysis.adRecommendations || {},
      confidence_score: confidenceScore,
      last_scraped_at: new Date().toISOString(),
    };
    
    // Upsert - insert or update on conflict
    const { data, error } = await supabase
      .from('brand_profiles')
      .upsert(profileData, { 
        onConflict: 'domain',
        ignoreDuplicates: false 
      })
      .select()
      .single();
    
    if (error) {
      console.error('[BrandProfile] Error saving profile:', error);
      return null;
    }
    
    console.log(`[BrandProfile] Saved profile for ${domain}`);
    return data as BrandProfile;
  } catch (error) {
    console.error('[BrandProfile] Error in saveBrandProfile:', error);
    return null;
  }
}

/**
 * Convert cached BrandProfile to URLBrandAnalysis format
 */
export function profileToAnalysis(profile: BrandProfile): URLBrandAnalysis {
  return {
    brandName: profile.brand_name,
    tagline: profile.tagline || '',
    industry: profile.industry,
    primaryColor: profile.primary_color || '#3B82F6',
    secondaryColor: profile.secondary_color || '#1E40AF',
    accentColor: profile.accent_color || '#F59E0B',
    suggestedFontStyle: profile.suggested_font_style || 'modern',
    brandVoice: profile.brand_voice || 'Professional',
    targetAudience: profile.target_audience || 'General audience',
    uniqueSellingPoints: profile.unique_selling_points || [],
    keyMessages: profile.key_messages || [],
    products: profile.products || [],
    productType: profile.product_type,
    serviceSubType: profile.service_sub_type || undefined,
    isEcommerce: profile.is_ecommerce,
    adRecommendations: profile.ad_recommendations || {
      bestPlatforms: ['Instagram', 'Facebook'],
      suggestedTones: ['professional'],
      visualStyle: 'Modern',
      callToAction: 'Learn More',
    },
  };
}

/**
 * Delete a brand profile (useful for testing or manual refresh)
 */
export async function deleteBrandProfile(url: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient();
    const domain = extractDomain(url);
    
    const { error } = await supabase
      .from('brand_profiles')
      .delete()
      .eq('domain', domain);
    
    if (error) {
      console.error('[BrandProfile] Error deleting profile:', error);
      return false;
    }
    
    console.log(`[BrandProfile] Deleted profile for ${domain}`);
    return true;
  } catch (error) {
    console.error('[BrandProfile] Error in deleteBrandProfile:', error);
    return false;
  }
}

/**
 * Get statistics about cached profiles
 */
export async function getBrandProfileStats(): Promise<{
  totalProfiles: number;
  recentProfiles: number;
  avgConfidence: number;
} | null> {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('brand_profiles')
      .select('confidence_score, last_scraped_at');
    
    if (error || !data) {
      return null;
    }
    
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentProfiles = data.filter(p => new Date(p.last_scraped_at) > weekAgo).length;
    const avgConfidence = data.length > 0 
      ? data.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / data.length 
      : 0;
    
    return {
      totalProfiles: data.length,
      recentProfiles,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
    };
  } catch {
    return null;
  }
}
