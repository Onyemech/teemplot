-- Demo videos table for landing page
-- Allows superadmin to upload and manage demo videos

CREATE TABLE IF NOT EXISTS demo_videos (
  id TEXT PRIMARY KEY,
  video_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Index for active videos
CREATE INDEX IF NOT EXISTS idx_demo_videos_active ON demo_videos(is_active);
CREATE INDEX IF NOT EXISTS idx_demo_videos_created_at ON demo_videos(created_at);
