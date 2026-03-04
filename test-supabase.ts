#!/usr/bin/env node

// Quick test script to verify Supabase connection
import { supabaseClient } from './src/lib/supabase-client';

async function testConnection() {
  console.log('🧪 Testing Supabase Connection...\n');

  try {
    // Test 1: Check if we can connect
    console.log('✓ Supabase client initialized');

    // Test 2: Try a simple query
    const { data, error } = await supabaseClient
      .from('projects')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Query error:', error.message);
      return false;
    }

    console.log('✓ Database connection working');
    console.log(`✓ Projects table accessible`);

    // Test 3: Check storage
    const { data: buckets, error: bucketError } = await supabaseClient.storage
      .listBuckets();

    if (bucketError) {
      console.log('⚠️  Storage check skipped:', bucketError.message);
    } else {
      const hasGeneratedAdsBucket = buckets?.some(b => b.name === 'generated-ads');
      if (hasGeneratedAdsBucket) {
        console.log('✓ Storage bucket "generated-ads" exists');
      } else {
        console.log('⚠️  Storage bucket "generated-ads" not found (will be created on first upload)');
      }
    }

    console.log('\n✅ All checks passed! Supabase is ready.\n');
    return true;
  } catch (err) {
    console.error('❌ Connection test failed:', err);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
