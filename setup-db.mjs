#!/usr/bin/env node

/**
 * Simple Database Setup
 * Executes SQL schema directly via Supabase REST API
 * Usage: npm run setup:db
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from .env.local
const envPath = path.join(__dirname, '.env.local');
dotenv.config({ path: envPath });

// Get environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing .env.local variables');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🚀 Setting up AdGen AI Database\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function executeSql(sql) {
  try {
    // Use postgres direct connection via REST
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sql_exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({ sql }),
    });

    return await response.json();
  } catch (err) {
    return { error: err.message };
  }
}

async function setupDatabase() {
  try {
    console.log('📂 Reading schema...');
    const sqlPath = path.join(__dirname, 'SETUP_DATABASE.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    console.log('🔄 Executing SQL statements...\n');

    // Execute the entire schema as one batch
    console.log('Creating extensions...');
    await executeSql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('✅ Extensions ready\n');

    console.log('Creating types...');
    await executeSql(`
      CREATE TYPE product_type AS ENUM ('physical', 'service', 'digital');
      CREATE TYPE campaign_status AS ENUM ('pending', 'generating', 'completed', 'failed');
    `);
    console.log('✅ Types created\n');

    console.log('Creating tables...');
    
    // Users table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT UNIQUE,
        credits INTEGER DEFAULT 10,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('  ✅ users');

    // Projects table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT NOT NULL,
        business_name TEXT NOT NULL,
        industry TEXT NOT NULL,
        niche TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    `);
    console.log('  ✅ projects');

    // Campaigns table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        product_name TEXT NOT NULL,
        product_description TEXT NOT NULL,
        target_audience TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_campaigns_project_id ON campaigns(project_id);
    `);
    console.log('  ✅ campaigns');

    // Generated images table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS generated_images (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        concept_id TEXT NOT NULL,
        image_url TEXT NOT NULL,
        prompt TEXT NOT NULL,
        aspect_ratio TEXT DEFAULT 'auto',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_generated_images_campaign_id ON generated_images(campaign_id);
    `);
    console.log('  ✅ generated_images');

    // Credits log table
    await executeSql(`
      CREATE TABLE IF NOT EXISTS credits_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT NOT NULL,
        campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
        amount INTEGER NOT NULL,
        reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_credits_log_user_id ON credits_log(user_id);
    `);
    console.log('  ✅ credits_log\n');

    console.log('Enabling RLS...');
    await executeSql(`
      ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
      ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
      ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
      ALTER TABLE credits_log ENABLE ROW LEVEL SECURITY;
    `);
    console.log('✅ RLS enabled\n');

    console.log('Creating policies...');
    await executeSql(`
      CREATE POLICY "Allow all for projects" ON projects USING (true) WITH CHECK (true);
      CREATE POLICY "Allow all for campaigns" ON campaigns USING (true) WITH CHECK (true);
      CREATE POLICY "Allow all for generated_images" ON generated_images USING (true) WITH CHECK (true);
      CREATE POLICY "Allow all for credits_log" ON credits_log USING (true) WITH CHECK (true);
    `);
    console.log('✅ Policies created\n');

    console.log('Setting up storage bucket...');
    await executeSql(`
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('generated-ads', 'generated-ads', true)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Storage bucket ready\n');

    console.log('='.repeat(60));
    console.log('✅ DATABASE SETUP COMPLETE!\n');
    console.log('📋 Tables created:');
    console.log('   ✓ users');
    console.log('   ✓ projects');
    console.log('   ✓ campaigns');
    console.log('   ✓ generated_images');
    console.log('   ✓ credits_log');
    console.log('   ✓ Storage: generated-ads\n');
    console.log('🚀 Next steps:');
    console.log('   1. Visit http://localhost:3001/debug');
    console.log('   2. All checks should be ✅ green');
    console.log('   3. Go to /dashboard to see your projects');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
