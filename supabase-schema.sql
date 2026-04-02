-- AstroDecide Supabase Schema
-- Run this in your Supabase SQL editor

-- User profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,                   -- Supabase auth UUID or "demo-user"
  name TEXT NOT NULL,
  dob TEXT NOT NULL,                     -- DD/MM/YYYY
  tob TEXT NOT NULL,                     -- HH:MM
  pob TEXT NOT NULL,                     -- Place of birth text
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  tzone DOUBLE PRECISION DEFAULT 5.5,
  ascendant_sign TEXT,
  sun_sign TEXT,
  moon_sign TEXT,
  chart_data JSONB,                      -- Full planet positions from AstrologyAPI
  dasha_data JSONB,                      -- Dasha periods
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat history table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily insights cache table
CREATE TABLE IF NOT EXISTS daily_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  insights JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, date)
);

-- RLS Policies (enable Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_insights ENABLE ROW LEVEL SECURITY;

-- For MVP demo: allow all operations (tighten for production)
CREATE POLICY "Allow all for demo" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow all for demo" ON chat_messages FOR ALL USING (true);
CREATE POLICY "Allow all for demo" ON daily_insights FOR ALL USING (true);
