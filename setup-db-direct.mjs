#!/usr/bin/env node

/**
 * Database Setup — Uses DATABASE_URL from .env.local
 * Usage: node setup-db-direct.mjs
 */

import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local');
  console.error('\n📋 How to get it:');
  console.error('   1. Go to https://supabase.com/dashboard → Settings → Database');
  console.error('   2. Copy Connection String (URI)');
  console.error('   3. Add to .env.local as DATABASE_URL=...');
  process.exit(1);
}

if (DATABASE_URL.includes('[YOUR-PASSWORD]')) {
  console.error('❌ Replace [YOUR-PASSWORD] in DATABASE_URL with your actual Supabase database password');
  console.error('\n📋 This is the password you set when creating the Supabase project.');
  console.error('   If you forgot it, reset at: Supabase Dashboard → Settings → Database → Reset Password');
  process.exit(1);
}

console.log('🚀 AdGen AI — Database Setup');
console.log('='.repeat(60));

const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function setupDatabase() {
  try {
    // Test connection
    console.log('\n🔌 Connecting to database...');
    const test = await sql`SELECT 1 as connected`;
    console.log('✅ Connected successfully!\n');

    // 1. Extension
    console.log('📦 Creating extensions...');
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    console.log('  ✅ uuid-ossp\n');

    // 2. ENUM types
    console.log('📋 Creating types...');
    try {
      await sql`CREATE TYPE product_type AS ENUM ('physical', 'service', 'digital')`;
      console.log('  ✅ product_type');
    } catch (e) {
      if (e.message?.includes('already exists')) console.log('  ⏭️  product_type (exists)');
      else throw e;
    }
    try {
      await sql`CREATE TYPE campaign_status AS ENUM ('pending', 'generating', 'completed', 'failed')`;
      console.log('  ✅ campaign_status');
    } catch (e) {
      if (e.message?.includes('already exists')) console.log('  ⏭️  campaign_status (exists)');
      else throw e;
    }
    console.log('');

    // 3. Tables
    console.log('🗄️  Creating tables...');

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT UNIQUE,
        credits INTEGER DEFAULT 10,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('  ✅ users');

    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT NOT NULL,
        business_name TEXT NOT NULL,
        industry TEXT NOT NULL,
        niche TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('  ✅ projects');

    await sql`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        product_name TEXT NOT NULL,
        product_description TEXT NOT NULL,
        target_audience TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('  ✅ campaigns');

    await sql`
      CREATE TABLE IF NOT EXISTS generated_images (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        concept_id TEXT NOT NULL,
        image_url TEXT NOT NULL,
        prompt TEXT NOT NULL,
        aspect_ratio TEXT DEFAULT 'auto',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('  ✅ generated_images');

    await sql`
      CREATE TABLE IF NOT EXISTS credits_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT NOT NULL,
        campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
        amount INTEGER NOT NULL,
        reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('  ✅ credits_log\n');

    // 4. Indexes
    console.log('🔍 Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_campaigns_project_id ON campaigns(project_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_generated_images_campaign_id ON generated_images(campaign_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_credits_log_user_id ON credits_log(user_id)`;
    console.log('  ✅ All indexes\n');

    // 5. RLS
    console.log('🔒 Enabling Row Level Security...');
    await sql`ALTER TABLE projects ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE credits_log ENABLE ROW LEVEL SECURITY`;
    console.log('  ✅ RLS enabled\n');

    // 6. Policies
    console.log('📜 Creating RLS policies...');
    const tables = ['projects', 'campaigns', 'generated_images', 'credits_log'];
    for (const table of tables) {
      await sql.unsafe(`DROP POLICY IF EXISTS "Allow all for ${table}" ON ${table}`);
      await sql.unsafe(`CREATE POLICY "Allow all for ${table}" ON ${table} USING (true) WITH CHECK (true)`);
      console.log(`  ✅ ${table}`);
    }
    console.log('');

    // 7. Storage bucket
    console.log('📁 Setting up storage...');
    try {
      await sql`
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('generated-ads', 'generated-ads', true)
        ON CONFLICT (id) DO NOTHING
      `;
      console.log('  ✅ Bucket "generated-ads"');

      await sql.unsafe(`DROP POLICY IF EXISTS "Public read generated-ads" ON storage.objects`);
      await sql.unsafe(`CREATE POLICY "Public read generated-ads" ON storage.objects FOR SELECT USING (bucket_id = 'generated-ads')`);
      await sql.unsafe(`DROP POLICY IF EXISTS "Allow upload generated-ads" ON storage.objects`);
      await sql.unsafe(`CREATE POLICY "Allow upload generated-ads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'generated-ads')`);
      await sql.unsafe(`DROP POLICY IF EXISTS "Allow delete generated-ads" ON storage.objects`);
      await sql.unsafe(`CREATE POLICY "Allow delete generated-ads" ON storage.objects FOR DELETE USING (bucket_id = 'generated-ads')`);
      console.log('  ✅ Storage policies');
    } catch (e) {
      console.log('  ⚠️  Storage:', e.message?.substring(0, 80));
    }
    console.log('');

    // 8. Verify
    console.log('🔍 Verifying...');
    const p = await sql`SELECT count(*) FROM projects`;
    const c = await sql`SELECT count(*) FROM campaigns`;
    const g = await sql`SELECT count(*) FROM generated_images`;
    console.log(`  ✅ projects (${p[0].count} rows)`);
    console.log(`  ✅ campaigns (${c[0].count} rows)`);
    console.log(`  ✅ generated_images (${g[0].count} rows)`);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 DATABASE SETUP COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n🚀 Refresh your /dashboard page — error is gone!\n');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await sql.end();
    process.exit(1);
  }
}

setupDatabase();
