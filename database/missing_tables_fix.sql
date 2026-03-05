-- ============================================================
-- MISSING TABLES FIX
-- Run this in your Supabase SQL Editor to add the missing tables
-- that are causing 404 errors on localhost and Netlify.
-- ============================================================

-- 1. Staff Permissions Table
CREATE TABLE IF NOT EXISTS staff_permissions (
    id TEXT PRIMARY KEY,
    staff_id TEXT REFERENCES staff(id) ON DELETE CASCADE,
    type TEXT,
    start_date DATE,
    end_date DATE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Events Table
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT,
    date TEXT,
    type TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Daily Logs Table (Guard dashboard)
CREATE TABLE IF NOT EXISTS daily_logs (
    id TEXT PRIMARY KEY,
    staff_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
    type TEXT,
    person_name TEXT,
    purpose TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Incident Reports Table (Guard dashboard)
CREATE TABLE IF NOT EXISTS incident_reports (
    id TEXT PRIMARY KEY,
    staff_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
    title TEXT,
    description TEXT,
    severity TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Room Statuses Table (Cleaner dashboard)
CREATE TABLE IF NOT EXISTS room_statuses (
    id TEXT PRIMARY KEY,
    room_name TEXT,
    status TEXT,
    last_updated_by TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- Enable Row Level Security (RLS) - Safe open policy for now
-- ============================================================
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_statuses ENABLE ROW LEVEL SECURITY;

-- Allow all operations (anon key) - same as your other tables
CREATE POLICY IF NOT EXISTS "Allow all for staff_permissions" ON staff_permissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for daily_logs" ON daily_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for incident_reports" ON incident_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for room_statuses" ON room_statuses FOR ALL USING (true) WITH CHECK (true);
