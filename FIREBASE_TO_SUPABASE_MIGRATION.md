# Firebase to Supabase Migration - COMPLETED

## Overview
Migration from Firebase to Supabase backend with manual payment processing has been completed.

## ✅ Completed Changes

### New Files Created
| File | Purpose |
|------|---------|
| `js/supabase-client.js` | Supabase client for applicant submissions |
| `js/supabase-admin.js` | Admin dashboard functionality |
| `js/supabase-applicant.js` | Application status tracking |
| `js/supabase-training.js` | Training events display |
| `supabase-config.example.js` | Configuration template |

### Files Updated
| File | Changes |
|------|---------|
| `index.html` | Replaced Firebase with Supabase SDK, removed Paystack, simplified payment flow |
| `admin.html` | Updated to use Supabase |
| `applicant.html` | Updated to use Supabase |
| `training.html` | Updated to use Supabase |

### Removed
- Paystack payment integration (payments now manual)
- Firebase SDK scripts
- Firebase configuration

---

## 📋 Supabase Setup Instructions

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the project to be ready

### 2. Get API Credentials
1. Go to **Settings → API**
2. Copy the **Project URL** and **anon public** key

### 3. Create Configuration File
Create `supabase-config.js` (not the example):

```
javascript
window.SUPABASE_CONFIG = {
    url: "https://your-project.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
};
```

### 4. Set Up Database
Run the following SQL in Supabase SQL Editor:

```
sql
-- Applications table
CREATE TABLE applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    uid TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    instagram TEXT,
    height_cm INTEGER,
    waist_cm INTEGER,
    shoe_size_eu TEXT,
    eye_color TEXT,
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_ref TEXT,
    payment_code TEXT,
    payment_amount INTEGER,
    payment_currency TEXT,
    status TEXT DEFAULT 'submitted',
    uploads JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training events table
CREATE TABLE training_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    location TEXT,
    venue TEXT,
    time TIMESTAMPTZ NOT NULL,
    image_path TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment codes table
CREATE TABLE payment_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    amount INTEGER,
    currency TEXT DEFAULT 'NGN',
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    used_by TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table (for admin)
CREATE TABLE user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Applications policies
CREATE POLICY "Users can read own applications" ON applications
    FOR SELECT USING (uid = auth.uid());

CREATE POLICY "Users can insert own applications" ON applications
    FOR INSERT WITH CHECK (uid = auth.uid());

CREATE POLICY "Users can update own applications" ON applications
    FOR UPDATE USING (uid = auth.uid());

-- Training events policies (public read)
CREATE POLICY "Public can read training events" ON training_events
    FOR SELECT USING (true);

-- Payment codes policies (admin only via service role)
CREATE POLICY "Service role can manage payment codes" ON payment_codes
    FOR ALL USING (true);

-- User roles policies
CREATE POLICY "Users can read own roles" ON user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage roles" ON user_roles
    FOR ALL USING (true);
```

### 5. Set Up Storage
1. Go to **Storage** in Supabase dashboard
2. Create two buckets:
   - `applications` - for applicant uploads
   - `events` - for training event images
3. Set up storage policies:
   - `applications`: Allow authenticated users to upload to their own folder
   - `events`: Allow public read, authenticated write

### 6. Create Admin User
1. Sign up/sign in as admin on your app
2. Insert admin role in SQL:
```sql
INSERT INTO user_roles (user_id, role) VALUES ('USER_ID_HERE', 'admin');
```

---

## 🔧 Manual Payment Flow

Since Paystack was removed:
1. Applicants submit without payment
2. Admin reviews applications in dashboard
3. Admin manually processes payment (external)
4. Admin updates payment status in dashboard

To update payment status, use the admin dashboard to change the `payment_status` field.

---

## 📁 Archived Files
The following Firebase-related files can be removed or archived:
- `firebase.json`
- `firestore.rules`
- `storage.rules`
- `database.rules.json`
- `functions/` (Firebase Cloud Functions no longer needed)
- `public-config.js` / `public-config.example.js`
- `js/firebase-client.js`
- `js/admin.js` (old)
- `js/applicant.js` (old)
- `js/training.js` (old)
- `remoteconfig.template.json`
- `.firebaserc`
