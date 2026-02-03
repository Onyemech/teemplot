-- Drop tables if they exist to ensure clean state
DROP TABLE IF EXISTS video_audit_logs;
DROP TABLE IF EXISTS demo_videos;

-- Create demo_videos table
CREATE TABLE demo_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('demo', 'tutorial', 'app_install')),
  tags TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Add indexes
CREATE INDEX idx_demo_videos_category ON demo_videos(category);
CREATE INDEX idx_demo_videos_is_active ON demo_videos(is_active);

-- Create audit_logs table
CREATE TABLE video_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES demo_videos(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  performed_by UUID REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
