-- ============================================
-- AdGen AI - Database Schema
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
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  niche TEXT NOT NULL,
  product_type product_type NOT NULL,
  brand_slogan TEXT,
  pricing_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster user lookups
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- ============================================
-- Campaigns Table
-- ============================================

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  idea_title TEXT NOT NULL,
  idea_description TEXT NOT NULL,
  dynamic_prompt TEXT NOT NULL,
  status campaign_status DEFAULT 'pending',
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
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  resolution TEXT DEFAULT '2048x2048',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster campaign lookups
CREATE INDEX idx_generated_images_campaign_id ON generated_images(campaign_id);

-- ============================================
-- Storage Bucket Setup
-- Run this after creating tables
-- ============================================

-- Create storage bucket for generated images
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to generated images
CREATE POLICY "Public read access for generated images"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-images');

-- Allow authenticated uploads (for now, allow all)
CREATE POLICY "Allow uploads to generated images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generated-images');

-- Allow deletes (for cleanup)
CREATE POLICY "Allow deletes from generated images"
ON storage.objects FOR DELETE
USING (bucket_id = 'generated-images');

-- ============================================
-- Row Level Security (RLS) Policies
-- Basic policies - enhance when adding auth
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (will restrict with auth)
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on campaigns" ON campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on generated_images" ON generated_images FOR ALL USING (true) WITH CHECK (true);
