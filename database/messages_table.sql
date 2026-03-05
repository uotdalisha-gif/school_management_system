-- ============================================================
-- MESSAGES TABLE for internal staff ↔ admin communication
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,           -- staff ID or 'admin'
    sender_name TEXT NOT NULL,
    recipient_id TEXT NOT NULL,        -- staff ID or 'admin' or 'all'
    type TEXT DEFAULT 'text',          -- text | leave_request | sick_report | incident | announcement
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',       -- { start_date, end_date, leave_type, status, severity }
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow all for messages" ON messages FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS messages_recipient_idx ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC);
