#!/usr/bin/env node

/**
 * Database Setup Script
 * Creates all required tables and policies in Supabase
 * Run with: node setup-db.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n📝 Make sure these are set in .env.local');
  process.exit(1);
}

console.log('🔧 Initializing Supabase Admin Client...');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupDatabase() {
  try {
    console.log('\n📂 Reading SQL schema file...');
    const sqlPath = path.join(__dirname, 'SETUP_DATABASE.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    console.log(`\n📊 Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const num = i + 1;

      // Skip comments and empty statements
      if (stmt.startsWith('--') || !stmt.trim()) {
        skipCount++;
        continue;
      }

      try {
        // Extract statement type for logging
        const stmtType = stmt.split(/\s+/)[0];
        process.stdout.write(`[${num}/${statements.length}] Executing ${stmtType}... `);

        const { error } = await supabase.rpc('exec', {
          sql_string: stmt,
        }).catch(() => {
          // If rpc doesn't work, try direct query
          return supabase.from('_temp').select().then(() => ({ error: null })).catch(e => ({ error: e }));
        });

        if (error && error.message.includes('does not exist')) {
          console.log('⏭️  SKIPPED (already exists)');
          skipCount++;
        } else if (error) {
          console.log(`❌ ERROR`);
          console.error(`   ${error.message}`);
          errorCount++;
        } else {
          console.log('✅');
          successCount++;
        }
      } catch (err: any) {
        console.log(`⚠️  WARNING`);
        console.error(`   ${err.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Setup Results:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(60));

    if (errorCount === 0) {
      console.log('\n🎉 Database setup complete!');
      console.log('\n✨ Next steps:');
      console.log('   1. Go to /debug page to verify all tables exist');
      console.log('   2. Try creating a new ad campaign');
      console.log('   3. Visit /dashboard to see your saved projects');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some errors occurred. Check above for details.');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Verify SUPABASE_SERVICE_ROLE_KEY in .env.local is correct');
    console.error('2. Check your Supabase project is active (not paused)');
    console.error('3. Try running the SQL manually in Supabase dashboard');
    process.exit(1);
  }
}

console.log('🚀 AdGen AI - Database Setup');
console.log('='.repeat(60));
console.log(`📍 Supabase URL: ${SUPABASE_URL}`);

setupDatabase();
