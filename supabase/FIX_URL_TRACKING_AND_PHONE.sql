-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX URL TRACKING AND ADD PHONE NUMBER TO COMPOSITE_CARDS
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Add phone_number column to composite_cards table
ALTER TABLE public.composite_cards
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 2. Create index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS composite_cards_phone_number_idx
ON public.composite_cards(phone_number);

-- 3. Add display_name column if it doesn't exist (for consistency)
ALTER TABLE public.composite_cards
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 4. Add comments
COMMENT ON COLUMN public.composite_cards.phone_number IS 'User phone number (from details page)';
COMMENT ON COLUMN public.composite_cards.display_name IS 'User display name (from details page)';

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFY bowling_attempts table structure
-- ═══════════════════════════════════════════════════════════════════════════════

-- Check that bowling_attempts has the URL columns
DO $$
BEGIN
    -- Check composite_card_url exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'bowling_attempts'
        AND column_name = 'composite_card_url'
    ) THEN
        ALTER TABLE public.bowling_attempts
        ADD COLUMN composite_card_url TEXT;
    END IF;
    
    -- Check video_url exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'bowling_attempts'
        AND column_name = 'video_url'
    ) THEN
        ALTER TABLE public.bowling_attempts
        ADD COLUMN video_url TEXT;
    END IF;
    
    -- Check whatsapp_sent exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'bowling_attempts'
        AND column_name = 'whatsapp_sent'
    ) THEN
        ALTER TABLE public.bowling_attempts
        ADD COLUMN whatsapp_sent BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Check composite_cards columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'composite_cards'
AND column_name IN ('phone_number', 'display_name', 'composite_card_url', 'player_name')
ORDER BY column_name;

-- Check bowling_attempts columns  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'bowling_attempts'
AND column_name IN ('id', 'phone_number', 'display_name', 'composite_card_url', 'video_url', 'whatsapp_sent')
ORDER BY column_name;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SUCCESS MESSAGE
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '  1. Added phone_number column to composite_cards';
    RAISE NOTICE '  2. Added display_name column to composite_cards';
    RAISE NOTICE '  3. Created index on phone_number';
    RAISE NOTICE '  4. Verified bowling_attempts has all URL columns';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Next steps:';
    RAISE NOTICE '  1. Update compositeCardUpload.ts to save phone_number';
    RAISE NOTICE '  2. Debug why UPDATE to bowling_attempts is failing';
    RAISE NOTICE '  3. Test with new data';
END $$;

