import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://hqzukyxnnjnstrecybzx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxenVreXhubmpuc3RyZWN5Ynp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTM4OTIsImV4cCI6MjA3MzA2OTg5Mn0.-FaJuxBuwxk5L-WCYKv--Vmq0g_aPBjGOTBKgwTrcOI';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 📊 ADMIN ANALYTICS API
 * 
 * Returns comprehensive analytics from bowling_attempts table:
 * - Total attempts
 * - Unique phone numbers (unique users)
 * - Composite cards generated
 * - Videos generated
 * - WhatsApp messages sent
 * - Completion funnel stats
 */
export async function GET(request: NextRequest) {
  try {
    // Check for admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET || 'bumrah-admin-2025'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Admin Analytics] Fetching analytics data...');

    // Fetch all bowling attempts
    const { data: attempts, error } = await supabase
      .from('bowling_attempts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin Analytics] Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!attempts) {
      return NextResponse.json({
        totalAttempts: 0,
        uniqueUsers: 0,
        compositeCardsGenerated: 0,
        videosGenerated: 0,
        whatsappMessagesSent: 0,
        completionFunnel: {
          started: 0,
          withCompositeCard: 0,
          withVideo: 0,
          withWhatsApp: 0,
          completionRate: 0
        },
        dropoffAnalysis: {
          noCompositeCard: 0,
          noVideo: 0,
          noWhatsApp: 0
        }
      });
    }

    // Calculate analytics
    const totalAttempts = attempts.length;
    
    // Unique phone numbers
    const uniquePhones = new Set(attempts.map(a => a.phone_number).filter(Boolean));
    const uniqueUsers = uniquePhones.size;

    // Composite cards generated (count non-null composite_card_url)
    const compositeCardsGenerated = attempts.filter(a => a.composite_card_url).length;

    // Videos generated (count non-null video_url)
    const videosGenerated = attempts.filter(a => a.video_url).length;

    // WhatsApp messages sent
    const whatsappMessagesSent = attempts.filter(a => a.whatsapp_sent === true).length;

    // Completion funnel
    const withCompositeCard = attempts.filter(a => a.composite_card_url).length;
    const withVideo = attempts.filter(a => a.video_url).length;
    const withWhatsApp = attempts.filter(a => a.whatsapp_sent === true).length;
    const completionRate = totalAttempts > 0 
      ? Math.round((withWhatsApp / totalAttempts) * 100) 
      : 0;

    // Dropoff analysis
    const noCompositeCard = totalAttempts - withCompositeCard;
    const noVideo = withCompositeCard - withVideo;
    const noWhatsApp = withVideo - withWhatsApp;

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentAttempts = attempts.filter(a => new Date(a.created_at) >= sevenDaysAgo);

    // Top players by similarity
    const topPlayers = attempts
      .filter(a => a.similarity_percent && a.display_name)
      .sort((a, b) => (b.similarity_percent || 0) - (a.similarity_percent || 0))
      .slice(0, 10)
      .map(a => ({
        name: a.display_name,
        phone: a.phone_number,
        similarity: a.similarity_percent,
        hasVideo: !!a.video_url,
        hasCompositeCard: !!a.composite_card_url,
        createdAt: a.created_at
      }));

    // Calculate average similarity
    const attemptsWithSimilarity = attempts.filter(a => a.similarity_percent);
    const averageSimilarity = attemptsWithSimilarity.length > 0
      ? Math.round(attemptsWithSimilarity.reduce((sum, a) => sum + (a.similarity_percent || 0), 0) / attemptsWithSimilarity.length)
      : 0;

    console.log('[Admin Analytics] Analytics calculated successfully');

    return NextResponse.json({
      totalAttempts,
      uniqueUsers,
      compositeCardsGenerated,
      videosGenerated,
      whatsappMessagesSent,
      completionFunnel: {
        started: totalAttempts,
        withCompositeCard,
        withVideo,
        withWhatsApp,
        completionRate
      },
      dropoffAnalysis: {
        noCompositeCard,
        noVideo,
        noWhatsApp
      },
      recentActivity: {
        last7Days: recentAttempts.length,
        withCompositeCard: recentAttempts.filter(a => a.composite_card_url).length,
        withVideo: recentAttempts.filter(a => a.video_url).length,
        withWhatsApp: recentAttempts.filter(a => a.whatsapp_sent === true).length
      },
      averageSimilarity,
      topPlayers
    });

  } catch (err) {
    console.error('[Admin Analytics] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

