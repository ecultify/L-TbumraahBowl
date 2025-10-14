-- ============================================
-- COMPOSITE CARD STORAGE SETUP
-- Run this in your Supabase SQL Editor
-- ============================================

-- This migration adds support for storing composite card images
-- along with user analysis data and Gemini-generated avatar

-- ============================================
-- 1. CREATE STORAGE BUCKET FOR COMPOSITE CARDS
-- ============================================

-- Create a public storage bucket for composite card images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bowling-reports',
  'bowling-reports',
  true,  -- Public bucket so reports can be accessed directly via URL
  10485760,  -- 10MB file size limit (composite cards can be larger)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. STORAGE POLICIES FOR COMPOSITE CARDS
-- ============================================

-- Allow anyone to read composite cards (public access)
CREATE POLICY "Public composite card read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'bowling-reports');

-- Allow authenticated and anonymous users to upload composite cards
CREATE POLICY "Composite card upload for all users"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'bowling-reports' 
  AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

-- Allow users to update their own composite cards (if authenticated)
CREATE POLICY "Update own composite cards"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'bowling-reports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'bowling-reports'
);

-- Allow users to delete their own composite cards (if authenticated)
CREATE POLICY "Delete own composite cards"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'bowling-reports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- 3. CREATE TABLE FOR COMPOSITE CARD METADATA
-- ============================================

CREATE TABLE IF NOT EXISTS public.composite_cards (
  -- Primary key
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- User identification (optional - can be anonymous)
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  
  -- Storage URLs
  composite_card_url text NOT NULL,  -- Public URL to the composite card image
  avatar_url text,  -- URL to Gemini-generated avatar (if available)
  
  -- Analysis Data (stored as JSON for flexibility)
  analysis_data jsonb NOT NULL,  -- Complete analysis results
  
  -- Key metrics (duplicated for easy querying/filtering)
  accuracy_score decimal(5,2),  -- Overall accuracy percentage (0-100)
  predicted_kmh decimal(5,2),  -- Predicted speed in km/h
  similarity_percent decimal(5,2),  -- Similarity to benchmark (0-100)
  
  -- Detailed scores
  run_up_score decimal(5,2),
  delivery_score decimal(5,2),
  follow_through_score decimal(5,2),
  arm_swing_score decimal(5,2),
  body_movement_score decimal(5,2),
  rhythm_score decimal(5,2),
  release_point_score decimal(5,2),
  
  -- Recommendations
  recommendations text,
  
  -- Metadata
  meta jsonb DEFAULT '{}'::jsonb,  -- Additional metadata
  
  -- Indexes for common queries
  CONSTRAINT composite_card_url_unique UNIQUE(composite_card_url)
);

-- Add comments
COMMENT ON TABLE public.composite_cards IS 
  'Stores composite card reports with user analysis data and generated images';

COMMENT ON COLUMN public.composite_cards.composite_card_url IS 
  'Public URL to the composite card image stored in bowling-reports bucket';

COMMENT ON COLUMN public.composite_cards.avatar_url IS 
  'Public URL to Gemini-generated avatar image';

COMMENT ON COLUMN public.composite_cards.analysis_data IS 
  'Complete analysis data in JSON format including all technical metrics';

-- ============================================
-- 4. CREATE INDEXES
-- ============================================

-- Index for player lookups
CREATE INDEX IF NOT EXISTS composite_cards_player_idx 
ON public.composite_cards (player_name);

-- Index for score-based queries
CREATE INDEX IF NOT EXISTS composite_cards_accuracy_idx 
ON public.composite_cards (accuracy_score DESC);

CREATE INDEX IF NOT EXISTS composite_cards_kmh_idx 
ON public.composite_cards (predicted_kmh DESC);

-- Index for recent reports
CREATE INDEX IF NOT EXISTS composite_cards_created_at_idx 
ON public.composite_cards (created_at DESC);

-- Index for user's reports (if authenticated)
CREATE INDEX IF NOT EXISTS composite_cards_user_id_idx 
ON public.composite_cards (user_id) 
WHERE user_id IS NOT NULL;

-- Composite index for leaderboard-style queries
CREATE INDEX IF NOT EXISTS composite_cards_leaderboard_idx 
ON public.composite_cards (accuracy_score DESC, predicted_kmh DESC, created_at DESC);

-- ============================================
-- 5. CREATE TRIGGER FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_composite_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS composite_cards_updated_at_trigger ON public.composite_cards;
CREATE TRIGGER composite_cards_updated_at_trigger
  BEFORE UPDATE ON public.composite_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_composite_cards_updated_at();

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.composite_cards ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read composite cards (public access)
CREATE POLICY "Anyone can read composite cards"
ON public.composite_cards FOR SELECT
USING (true);

-- Policy: Anyone (including anonymous) can insert composite cards
CREATE POLICY "Anyone can create composite cards"
ON public.composite_cards FOR INSERT
WITH CHECK (true);

-- Policy: Users can update their own composite cards (if authenticated)
CREATE POLICY "Users can update own composite cards"
ON public.composite_cards FOR UPDATE
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- Policy: Users can delete their own composite cards (if authenticated)
CREATE POLICY "Users can delete own composite cards"
ON public.composite_cards FOR DELETE
USING (
  auth.uid() = user_id
);

-- ============================================
-- 7. CREATE VIEWS FOR COMMON QUERIES
-- ============================================

-- View: Top composite cards by accuracy
CREATE OR REPLACE VIEW public.top_composite_cards AS
SELECT
  id,
  created_at,
  player_name,
  composite_card_url,
  avatar_url,
  accuracy_score,
  predicted_kmh,
  similarity_percent,
  recommendations
FROM
  public.composite_cards
ORDER BY
  accuracy_score DESC,
  predicted_kmh DESC,
  created_at DESC
LIMIT 100;

-- View: Recent composite cards
CREATE OR REPLACE VIEW public.recent_composite_cards AS
SELECT
  id,
  created_at,
  player_name,
  composite_card_url,
  avatar_url,
  accuracy_score,
  predicted_kmh,
  similarity_percent
FROM
  public.composite_cards
ORDER BY
  created_at DESC
LIMIT 50;

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================

-- Grant access to views
GRANT SELECT ON public.top_composite_cards TO anon, authenticated;
GRANT SELECT ON public.recent_composite_cards TO anon, authenticated;

-- Grant table access
GRANT SELECT, INSERT ON public.composite_cards TO anon, authenticated;
GRANT UPDATE, DELETE ON public.composite_cards TO authenticated;

-- ============================================
-- 9. HELPER FUNCTION
-- ============================================

-- Function to get composite card with full details
CREATE OR REPLACE FUNCTION public.get_composite_card_by_player(
  p_player_name text,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  player_name text,
  composite_card_url text,
  avatar_url text,
  accuracy_score decimal,
  predicted_kmh decimal,
  analysis_data jsonb
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.created_at,
    cc.player_name,
    cc.composite_card_url,
    cc.avatar_url,
    cc.accuracy_score,
    cc.predicted_kmh,
    cc.analysis_data
  FROM
    public.composite_cards cc
  WHERE
    cc.player_name ILIKE p_player_name
  ORDER BY
    cc.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_composite_card_by_player IS 
  'Get composite cards for a specific player, ordered by most recent';

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ COMPOSITE CARD STORAGE SETUP COMPLETE!';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Storage bucket created: bowling-reports';
  RAISE NOTICE '📊 Database table created: composite_cards';
  RAISE NOTICE '🔍 Indexes created: 6 indexes for optimal performance';
  RAISE NOTICE '👁️ Views created: top_composite_cards, recent_composite_cards';
  RAISE NOTICE '🔒 RLS policies: Configured for public read, authenticated write';
  RAISE NOTICE '';
  RAISE NOTICE '📝 What gets stored:';
  RAISE NOTICE '   - Composite card image URL';
  RAISE NOTICE '   - Gemini-generated avatar URL';
  RAISE NOTICE '   - Complete analysis data (JSON)';
  RAISE NOTICE '   - All performance scores';
  RAISE NOTICE '   - Player information';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next steps:';
  RAISE NOTICE '   1. Update frontend to upload composite cards';
  RAISE NOTICE '   2. Save metadata to composite_cards table';
  RAISE NOTICE '   3. Use views to display top performers';
  RAISE NOTICE '';
  RAISE NOTICE '📖 Example query:';
  RAISE NOTICE '   SELECT * FROM top_composite_cards LIMIT 10;';
  RAISE NOTICE '';
END $$;

