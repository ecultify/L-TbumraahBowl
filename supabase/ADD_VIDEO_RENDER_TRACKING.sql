-- ============================================
-- VIDEO RENDER TRACKING TABLE
-- Persist video rendering status to survive tab closes
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
  render_type TEXT DEFAULT 'lambda', -- 'lambda' or 'local'
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

-- RLS Policies (allow public read/write for now)
ALTER TABLE public.video_render_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert" ON public.video_render_jobs;
DROP POLICY IF EXISTS "Allow public read" ON public.video_render_jobs;
DROP POLICY IF EXISTS "Allow public update" ON public.video_render_jobs;

CREATE POLICY "Allow public insert"
ON public.video_render_jobs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public read"
ON public.video_render_jobs
FOR SELECT
USING (true);

CREATE POLICY "Allow public update"
ON public.video_render_jobs
FOR UPDATE
USING (true);

-- Add comments
COMMENT ON TABLE public.video_render_jobs IS 
  'Tracks video rendering jobs to persist status even if user closes tab';

COMMENT ON COLUMN public.video_render_jobs.render_id IS 
  'Unique render ID from Remotion Lambda or local render server';

COMMENT ON COLUMN public.video_render_jobs.render_status IS 
  'Current status: rendering, completed, or failed';

COMMENT ON COLUMN public.video_render_jobs.video_url IS 
  'Final video URL from Supabase storage when rendering is complete';

-- View: In-progress renders
CREATE OR REPLACE VIEW public.video_renders_in_progress AS
SELECT
  id,
  render_id,
  render_status,
  render_progress,
  user_name,
  user_phone,
  render_started_at,
  extract(epoch from (now() - render_started_at))::integer as seconds_elapsed
FROM
  public.video_render_jobs
WHERE
  render_status = 'rendering'
  AND render_started_at > now() - interval '2 hours' -- Only recent renders
ORDER BY
  render_started_at DESC;

-- View: Completed renders ready for pickup
CREATE OR REPLACE VIEW public.video_renders_completed AS
SELECT
  vr.id,
  vr.render_id,
  vr.video_url,
  vr.user_name,
  vr.user_phone,
  vr.render_completed_at,
  vr.bowling_attempt_id,
  ba.display_name,
  ba.predicted_kmh,
  ba.similarity_percent
FROM
  public.video_render_jobs vr
LEFT JOIN
  public.bowling_attempts ba ON vr.bowling_attempt_id = ba.id
WHERE
  vr.render_status = 'completed'
  AND vr.video_url IS NOT NULL
ORDER BY
  vr.render_completed_at DESC;

-- Cleanup: Delete old failed renders (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_render_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.video_render_jobs
  WHERE render_status = 'failed'
    AND created_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  table_name,
  column_name,
  data_type
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public' 
  AND table_name = 'video_render_jobs'
ORDER BY 
  ordinal_position;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ VIDEO RENDER TRACKING SETUP COMPLETE!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Created:';
  RAISE NOTICE '   ✓ video_render_jobs table';
  RAISE NOTICE '   ✓ Indexes for fast lookups';
  RAISE NOTICE '   ✓ Auto-update timestamp trigger';
  RAISE NOTICE '   ✓ RLS policies for public access';
  RAISE NOTICE '   ✓ Views for monitoring renders';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Benefits:';
  RAISE NOTICE '   → Render survives tab close';
  RAISE NOTICE '   → User can retrieve video later';
  RAISE NOTICE '   → Monitor all in-progress renders';
  RAISE NOTICE '   → Automatic cleanup of old failed renders';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Monitoring Queries:';
  RAISE NOTICE '   → SELECT * FROM video_renders_in_progress';
  RAISE NOTICE '   → SELECT * FROM video_renders_completed';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Recovery Flow:';
  RAISE NOTICE '   1. User closes tab during render';
  RAISE NOTICE '   2. Render completes in background';
  RAISE NOTICE '   3. video_url saved to database';
  RAISE NOTICE '   4. User can retrieve via phone number';
  RAISE NOTICE '';
END $$;

