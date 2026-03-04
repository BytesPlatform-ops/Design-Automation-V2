# 🗄️ Quick Database Setup Guide

## The Issue
Your Supabase tables don't exist yet. The schema was defined but never created in the database.

## Solution: Create Tables in 3 Steps

### Step 1: Open Supabase SQL Editor
1. Go to [supabase.com/dashboard](https://app.supabase.com)
2. Login with your account
3. Select project **"design_automation_v3"**
4. Click **"SQL Editor"** (left sidebar)
5. Click **"New Query"**

### Step 2: Copy & Paste the SQL Schema

Open the file **`SETUP_DATABASE.sql`** in this project and copy all the SQL code.

Paste it into the Supabase SQL Editor and click **"Run"** (or Cmd+Enter).

**✅ You should see:** "16 statements executed successfully"

### Step 3: Verify Tables Were Created

In the Supabase dashboard, go to **"Table Editor"** (left sidebar) and verify you see these 5 tables:
- `projects` ✓
- `campaigns` ✓
- `generated_images` ✓
- `credits_log` ✓
- `storage.buckets` (system table)

## What Gets Created

### Tables
| Table | Purpose |
|-------|---------|
| `projects` | Stores business/campaign projects |
| `campaigns` | Stores individual ad campaigns per project |
| `generated_images` | Stores references to generated ads (links to cloud storage) |
| `credits_log` | Tracks ad generation usage (for future billing) |

### Indexes (for speed)
- `idx_projects_user_id` — Fast user lookups
- `idx_campaigns_project_id` — Fast project lookups
- `idx_generated_images_campaign_id` — Fast campaign lookups
- `idx_credits_log_user_id` — Fast credit lookups

### Storage Bucket
- `generated-ads` — Public bucket for storing generated ad images

### Policies (Row Level Security)
- All tables set to "Allow all" (wide open for now)
- Storage policies allow public read + upload + delete

## After Setup

After running the SQL:

1. **Refresh your browser** (Cmd+R)
2. **Go to `/dashboard`**
3. **Create a new ad campaign** via `/create`
4. **Projects should now appear** on the dashboard! ✨

## Troubleshooting

### "Table already exists" error
- The tables already exist from a previous run
- This is fine - just continue
- Or run: `DROP TABLE IF EXISTS generated_images CASCADE;` etc. first

### "RLS policy already exists" error
- Same as above - you're running the script twice
- Safe to ignore

### Still getting "Could not find table" after running SQL
1. Make sure you ran the SQL in the **correct** Supabase project
2. Check project name in dashboard matches "design_automation_v3"
3. Verify API keys in `.env.local` are from that same project
4. Try refreshing the page

### Storage bucket not created
- Run manually:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-ads', 'generated-ads', true)
ON CONFLICT (id) DO NOTHING;
```

## Next: Implement Authentication *(Optional)*

Once tables are working, add real user authentication:

```typescript
// Replace temp user ID with:
const user = await supabaseClient.auth.getUser();
const userId = user.id;
```

This requires:
1. Enabling Supabase Auth in dashboard
2. Adding login/signup UI
3. Updating RLS policies to restrict by user

---

**Total time:** ~2 minutes to copy-paste and run SQL
**Result:** Full data persistence! 🚀
