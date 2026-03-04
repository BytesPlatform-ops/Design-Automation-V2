'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DebugPage() {
  const [status, setStatus] = useState<{
    supabaseConnected: boolean;
    tablesExist: {
      projects: boolean;
      campaigns: boolean;
      generated_images: boolean;
      credits_log: boolean;
    };
    storageBucket: boolean;
    errors: string[];
  }>({
    supabaseConnected: false,
    tablesExist: {
      projects: false,
      campaigns: false,
      generated_images: false,
      credits_log: false,
    },
    storageBucket: false,
    errors: [],
  });

  useEffect(() => {
    const checkStatus = async () => {
      const errors: string[] = [];

      // Check 1: Supabase Connection
      let connected = false;
      try {
        const { data, error } = await supabaseClient.from('projects').select('count()').limit(1);
        connected = !error;
        if (error && error.code === 'PGRST116') {
          errors.push('Projects table does not exist');
        } else if (error) {
          errors.push(`Supabase error: ${error.message}`);
        }
      } catch (e) {
        errors.push(`Connection failed: ${e}`);
      }

      // Check 2: Tables
      const tableChecks = {
        projects: false,
        campaigns: false,
        generated_images: false,
        credits_log: false,
      };

      for (const table of Object.keys(tableChecks) as Array<keyof typeof tableChecks>) {
        try {
          const { error } = await supabaseClient.from(table).select('count()').limit(1);
          tableChecks[table] = !error;
        } catch {
          tableChecks[table] = false;
        }
      }

      // Check 3: Storage Bucket
      let bucketExists = false;
      try {
        const { data: buckets, error } = await supabaseClient.storage.listBuckets();
        bucketExists = !!buckets?.find(b => b.name === 'generated-ads');
        if (!bucketExists) {
          errors.push('Storage bucket "generated-ads" does not exist');
        }
      } catch (e) {
        errors.push(`Storage check failed: ${e}`);
      }

      setStatus({
        supabaseConnected: connected,
        tablesExist: tableChecks,
        storageBucket: bucketExists,
        errors,
      });
    };

    checkStatus();
  }, []);

  const allGood = 
    status.supabaseConnected && 
    Object.values(status.tablesExist).every(v => v) && 
    status.storageBucket &&
    status.errors.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Database Status</h1>
        <p className="text-slate-400 mb-8">Debug panel to verify your Supabase setup</p>

        {/* Overall Status */}
        <Card className={`mb-6 border-2 ${allGood ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'}`}>
          <CardHeader>
            <CardTitle className={allGood ? 'text-green-400' : 'text-red-400'}>
              {allGood ? '✅ All Systems Go!' : '❌ Setup Required'}
            </CardTitle>
            <CardDescription>
              {allGood ? 'Your database is properly configured' : 'Some components are missing'}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Connection Status */}
        <Card className="mb-6 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status.supabaseConnected ? '✅' : '❌'} Supabase Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300">
              {status.supabaseConnected
                ? 'Connected to Supabase successfully'
                : 'Cannot connect to Supabase. Check your .env.local keys.'}
            </p>
          </CardContent>
        </Card>

        {/* Tables Status */}
        <Card className="mb-6 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle>Database Tables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(status.tablesExist).map(([table, exists]) => (
              <div key={table} className="flex items-center justify-between">
                <span className="text-slate-300 font-mono">{table}</span>
                <span className={exists ? 'text-green-400' : 'text-red-400'}>
                  {exists ? '✅ Exists' : '❌ Missing'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Storage Status */}
        <Card className="mb-6 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status.storageBucket ? '✅' : '❌'} Storage Bucket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300">
              {status.storageBucket
                ? 'Bucket "generated-ads" exists and is ready'
                : 'Storage bucket not found'}
            </p>
          </CardContent>
        </Card>

        {/* Errors */}
        {status.errors.length > 0 && (
          <Card className="mb-6 bg-red-900/20 border-red-500">
            <CardHeader>
              <CardTitle className="text-red-400">⚠️ Issues Found</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {status.errors.map((error, i) => (
                  <li key={i} className="text-red-200 flex gap-2">
                    <span>•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!allGood && (
          <Card className="mb-6 bg-blue-900/20 border-blue-500">
            <CardHeader>
              <CardTitle className="text-blue-400">What to Do</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-blue-100">
              <p>1. Read: <code className="bg-slate-700 px-2 py-1 rounded">DATABASE_SETUP_QUICK_GUIDE.md</code></p>
              <p>2. Copy & run: <code className="bg-slate-700 px-2 py-1 rounded">SETUP_DATABASE.sql</code> in Supabase SQL Editor</p>
              <p>3. Return here to verify ✨</p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button onClick={() => window.location.reload()}>Refresh Status</Button>
          <Button asChild variant="outline">
            <a href="/dashboard">Go to Dashboard</a>
          </Button>
          <Button asChild variant="outline">
            <a href="/">Back Home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
