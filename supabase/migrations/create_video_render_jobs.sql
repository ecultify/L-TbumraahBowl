-- ============================================
-- VIDEO RENDER JOBS TABLE
-- Persist video rendering status to survive server restarts
-- ============================================

-- Create table to track video rendering progress
CREATE TABLE IF NOT EXISTS public.video_render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Link to bowling attempt
  bowling_attempt_id UUID REFERENCES public.bowling_attempts(id) ON DELETE CASCADE,
  
  -- Render details
  render_id TEXT NOT NULL UNIQUE, -- Remotion/Lambda render ID
  render_status TEXT DEFAULT 'rendering', -- 'rendering', 'completed', 'failed'
  render_progress INTEGER DEFAULT 0, -- 0-100
  
  -- Results
  video_url TEXT, -- Final video URL when complete
  error_message TEXT, -- Error if failed
  
  -- Metadata
  render_type TEXT DEFAULT 'local', -- 'lambda' or 'local'
  render_started_at TIMESTAMPTZ DEFAULT now(),
  render_completed_at TIMESTAMPTZ,
  
  -- User info (for recovery)
  user_phone TEXT,
  user_name TEXT
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS video_render_jobs_render_id_idx 
ON public.video_render_jobs(render_id);

CREATE INDEX IF NOT EXISTS video_render_jobs_status_idx 
ON public.video_render_jobs(render_status);

CREATE INDEX IF NOT EXISTS video_render_jobs_bowling_attempt_idx 
ON public.video_render_jobs(bowling_attempt_id);

CREATE INDEX IF NOT EXISTS video_render_jobs_phone_idx 
ON public.video_render_jobs(user_phone);

-- Auto-update timestamp on changes
CREATE OR REPLACE FUNCTION update_video_render_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_render_jobs_updated_at_trigger
BEFORE UPDATE ON public.video_render_jobs
FOR EACH ROW
EXECUTE FUNCTION update_video_render_jobs_updated_at();

-- RLS Policies (allow public read/write for now, tighten later)
ALTER TABLE public.video_render_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.video_render_jobs
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON public.video_render_jobs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON public.video_render_jobs
  FOR UPDATE USING (true);

COMMENT ON TABLE public.video_render_jobs IS 'Tracks video rendering jobs to survive server restarts and allow polling recovery';
COMMENT ON COLUMN public.video_render_jobs.render_id IS 'Unique render ID from Remotion (e.g., local-1234567890)';
COMMENT ON COLUMN public.video_render_jobs.video_url IS 'Final Supabase video URL when render completes';

