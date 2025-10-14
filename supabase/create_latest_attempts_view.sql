-- =====================================================
-- CREATE VIEW: Latest Bowling Attempts (One Per User)
-- =====================================================
-- 
-- This view shows only the LATEST attempt for each unique phone number
-- When users retry, only their most recent attempt appears on the leaderboard
--
-- Usage: SELECT * FROM latest_bowling_attempts ORDER BY predicted_kmh DESC;
-- =====================================================

-- Drop the view if it already exists
DROP VIEW IF EXISTS public.latest_bowling_attempts;

-- Create the view
CREATE VIEW public.latest_bowling_attempts AS
WITH ranked_attempts AS (
  SELECT 
    *,
    ROW_NUMBER() OVER (
      PARTITION BY phone_number 
      ORDER BY created_at DESC
    ) as rn
  FROM public.bowling_attempts
  WHERE phone_number IS NOT NULL  -- Only include records with phone numbers
)
SELECT 
  id,
  created_at,
  updated_at,
  name,
  display_name,
  phone_number,
  otp_verified,
  otp_phone,
  predicted_kmh,
  similarity_percent,
  intensity_percent,
  speed_class,
  accuracy_score,
  composite_card_url,
  avatar_url,
  video_url,
  meta,
  retry_count
FROM ranked_attempts
WHERE rn = 1  -- Only take the most recent record for each phone number
ORDER BY predicted_kmh DESC, similarity_percent DESC;

-- Grant access to authenticated users
GRANT SELECT ON public.latest_bowling_attempts TO authenticated;
GRANT SELECT ON public.latest_bowling_attempts TO anon;

-- Add comment
COMMENT ON VIEW public.latest_bowling_attempts IS 
'Shows only the latest bowling attempt for each unique phone number. Used by leaderboard to prevent duplicate entries when users retry.';

