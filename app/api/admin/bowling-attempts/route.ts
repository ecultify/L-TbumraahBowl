import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://hqzukyxnnjnstrecybzx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxenVreXhubmpuc3RyZWN5Ynp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTM4OTIsImV4cCI6MjA3MzA2OTg5Mn0.-FaJuxBuwxk5L-WCYKv--Vmq0g_aPBjGOTBKgwTrcOI';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 📋 ADMIN BOWLING ATTEMPTS API
 * 
 * Returns all bowling attempts with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Check for admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET || 'bumrah-admin-2025'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const filter = searchParams.get('filter') || 'all'; // all, complete, incomplete
    const search = searchParams.get('search') || '';

    console.log('[Admin Bowling Attempts] Fetching data...', { page, limit, filter, search });

    // Build query
    let query = supabase
      .from('bowling_attempts')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filter === 'complete') {
      // Complete: has composite_card_url AND video_url AND whatsapp_sent
      query = query
        .not('composite_card_url', 'is', null)
        .not('video_url', 'is', null)
        .eq('whatsapp_sent', true);
    } else if (filter === 'incomplete') {
      // Incomplete: missing at least one of the three
      // This is a bit tricky with Supabase, so we'll do OR logic
      // We'll fetch all and filter client-side for this case
    }

    // Apply search (display_name or phone_number)
    if (search) {
      query = query.or(`display_name.ilike.%${search}%,phone_number.ilike.%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by created_at desc
    query = query.order('created_at', { ascending: false });

    // Execute query
    const { data: attempts, error, count } = await query;

    if (error) {
      console.error('[Admin Bowling Attempts] Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Client-side filtering for incomplete (if needed)
    let filteredAttempts = attempts || [];
    if (filter === 'incomplete') {
      filteredAttempts = filteredAttempts.filter(a => 
        !a.composite_card_url || !a.video_url || !a.whatsapp_sent
      );
    }

    console.log('[Admin Bowling Attempts] Returned', filteredAttempts.length, 'records');

    return NextResponse.json({
      attempts: filteredAttempts,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });

  } catch (err) {
    console.error('[Admin Bowling Attempts] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

