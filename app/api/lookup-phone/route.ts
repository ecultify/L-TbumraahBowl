import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeVideoUrl } from '@/lib/utils/urlNormalization';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    // Validate phone number
    if (!phone || !/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Valid 10-digit phone number is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Phone Lookup] Supabase not configured', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey
      });
      // Return success with exists: false to not block the flow
      return NextResponse.json({
        exists: false,
        message: 'Phone lookup service unavailable'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Phone Lookup] Checking phone:', phone);

    // Get latest record for this phone number
    const { data, error } = await supabase
      .from('bowling_attempts')
      .select('id, composite_card_url, video_url, display_name, retry_count, created_at, similarity_percent')
      .eq('phone_number', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid error when no record

    if (error) {
      console.error('[Phone Lookup] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to lookup phone number' },
        { status: 500 }
      );
    }

    // If no record found
    if (!data) {
      console.log('[Phone Lookup] Phone not found in database');
      return NextResponse.json({
        exists: false,
        message: 'Phone number not found'
      });
    }

    // Record found - return details
    console.log('[Phone Lookup] Found record:', {
      id: data.id,
      hasCompositeCard: !!data.composite_card_url,
      hasVideo: !!data.video_url,
      retryCount: data.retry_count
    });

    // Also get the composite card record ID
    let compositeCardRecordId = null;
    try {
      const { data: compositeCardData } = await supabase
        .from('composite_cards')
        .select('id')
        .eq('phone_number', phone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (compositeCardData) {
        compositeCardRecordId = compositeCardData.id;
        console.log('[Phone Lookup] Found composite card record:', compositeCardRecordId);
      }
    } catch (compositeError) {
      console.warn('[Phone Lookup] Could not fetch composite card record:', compositeError);
      // Don't fail the whole request, just continue without composite card ID
    }

    // ⚠️ CRITICAL: Normalize URLs before sending to client
    // This fixes malformed URLs like "https//..." that browsers prepend domain to
    let normalizedVideoUrl = data.video_url;
    let normalizedCompositeUrl = data.composite_card_url;

    if (data.video_url) {
      const normalized = normalizeVideoUrl(data.video_url);
      if (normalized) {
        normalizedVideoUrl = normalized;
        console.log('[Phone Lookup] ✅ Normalized video URL');
      } else {
        console.warn('[Phone Lookup] ⚠️ Video URL normalization failed, using original');
      }
    }

    if (data.composite_card_url) {
      const normalized = normalizeVideoUrl(data.composite_card_url);
      if (normalized) {
        normalizedCompositeUrl = normalized;
        console.log('[Phone Lookup] ✅ Normalized composite card URL');
      } else {
        console.warn('[Phone Lookup] ⚠️ Composite URL normalization failed, using original');
      }
    }

    return NextResponse.json({
      success: true,
      exists: true,
      recordId: data.id,
      compositeCardRecordId: compositeCardRecordId, // 🆕 Add composite card record ID
      hasCompositeCard: !!normalizedCompositeUrl,
      hasVideo: !!normalizedVideoUrl,
      compositeCardUrl: normalizedCompositeUrl,
      videoUrl: normalizedVideoUrl,
      similarityPercent: data.similarity_percent,
      displayName: data.display_name,
      retryCount: data.retry_count || 0,
      lastAttempt: data.created_at
    });

  } catch (error: any) {
    console.error('[Phone Lookup] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

