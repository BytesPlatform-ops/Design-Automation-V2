-- ============================================
-- Brand Profiles Table for URL Pipeline
-- Add this to your existing schema
-- ============================================

-- Brand profiles cached by domain for faster subsequent analyses
CREATE TABLE IF NOT EXISTS brand_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Unique identifier: normalized domain (e.g., "kfc.com.pk", "stripe.com")
  domain TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL, -- Original URL that was scraped
  
  -- Brand Identity
  brand_name TEXT NOT NULL,
  tagline TEXT,
  industry TEXT NOT NULL,
  
  -- Visual Identity
  primary_color TEXT, -- Hex color
  secondary_color TEXT,
  accent_color TEXT,
  logo_url TEXT,
  suggested_font_style TEXT CHECK (suggested_font_style IN ('modern', 'classic', 'playful', 'elegant', 'bold')),
  
  -- Messaging
  brand_voice TEXT,
  target_audience TEXT,
  unique_selling_points JSONB DEFAULT '[]'::jsonb, -- Array of strings
  key_messages JSONB DEFAULT '[]'::jsonb,
  
  -- Products/Services (cached)
  products JSONB DEFAULT '[]'::jsonb, -- Array of product objects
  product_type TEXT CHECK (product_type IN ('physical', 'digital', 'service')),
  service_sub_type TEXT CHECK (service_sub_type IN ('food-restaurant', 'saas-platform', 'intangible', NULL)),
  is_ecommerce BOOLEAN DEFAULT false,
  
  -- Ad Recommendations
  ad_recommendations JSONB DEFAULT '{}'::jsonb,
  
  -- Cache metadata
  confidence_score REAL DEFAULT 0.5, -- 0-1 score from LLM extraction
  last_scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scrape_count INTEGER DEFAULT 1, -- How many times this domain was scraped
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast domain lookups
CREATE INDEX IF NOT EXISTS idx_brand_profiles_domain ON brand_profiles(domain);

-- Index for finding stale profiles that need refresh
CREATE INDEX IF NOT EXISTS idx_brand_profiles_last_scraped ON brand_profiles(last_scraped_at);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_brand_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.scrape_count = OLD.scrape_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp on changes
DROP TRIGGER IF EXISTS brand_profiles_updated_at ON brand_profiles;
CREATE TRIGGER brand_profiles_updated_at
  BEFORE UPDATE ON brand_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_profile_timestamp();

-- RLS Policies (optional - enable if using Supabase Auth)
-- ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public read" ON brand_profiles FOR SELECT USING (true);
-- CREATE POLICY "Allow service role write" ON brand_profiles FOR ALL USING (auth.role() = 'service_role');
