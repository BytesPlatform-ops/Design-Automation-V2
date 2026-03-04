-- ============================================
-- AdGen AI - Database Schema (Corrected)
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM Types
-- ============================================

CREATE TYPE product_type AS ENUM ('physical', 'service', 'digital');
CREATE TYPE campaign_status AS ENUM ('pending', 'generating', 'completed', 'failed');

-- ============================================
-- Users Table (for future auth integration)
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  credits INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Projects Table
-- ============================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,  -- Temporary text ID (email or custom ID)
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  niche TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster user lookups
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- ============================================
-- Campaigns Table
-- ============================================

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT NOT NULL,
  target_audience TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster project lookups
CREATE INDEX idx_campaigns_project_id ON campaigns(project_id);

-- ============================================
-- Generated Images Table
-- ============================================

CREATE TABLE generated_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL,
  image_url TEXT NOT NULL,  -- Cloud URL from Supabase Storage
  prompt TEXT NOT NULL,
  aspect_ratio TEXT DEFAULT 'auto',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster campaign lookups
CREATE INDEX idx_generated_images_campaign_id ON generated_images(campaign_id);

-- ============================================
-- Credits Log Table (for future tracking)
-- ============================================

CREATE TABLE credits_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,  -- Negative for deduction, positive for addition
  reason TEXT,  -- "ad_generation", "purchase", "bonus", etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user tracking
CREATE INDEX idx_credits_log_user_id ON credits_log(user_id);

-- ============================================
-- Enable RLS (Row Level Security)
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies - Projects (Allow all for now)
-- ============================================

CREATE POLICY "Allow all for projects"
ON projects
USING (true)
WITH CHECK (true);

-- ============================================
-- RLS Policies - Campaigns (Allow all for now)
-- ============================================

CREATE POLICY "Allow all for campaigns"
ON campaigns
USING (true)
WITH CHECK (true);

-- ============================================
-- RLS Policies - Generated Images (Allow all for now)
-- ============================================

CREATE POLICY "Allow all for generated images"
ON generated_images
USING (true)
WITH CHECK (true);

-- ============================================
-- RLS Policies - Credits Log (Allow all for now)
-- ============================================

CREATE POLICY "Allow all for credits log"
ON credits_log
USING (true)
WITH CHECK (true);

-- ============================================
-- Storage Setup - Generated Ads Bucket
-- ============================================

-- Create storage bucket for generated ads
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-ads', 'generated-ads', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access to generated ads
CREATE POLICY "Public read access for generated ads"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-ads')
WITH CHECK (false);

-- Allow authenticated uploads
CREATE POLICY "Allow uploads to generated ads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generated-ads');

-- Allow deletes for cleanup
CREATE POLICY "Allow deletes from generated ads"
ON storage.objects FOR DELETE
USING (bucket_id = 'generated-ads');

-- ============================================
-- Verify Setup
-- ============================================

-- Run these to verify all tables exist:
-- SELECT * FROM projects LIMIT 1;
-- SELECT * FROM campaigns LIMIT 1;
-- SELECT * FROM generated_images LIMIT 1;
-- SELECT * FROM credits_log LIMIT 1;
