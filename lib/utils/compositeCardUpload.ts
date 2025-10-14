'use client';

import { supabase } from '@/lib/supabase/client';

/**
 * Upload composite card image to Supabase storage and save metadata to database
 * @param imageBlob - The composite card image as a Blob
 * @param analysisData - Complete analysis data object
 * @param playerName - Player name
 * @returns Object with composite card URL and database ID, or null if failed
 */
export async function uploadCompositeCard(
  imageBlob: Blob,
  analysisData: {
    accuracyDisplay: number;
    runUpScore: number;
    deliveryScore: number;
    followThroughScore: number;
    playerName: string;
    kmhValue: number;
    armSwingScore: number;
    bodyMovementScore: number;
    rhythmScore: number;
    releasePointScore: number;
    recommendations: string;
    sessionAnalysisData: any;
  },
  playerName: string = 'anonymous'
): Promise<{ compositeCardUrl: string; recordId: string } | null> {
  try {
    console.log('📤 Starting composite card upload to Supabase...');
    console.log('📊 Analysis data:', analysisData);

    // ===================================
    // 1. UPLOAD IMAGE TO STORAGE
    // ===================================
    
    // Generate unique filename
    const timestamp = new Date().getTime();
    const sanitizedName = playerName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileExtension = 'png'; // Composite cards are always PNG
    const fileName = `${sanitizedName}-${timestamp}.${fileExtension}`;
    const filePath = `reports/${fileName}`;

    console.log('📁 Uploading composite card to path:', filePath);
    console.log('📦 Image size:', (imageBlob.size / 1024).toFixed(2), 'KB');

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('bowling-reports')
      .upload(filePath, imageBlob, {
        contentType: 'image/png',
        cacheControl: '3600', // Cache for 1 hour
        upsert: false // Don't overwrite existing files
      });

    if (uploadError) {
      console.error('❌ Supabase storage upload error:', uploadError);
      throw uploadError;
    }

    console.log('✅ Image uploaded to storage successfully');

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('bowling-reports')
      .getPublicUrl(filePath);

    const compositeCardUrl = urlData.publicUrl;
    console.log('🔗 Public URL:', compositeCardUrl);

    // ===================================
    // 2. GET AVATAR URL FROM SESSION
    // ===================================
    
    let avatarUrl: string | null = null;
    if (typeof window !== 'undefined') {
      avatarUrl = window.sessionStorage.getItem('geminiAvatarUrl');
      console.log('🖼️ Avatar URL from session:', avatarUrl || 'None');
    }

    // ===================================
    // 3. SAVE METADATA TO DATABASE
    // ===================================
    
    console.log('💾 Saving metadata to database...');

    // Get phone number and returning user info from session storage
    let phoneNumber: string | null = null;
    let displayName: string | null = null;
    let isReturningUser = false;
    let existingCompositeCardRecordId: string | null = null;
    
    if (typeof window !== 'undefined') {
      phoneNumber = window.sessionStorage.getItem('playerPhone');
      displayName = window.sessionStorage.getItem('playerName') || playerName;
      isReturningUser = window.sessionStorage.getItem('isReturningUser') === 'true';
      existingCompositeCardRecordId = window.sessionStorage.getItem('existingCompositeCardRecordId');
      
      console.log('📱 Phone number from session:', phoneNumber || 'None');
      console.log('👤 Display name from session:', displayName || playerName);
      console.log('🔄 Is returning user:', isReturningUser);
      console.log('📝 Existing composite card record ID:', existingCompositeCardRecordId || 'None');
    }

    // Prepare the data payload
    const dataPayload = {
      player_name: playerName,
      phone_number: phoneNumber, // 🆕 Save phone number
      display_name: displayName || playerName, // 🆕 Save display name
      composite_card_url: compositeCardUrl,
      avatar_url: avatarUrl,
      analysis_data: analysisData.sessionAnalysisData || {},
      
      // Key metrics
      accuracy_score: analysisData.accuracyDisplay,
      predicted_kmh: analysisData.kmhValue,
      similarity_percent: analysisData.sessionAnalysisData?.similarity || null,
      
      // Detailed scores
      run_up_score: analysisData.runUpScore,
      delivery_score: analysisData.deliveryScore,
      follow_through_score: analysisData.followThroughScore,
      arm_swing_score: analysisData.armSwingScore,
      body_movement_score: analysisData.bodyMovementScore,
      rhythm_score: analysisData.rhythmScore,
      release_point_score: analysisData.releasePointScore,
      
      // Recommendations
      recommendations: analysisData.recommendations,
      
      // Metadata
      meta: {
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        timestamp: new Date().toISOString()
      }
    };

    let recordData;
    let dbError;

    // Check if this is a returning user with an existing composite card record
    if (isReturningUser && existingCompositeCardRecordId) {
      console.log('🔄 Returning user - UPDATING existing composite card record:', existingCompositeCardRecordId);
      
      // UPDATE existing record
      const result = await supabase
        .from('composite_cards')
        .update({
          ...dataPayload,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCompositeCardRecordId)
        .select()
        .single();
      
      recordData = result.data;
      dbError = result.error;
    } else if (isReturningUser && phoneNumber) {
      // Fallback: Try to find and update by phone number if we don't have the record ID
      console.log('🔍 Returning user - Looking up existing composite card by phone:', phoneNumber);
      
      // First, try to find existing record
      const { data: existingRecord } = await supabase
        .from('composite_cards')
        .select('id')
        .eq('phone_number', phoneNumber)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (existingRecord) {
        console.log('✅ Found existing composite card record:', existingRecord.id);
        
        // Update the existing record
        const result = await supabase
          .from('composite_cards')
          .update({
            ...dataPayload,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id)
          .select()
          .single();
        
        recordData = result.data;
        dbError = result.error;
        
        // Store the record ID for future use
        if (typeof window !== 'undefined' && existingRecord.id) {
          window.sessionStorage.setItem('existingCompositeCardRecordId', existingRecord.id);
        }
      } else {
        console.log('⚠️ No existing composite card found, creating new one');
        
        // INSERT new record
        const result = await supabase
          .from('composite_cards')
          .insert(dataPayload)
          .select()
          .single();
        
        recordData = result.data;
        dbError = result.error;
      }
    } else {
      console.log('🆕 New user - INSERTING new composite card record');
      
      // INSERT new record for new users
      const result = await supabase
        .from('composite_cards')
        .insert(dataPayload)
        .select()
        .single();
      
      recordData = result.data;
      dbError = result.error;
    }

    if (dbError) {
      console.error('❌ Database insert error:', dbError);
      // Don't throw - image is already uploaded, just log the error
      console.warn('⚠️ Composite card image uploaded but metadata save failed');
      return { compositeCardUrl, recordId: '' };
    }

    console.log('✅ Metadata saved successfully');
    console.log('📝 Record ID:', recordData.id);

    // ===================================
    // 4. STORE URL IN SESSION STORAGE
    // ===================================
    
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('compositeCardUrl', compositeCardUrl);
      window.sessionStorage.setItem('compositeCardRecordId', recordData.id);
      console.log('💾 Composite card URL stored in session storage');
    }

    return {
      compositeCardUrl,
      recordId: recordData.id
    };

  } catch (error) {
    console.error('❌ Composite card upload failed:', error);
    return null;
  }
}

/**
 * Get user's composite cards from database
 * @param playerName - Player name to search for
 * @param limit - Maximum number of results
 * @returns Array of composite card records
 */
export async function getUserCompositeCards(
  playerName: string,
  limit: number = 10
) {
  try {
    const { data, error } = await supabase
      .from('composite_cards')
      .select('*')
      .ilike('player_name', playerName)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching composite cards:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Failed to fetch composite cards:', error);
    return null;
  }
}

/**
 * Get top composite cards by accuracy score
 * @param limit - Maximum number of results
 * @returns Array of top composite card records
 */
export async function getTopCompositeCards(limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('top_composite_cards')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching top composite cards:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Failed to fetch top composite cards:', error);
    return null;
  }
}

