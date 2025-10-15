'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAnalysis } from '@/context/AnalysisContext';
import { intensityToKmh, classifySpeed } from '@/lib/utils/normalize';
import { NoBowlingActionModal } from '@/components/NoBowlingActionModal';
import { CompositeCard } from '@/components/CompositeCard';
import { GlassBackButton } from '@/components/GlassBackButton';
import { downloadCompositeCardManual } from '@/lib/utils/downloadCompositeCard';
import { supabase } from '@/lib/supabase/client';
import { uploadUserVideoToSupabase } from '@/lib/utils/videoUpload';
import { uploadCompositeCardOnGeneration } from '@/lib/utils/uploadCompositeCardOnGeneration';
import { calculateAccuracyScore } from '@/lib/utils/calculateAccuracyScore';
import { normalizeVideoUrl } from '@/lib/utils/urlNormalization';
import { shortenUrlForWhatsApp } from '@/lib/utils/urlShortener';
import { usePageProtection } from '@/lib/hooks/usePageProtection';
import { UnauthorizedAccess } from '@/components/UnauthorizedAccess';
import { clearAnalysisSessionStorage, clearVideoSessionStorage } from '@/lib/utils/sessionCleanup';
import { applySimilarityReduction } from '@/lib/utils/similarityAdjustment';

export default function SimplifiedAnalyzePage() {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Protect this page - require OTP verification and proper flow
  const isAuthorized = usePageProtection('analyze');
  const { state } = useAnalysis();
  const router = useRouter();
  
  const [sessionAnalysisData, setSessionAnalysisData] = React.useState<any>(null);
  const [benchmarkDetailedData, setBenchmarkDetailedData] = React.useState<any>(null);
  const [detailedAnalysisData, setDetailedAnalysisData] = React.useState<any>(null);
  const [isViewingVideo, setIsViewingVideo] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showNoBowlingModal, setShowNoBowlingModal] = React.useState(false);
  const [isRenderingVideo, setIsRenderingVideo] = React.useState(false);
  const [renderProgress, setRenderProgress] = React.useState(0);
  const [leaderboardEntryId, setLeaderboardEntryId] = React.useState<string | null>(null);
  const [hasSubmittedToLeaderboard, setHasSubmittedToLeaderboard] = React.useState(false);
  const [hasUploadedCompositeCard, setHasUploadedCompositeCard] = React.useState(false);
  const [playerName, setPlayerName] = React.useState<string>('');
  const [isReturningUser, setIsReturningUser] = React.useState(false);
  const [existingCompositeCardUrl, setExistingCompositeCardUrl] = React.useState<string | null>(null);
  const [existingVideoUrl, setExistingVideoUrl] = React.useState<string | null>(null);
  const [existingRecordId, setExistingRecordId] = React.useState<string | null>(null);
  const [existingSimilarityPercent, setExistingSimilarityPercent] = React.useState<number | null>(null);

  // ===================================================================
  // ALL CALLBACKS AND EFFECTS MUST BE DECLARED HERE (BEFORE CONDITIONAL RETURNS)
  // ===================================================================

  // Function to submit results to Supabase leaderboard
  const submitToLeaderboard = React.useCallback(async () => {
    // Prevent duplicate submissions
    if (hasSubmittedToLeaderboard) {
      console.log('⏭️ Already submitted to leaderboard, skipping...');
      return;
    }

    try {
      console.log('📤 Submitting analysis results to Supabase leaderboard...');

      // Get Gemini avatar URL from sessionStorage if available
      const geminiAvatarUrl = typeof window !== 'undefined' 
        ? window.sessionStorage.getItem('geminiAvatarUrl') 
        : null;

      // Calculate scores here based on current data
      const finalIntensityValue = sessionAnalysisData?.intensity || state.finalIntensity || 0;
      const kmhValue = Math.round(sessionAnalysisData?.kmh || intensityToKmh(finalIntensityValue));
      const classificationResult = classifySpeed(finalIntensityValue);
      const speedLabel = sessionAnalysisData?.speedClass || state.speedClass || classificationResult.speedClass;

      const accuracyScore = benchmarkDetailedData?.overall
        ? Math.round(benchmarkDetailedData.overall * 100)
        : benchmarkDetailedData?.overallSimilarity
        ? Math.round(benchmarkDetailedData.overallSimilarity * 100)
        : sessionAnalysisData?.similarity
        ? Math.round(sessionAnalysisData.similarity)
        : existingSimilarityPercent // ✅ Use cached score for returning users
        ? existingSimilarityPercent
        : Math.max(0, Math.round(finalIntensityValue));
      const accuracyDisplay = Math.min(Math.max(accuracyScore, 0), 100);

      const runUpScore = benchmarkDetailedData?.runUp
        ? Math.round(benchmarkDetailedData.runUp * 100)
        : (sessionAnalysisData?.phases?.runUp || 87);
      const deliveryScore = benchmarkDetailedData?.delivery
        ? Math.round(benchmarkDetailedData.delivery * 100)
        : (sessionAnalysisData?.phases?.delivery || 79);
      const followThroughScore = benchmarkDetailedData?.followThrough
        ? Math.round(benchmarkDetailedData.followThrough * 100)
        : (sessionAnalysisData?.phases?.followThrough || 81);

      const armSwingScore = benchmarkDetailedData?.armSwing
        ? Math.round(benchmarkDetailedData.armSwing * 100)
        : (sessionAnalysisData?.technicalMetrics?.armSwing || 83);
      const bodyMovementScore = benchmarkDetailedData?.bodyMovement
        ? Math.round(benchmarkDetailedData.bodyMovement * 100)
        : (sessionAnalysisData?.technicalMetrics?.bodyMovement || 88);
      const rhythmScore = benchmarkDetailedData?.rhythm
        ? Math.round(benchmarkDetailedData.rhythm * 100)
        : (sessionAnalysisData?.technicalMetrics?.rhythm || 85);
      const releasePointScore = benchmarkDetailedData?.releasePoint
        ? Math.round(benchmarkDetailedData.releasePoint * 100)
        : (sessionAnalysisData?.technicalMetrics?.releasePoint || 89);

      // Calculate overall accuracy score from phase and technical metrics
      const overallAccuracyScore = calculateAccuracyScore(
        {
          runUp: runUpScore,
          delivery: deliveryScore,
          followThrough: followThroughScore
        },
        {
          rhythm: rhythmScore,
          armSwing: armSwingScore,
          bodyMovement: bodyMovementScore,
          releasePoint: releasePointScore
        }
      );

      // Get phone number and composite card URL from session storage
      const playerPhone = typeof window !== 'undefined' 
        ? window.sessionStorage.getItem('playerPhone') || null
        : null;
      const compositeCardUrl = typeof window !== 'undefined'
        ? window.sessionStorage.getItem('compositeCardUrl') || null
        : null;

      console.log('📞 Phone number for database:', playerPhone);
      console.log('🎴 Composite card URL:', compositeCardUrl);
      console.log('📊 Calculated accuracy score:', overallAccuracyScore);

      // Get OTP verification status from sessionStorage
      const otpVerifiedStatus = typeof window !== 'undefined' 
        ? window.sessionStorage.getItem('otpVerifiedForBowling') === 'true'
        : false;

      // Prepare payload for Supabase
      const payload = {
        display_name: sessionAnalysisData?.playerName || playerName || 'Anonymous',
        phone_number: playerPhone, // NEW: Store phone number
        otp_verified: otpVerifiedStatus, // NEW: Track OTP verification
        otp_phone: otpVerifiedStatus ? playerPhone : null, // Store phone used for OTP
        predicted_kmh: Number(kmhValue.toFixed(2)),
        similarity_percent: Number(accuracyDisplay.toFixed(2)),
        intensity_percent: Number(finalIntensityValue.toFixed(2)),
        speed_class: speedLabel,
        accuracy_score: Number(overallAccuracyScore.toFixed(2)), // NEW: Store calculated accuracy
        // composite_card_url will be added later via UPDATE after composite card is generated
        avatar_url: geminiAvatarUrl, // Store Gemini-generated avatar
        meta: {
          analyzer_mode: 'benchmark',
          app: 'bowling-analyzer',
          player_name: sessionAnalysisData?.playerName || playerName,
          phases: {
            runUp: runUpScore,
            delivery: deliveryScore,
            followThrough: followThroughScore
          },
          technicalMetrics: {
            armSwing: armSwingScore,
            bodyMovement: bodyMovementScore,
            rhythm: rhythmScore,
            releasePoint: releasePointScore
          },
          recommendations: benchmarkDetailedData?.recommendations || sessionAnalysisData?.recommendations
        }
      };

      console.log('📊 Leaderboard payload (with phone tracking):', payload);

      // Check if this is a returning user (retry)
      if (isReturningUser && existingRecordId) {
        console.log('🔄 Returning user - UPDATING existing record:', existingRecordId);
        
        // Prepare update payload
        const updatePayload: any = {
          ...payload,
          updated_at: new Date().toISOString()
        };
        
        // ALWAYS delete video_url on retry (force re-render with new analysis data)
        updatePayload.video_url = null;
        console.log('🎬 Clearing video_url - will re-render with new analysis data');
        
        // UPDATE existing record
        const { error: updateError } = await supabase
          .from('bowling_attempts')
          .update(updatePayload)
          .eq('id', existingRecordId);
        
        // Increment retry_count separately using RPC
        try {
          const { error: rpcError } = await supabase.rpc('increment_retry_count', { record_id: existingRecordId });
          if (rpcError) {
            console.log('⚠️ RPC failed:', rpcError);
          }
        } catch (rpcErr) {
          console.log('⚠️ RPC call failed, continuing anyway');
        }
        
        if (updateError) {
          console.error('❌ Supabase update error:', updateError);
          throw updateError;
        }
        
        console.log('✅ Successfully updated existing record (retry)');
        setLeaderboardEntryId(existingRecordId);
        setHasSubmittedToLeaderboard(true);
        
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('leaderboardEntryId', existingRecordId);
        }
      } else {
        console.log('🆕 New user - INSERTING new record');
        
        // Insert new record for new users
      const { data, error } = await supabase
        .from('bowling_attempts')
        .insert(payload)
        .select('id')
        .single();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Successfully saved to leaderboard with ID:', data.id);
        setLeaderboardEntryId(data.id);
        setHasSubmittedToLeaderboard(true);
        
        // Store the entry ID for potential future reference
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('leaderboardEntryId', data.id);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to submit to leaderboard:', error);
      // Don't throw - allow user to continue even if leaderboard submission fails
    }
  }, [
    hasSubmittedToLeaderboard,
    sessionAnalysisData,
    playerName,
    state.finalIntensity,
    isReturningUser,
    existingRecordId,
    state.speedClass,
    benchmarkDetailedData
  ]);

  // Load data from sessionStorage on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔍 Analyze Page: Loading data from sessionStorage...');
      
      // Load player name first
      const storedPlayerName = window.sessionStorage.getItem('playerName');
      if (storedPlayerName) {
        setPlayerName(storedPlayerName);
        console.log('📊 Player name loaded:', storedPlayerName);
      }
      
      // Load analysisVideoData
      const storedData = window.sessionStorage.getItem('analysisVideoData');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          console.log('📊 analysisVideoData loaded (original):', parsedData);
          const adjustedData = applySimilarityReduction(parsedData);
          console.log('📊 analysisVideoData adjusted (18% reduction):', adjustedData);
          console.log('🔍 Reduction verification:', {
            similarity: { 
              original: parsedData.similarity || 0, 
              adjusted: adjustedData.similarity || 0, 
              diff: (parsedData.similarity || 0) - (adjustedData.similarity || 0) 
            },
            intensity: { 
              original: parsedData.intensity || 0, 
              adjusted: adjustedData.intensity || 0, 
              diff: (parsedData.intensity || 0) - (adjustedData.intensity || 0) 
            },
            phases: {
              runUp: { original: parsedData.phases?.runUp, adjusted: adjustedData.phases?.runUp },
              delivery: { original: parsedData.phases?.delivery, adjusted: adjustedData.phases?.delivery },
              followThrough: { original: parsedData.phases?.followThrough, adjusted: adjustedData.phases?.followThrough }
            },
            frameIntensitiesCount: {
              original: parsedData.frameIntensities?.length || 0,
              adjusted: adjustedData.frameIntensities?.length || 0,
              firstFrame: {
                original: parsedData.frameIntensities?.[0]?.intensity,
                adjusted: adjustedData.frameIntensities?.[0]?.intensity
              }
            }
          });
          setSessionAnalysisData(adjustedData);
        } catch (error) {
          console.error('Error parsing session storage data:', error);
        }
      } else {
        console.warn('⚠️ No analysisVideoData found in sessionStorage');
      }
      
      // Load benchmarkDetailedData  
      const benchmarkData = window.sessionStorage.getItem('benchmarkDetailedData');
      if (benchmarkData) {
        try {
          const parsedBenchmarkData = JSON.parse(benchmarkData);
          console.log('📊 benchmarkDetailedData loaded:', parsedBenchmarkData);
          setBenchmarkDetailedData(parsedBenchmarkData);
          setDetailedAnalysisData(parsedBenchmarkData);
        } catch (error) {
          console.error('Error parsing benchmarkDetailedData from session storage:', error);
        }
      } else {
        console.warn('⚠️ No benchmarkDetailedData found in sessionStorage');
      }
      
      console.log('📊 Current sessionStorage keys:', Object.keys(window.sessionStorage));
      
      // Set loading to false immediately for faster UI
      setIsLoading(false);
      
      // The modal will be shown based on the main detection logic below
    }
  }, []);

  // Fallback: if no analysisVideoData but a noBowling flag exists, synthesize minimal data so UI can render
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const hasAnalysis = !!window.sessionStorage.getItem('analysisVideoData');
      const noAction = window.sessionStorage.getItem('noBowlingActionDetected') === 'true';
      if (!hasAnalysis && noAction) {
        const storedPlayerName = window.sessionStorage.getItem('playerName');
        const minimalData = {
          intensity: 0,
          speedClass: 'No Action',
          kmh: 0,
          similarity: 0,
          frameIntensities: [],
          phases: { runUp: 0, delivery: 0, followThrough: 0 },
          technicalMetrics: { armSwing: 0, bodyMovement: 0, rhythm: 0, releasePoint: 0 },
          recommendations: ['We could not detect a bowling motion. Try a clearer full-action clip.'],
          playerName: storedPlayerName || 'Player',
          createdAt: new Date().toISOString(),
        } as any;
        window.sessionStorage.setItem('analysisVideoData', JSON.stringify(minimalData));
        window.sessionStorage.setItem('analysisVideoData_backup', JSON.stringify(minimalData));
        window.sessionStorage.setItem('analysisVideoData_timestamp', Date.now().toString());
        setSessionAnalysisData(minimalData);
      }
    } catch {}
  }, []);

  // Auto-submit to leaderboard when analysis data is loaded
  React.useEffect(() => {
    // 🚫 DISABLED: Restored session check - Allow users to generate unlimited content
    // const isRestoredSession = typeof window !== 'undefined' && window.sessionStorage.getItem('restoredSession') === 'true';
    
    // if (isRestoredSession) {
    //   console.log('⏭️ Restored session detected - skipping leaderboard submission');
    //   console.log('✅ Using existing leaderboard entry from database');
    //   // Mark as submitted to prevent duplicate entries
    //   setHasSubmittedToLeaderboard(true);
    //   return;
    // }
    
    const shouldSubmit = 
      !hasSubmittedToLeaderboard &&
      sessionAnalysisData &&
      sessionAnalysisData.intensity > 0 &&
      sessionAnalysisData.speedClass !== 'No Action';

    if (shouldSubmit) {
      // Small delay to ensure all data is properly loaded
      const timer = setTimeout(() => {
        submitToLeaderboard();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [sessionAnalysisData, hasSubmittedToLeaderboard, submitToLeaderboard]);

  // Capture thumbnail from uploaded video for later use
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const uploadedVideoUrl = window.sessionStorage.getItem('uploadedVideoUrl');
      const existingThumbnail = window.sessionStorage.getItem('detectedFrameDataUrl') || window.sessionStorage.getItem('videoThumbnail');
      
      // Only capture if we don't already have a thumbnail
      if (uploadedVideoUrl && !existingThumbnail) {
        console.log('[Analyze] 📸 Capturing thumbnail from video...');
        
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = uploadedVideoUrl;
        
        video.onloadeddata = () => {
          try {
            // Seek to 1 second (or 10% into video) to get a better frame
            const seekTime = Math.min(1, video.duration * 0.1);
            video.currentTime = seekTime;
          } catch (e) {
            console.warn('[Analyze] Could not seek video, using first frame');
          }
        };
        
        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.9);
              
              // Store thumbnail for later use
              window.sessionStorage.setItem('videoThumbnail', thumbnailDataUrl);
              console.log('[Analyze] ✅ Thumbnail captured and stored');
            }
          } catch (e) {
            console.error('[Analyze] ❌ Error capturing thumbnail:', e);
          }
        };
        
        video.onerror = (e) => {
          console.error('[Analyze] ❌ Error loading video for thumbnail:', e);
        };
      }
    }
  }, []);

  // Check for returning user on mount - PRIORITIZE FRESH ANALYSIS DATA
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // FIRST: Check if there's fresh analysis data from a recent retry/new analysis
      const freshAnalysisData = window.sessionStorage.getItem('analysisVideoData');
      const freshBenchmarkData = window.sessionStorage.getItem('benchmarkDetailedData');
      
      let hasFreshAnalysis = false;
      if (freshAnalysisData) {
        try {
          const parsed = JSON.parse(freshAnalysisData);
          // Consider it "fresh" if it has valid intensity > 0
          hasFreshAnalysis = parsed && parsed.intensity > 0;
        } catch (e) {
          hasFreshAnalysis = false;
        }
      }
      
      // ALWAYS check for returning user status (needed for database UPDATE)
      const returningUser = window.sessionStorage.getItem('isReturningUser') === 'true';
      const recordId = window.sessionStorage.getItem('existingRecordId');
      const hasCompositeCard = window.sessionStorage.getItem('hasCompositeCard') === 'true';
      const hasVideo = window.sessionStorage.getItem('hasVideo') === 'true';
      const similarityPercent = window.sessionStorage.getItem('existingSimilarityPercent');
      
      // If returning user, ALWAYS set the record ID (even if fresh analysis)
      // This ensures database UPDATE happens instead of INSERT
      if (returningUser && recordId) {
        console.log('[Analyze] 🔄 Returning user detected! Record ID:', recordId);
        setIsReturningUser(true);
        setExistingRecordId(recordId);
        setLeaderboardEntryId(recordId); // Set this for composite card updates
      }
      
      if (hasFreshAnalysis) {
        // Fresh analysis available - use it! Don't load cached data
        console.log('[Analyze] ✨ Fresh analysis detected - using NEW data (ignoring cached data)');
        console.log('[Analyze] Fresh data will be loaded by main data loading effect');
        // Let the normal data loading flow handle fresh data
        // Don't set isLoading to false, let it complete naturally
        return;
      }
      
      // SECOND: Only if NO fresh analysis, load cached display data
      if (returningUser && recordId) {
        console.log('[Analyze] 📦 No fresh analysis - loading CACHED data for returning user');
        
        if (similarityPercent) {
          setExistingSimilarityPercent(parseFloat(similarityPercent));
          console.log('[Analyze] Loaded cached similarity score:', similarityPercent);
        }
        
        if (hasCompositeCard) {
          const compositeUrl = window.sessionStorage.getItem('existingCompositeCardUrl');
          if (compositeUrl) {
            setExistingCompositeCardUrl(compositeUrl);
            console.log('[Analyze] Loaded cached composite card:', compositeUrl);
          }
        }
        
        if (hasVideo) {
          const videoUrl = window.sessionStorage.getItem('existingVideoUrl');
          if (videoUrl) {
            setExistingVideoUrl(videoUrl);
            console.log('[Analyze] Loaded cached video:', videoUrl);
          }
        }
        
        // Skip live processing for returning users - show stored content
        setIsLoading(false);
        console.log('[Analyze] Skipping live processing - showing cached content');
      }
    }
  }, []);

  // Auto-upload composite card to Supabase when analysis data is loaded
  React.useEffect(() => {
    // 🚫 DISABLED: Restored session check - Allow users to generate unlimited content
    // const isRestoredSession = typeof window !== 'undefined' && window.sessionStorage.getItem('restoredSession') === 'true';
    
    // if (isRestoredSession) {
    //   console.log('⏭️ Restored session detected - skipping composite card generation');
    //   console.log('✅ Using existing composite card from database');
    //   return;
    // }
    
    const shouldUpload = 
      !hasUploadedCompositeCard &&
      sessionAnalysisData &&
      benchmarkDetailedData &&
      sessionAnalysisData.intensity > 0 &&
      sessionAnalysisData.speedClass !== 'No Action' &&
      leaderboardEntryId; // 🔥 WAIT FOR LEADERBOARD ENTRY TO BE CREATED FIRST!

    if (shouldUpload) {
      // Upload composite card automatically when data is ready
      const uploadCompositeCard = async () => {
        try {
          console.log('🎨 Auto-uploading composite card to Supabase...');
          console.log('🆔 Leaderboard Entry ID:', leaderboardEntryId);
          
          // Calculate all scores (same logic as used in UI rendering)
          const finalIntensityValue = sessionAnalysisData?.intensity || state.finalIntensity || 0;
          const kmhValue = Math.round(sessionAnalysisData?.kmh || intensityToKmh(finalIntensityValue));
          
          const accuracyScore = benchmarkDetailedData?.overall
            ? Math.round(benchmarkDetailedData.overall * 100)
            : benchmarkDetailedData?.overallSimilarity
            ? Math.round(benchmarkDetailedData.overallSimilarity * 100)
            : sessionAnalysisData?.similarity
            ? Math.round(sessionAnalysisData.similarity)
            : existingSimilarityPercent // ✅ Use cached score for returning users
            ? existingSimilarityPercent
            : Math.max(0, Math.round(finalIntensityValue));
          const accuracyDisplay = Math.min(Math.max(accuracyScore, 0), 100);

          const runUpScore = benchmarkDetailedData?.runUp
            ? Math.round(benchmarkDetailedData.runUp * 100)
            : (sessionAnalysisData?.phases?.runUp || 87);
          const deliveryScore = benchmarkDetailedData?.delivery
            ? Math.round(benchmarkDetailedData.delivery * 100)
            : (sessionAnalysisData?.phases?.delivery || 79);
          const followThroughScore = benchmarkDetailedData?.followThrough
            ? Math.round(benchmarkDetailedData.followThrough * 100)
            : (sessionAnalysisData?.phases?.followThrough || 81);

          const armSwingScore = benchmarkDetailedData?.armSwing
            ? Math.round(benchmarkDetailedData.armSwing * 100)
            : (sessionAnalysisData?.technicalMetrics?.armSwing || 83);
          const bodyMovementScore = benchmarkDetailedData?.bodyMovement
            ? Math.round(benchmarkDetailedData.bodyMovement * 100)
            : (sessionAnalysisData?.technicalMetrics?.bodyMovement || 88);
          const rhythmScore = benchmarkDetailedData?.rhythm
            ? Math.round(benchmarkDetailedData.rhythm * 100)
            : (sessionAnalysisData?.technicalMetrics?.rhythm || 85);
          const releasePointScore = benchmarkDetailedData?.releasePoint
            ? Math.round(benchmarkDetailedData.releasePoint * 100)
            : (sessionAnalysisData?.technicalMetrics?.releasePoint || 89);

          const recommendations = (benchmarkDetailedData?.recommendations?.length || sessionAnalysisData?.recommendations?.length) > 0
            ? (benchmarkDetailedData?.recommendations || sessionAnalysisData?.recommendations || []).join(' ')
            : "Great technique! Keep practicing to maintain consistency.";

          const finalPlayerName = sessionAnalysisData?.playerName || playerName || 'PLAYER NAME';

          // Call upload function
          const result = await uploadCompositeCardOnGeneration({
            accuracyDisplay,
            runUpScore,
            deliveryScore,
            followThroughScore,
            playerName: finalPlayerName,
            kmhValue,
            armSwingScore,
            bodyMovementScore,
            rhythmScore,
            releasePointScore,
            recommendations,
            sessionAnalysisData
          });

          if (result) {
            console.log('✅ Composite card uploaded successfully on generation!');
            console.log('🎴 Composite card URL:', result.compositeCardUrl);
            setHasUploadedCompositeCard(true);
            
            // Save composite card URL to sessionStorage for phone tracking
            if (typeof window !== 'undefined' && result.compositeCardUrl) {
              window.sessionStorage.setItem('compositeCardUrl', result.compositeCardUrl);
              console.log('💾 Composite card URL saved to sessionStorage');
              
              // 🆕 UPDATE DATABASE WITH COMPOSITE CARD URL
              console.log('═══════════════════════════════════════');
              console.log('📊 UPDATING BOWLING_ATTEMPTS TABLE');
              console.log('═══════════════════════════════════════');
              console.log('📊 Leaderboard ID:', leaderboardEntryId);
              console.log('📊 Composite Card URL:', result.compositeCardUrl);
              
              if (!leaderboardEntryId) {
                console.error('❌ ERROR: leaderboardEntryId is NULL! Cannot update database.');
                console.log('⚠️ Trying to get ID from sessionStorage...');
                const sessionId = window.sessionStorage.getItem('leaderboardEntryId');
                console.log('📦 Session ID:', sessionId);
                
                if (sessionId) {
                  console.log('✅ Found ID in session, using it for UPDATE');
                  const { error: updateError, data: updateData } = await supabase
                    .from('bowling_attempts')
                    .update({ composite_card_url: result.compositeCardUrl })
                    .eq('id', sessionId)
                    .select();
                  
                  if (updateError) {
                    console.error('❌ Failed to update composite_card_url:', updateError);
                  } else {
                    console.log('✅ Composite card URL saved to database!');
                    console.log('📋 Updated record:', updateData);
                  }
                } else {
                  console.error('❌ No leaderboard ID found anywhere! Skipping database update.');
                }
              } else {
                const { error: updateError, data: updateData } = await supabase
                  .from('bowling_attempts')
                  .update({ composite_card_url: result.compositeCardUrl })
                  .eq('id', leaderboardEntryId)
                  .select();
                
                if (updateError) {
                  console.error('❌ Failed to update composite_card_url:', updateError);
                  console.error('❌ Error details:', JSON.stringify(updateError));
                } else {
                  console.log('✅ Composite card URL saved to database!');
                  console.log('📋 Updated record:', updateData);
                }
              }
              console.log('═══════════════════════════════════════');
            }
          } else {
            console.warn('⚠️ Composite card upload failed');
          }
        } catch (error) {
          console.error('❌ Error uploading composite card:', error);
        }
      };

      // Delay to ensure composite card is rendered and all images are loaded
      const timer = setTimeout(() => {
        uploadCompositeCard();
      }, 2000); // 2 second delay to ensure Gemini avatar and all assets are loaded

      return () => clearTimeout(timer);
    }
  }, [sessionAnalysisData, benchmarkDetailedData, hasUploadedCompositeCard, playerName, state.finalIntensity, leaderboardEntryId]);

  // ❌ Removed automatic background rendering - now triggered by "View Video" button click only
  
  // (old auto-render code removed - video rendering now manual via View Video button)

  // Handle no bowling action modal - all hooks must come before any conditional returns
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const noBowlingDetected = 
        window.sessionStorage.getItem('noBowlingActionDetected') === 'true' ||
        state.speedClass === 'No Action' ||
        sessionAnalysisData?.speedClass === 'No Action' ||
        (state.finalIntensity === 0 && sessionAnalysisData?.intensity === 0);
        
      if (noBowlingDetected && !showNoBowlingModal) {
        setShowNoBowlingModal(true);
      }
    }
  }, [state.speedClass, state.finalIntensity, sessionAnalysisData, showNoBowlingModal]);

  // ===================================================================
  // ALL HOOKS MUST BE ABOVE THIS LINE - NO CONDITIONAL RETURNS BEFORE HERE
  // ===================================================================

  // Calculate all display values AFTER all hooks
  const finalIntensityValue = sessionAnalysisData?.intensity || state.finalIntensity || 0;
  const kmhValue = Math.round(sessionAnalysisData?.kmh || intensityToKmh(finalIntensityValue));
  const mphRaw = kmhValue * 0.621371;
  const mphValueDisplay = Number.isNaN(mphRaw)
    ? '0 mph'
    : `${Number.isInteger(mphRaw) ? mphRaw.toFixed(0) : mphRaw.toFixed(1)} mph`;

  const classificationResult = classifySpeed(finalIntensityValue);
  const speedLabel = sessionAnalysisData?.speedClass || state.speedClass || classificationResult.speedClass;

  const accuracyScore = benchmarkDetailedData?.overall
    ? Math.round(benchmarkDetailedData.overall * 100)
    : benchmarkDetailedData?.overallSimilarity
    ? Math.round(benchmarkDetailedData.overallSimilarity * 100)
    : sessionAnalysisData?.similarity
    ? Math.round(sessionAnalysisData.similarity)
    : existingSimilarityPercent // ✅ Use cached score for returning users
    ? existingSimilarityPercent
    : Math.max(0, Math.round(finalIntensityValue));
  const accuracyDisplay = Math.min(Math.max(accuracyScore, 0), 100);
  
  console.log('🔍 [ANALYZE] Score Calculation:', {
    benchmarkOverall: benchmarkDetailedData?.overall,
    benchmarkOverallSimilarity: benchmarkDetailedData?.overallSimilarity,
    sessionSimilarity: sessionAnalysisData?.similarity,
    existingSimilarityPercent, // ✅ Show cached score
    finalIntensityValue,
    calculatedAccuracyScore: accuracyScore,
    accuracyDisplay
  });

  const runUpScore = benchmarkDetailedData?.runUp
    ? Math.round(benchmarkDetailedData.runUp * 100)
    : (sessionAnalysisData?.phases?.runUp || 87);
  const deliveryScore = benchmarkDetailedData?.delivery
    ? Math.round(benchmarkDetailedData.delivery * 100)
    : (sessionAnalysisData?.phases?.delivery || 79);
  const followThroughScore = benchmarkDetailedData?.followThrough
    ? Math.round(benchmarkDetailedData.followThrough * 100)
    : (sessionAnalysisData?.phases?.followThrough || 81);
    
  console.log('🔍 [ANALYZE] Phase Scores:', {
    runUp: { benchmark: benchmarkDetailedData?.runUp, session: sessionAnalysisData?.phases?.runUp, final: runUpScore },
    delivery: { benchmark: benchmarkDetailedData?.delivery, session: sessionAnalysisData?.phases?.delivery, final: deliveryScore },
    followThrough: { benchmark: benchmarkDetailedData?.followThrough, session: sessionAnalysisData?.phases?.followThrough, final: followThroughScore }
  });

  const armSwingScore = benchmarkDetailedData?.armSwing
    ? Math.round(benchmarkDetailedData.armSwing * 100)
    : (sessionAnalysisData?.technicalMetrics?.armSwing || 83);
  const bodyMovementScore = benchmarkDetailedData?.bodyMovement
    ? Math.round(benchmarkDetailedData.bodyMovement * 100)
    : (sessionAnalysisData?.technicalMetrics?.bodyMovement || 88);
  const rhythmScore = benchmarkDetailedData?.rhythm
    ? Math.round(benchmarkDetailedData.rhythm * 100)
    : (sessionAnalysisData?.technicalMetrics?.rhythm || 85);
  const releasePointScore = benchmarkDetailedData?.releasePoint
    ? Math.round(benchmarkDetailedData.releasePoint * 100)
    : (sessionAnalysisData?.technicalMetrics?.releasePoint || 89);
    
  console.log('🔍 [ANALYZE] Technical Metrics:', {
    armSwing: { benchmark: benchmarkDetailedData?.armSwing, session: sessionAnalysisData?.technicalMetrics?.armSwing, final: armSwingScore },
    bodyMovement: { benchmark: benchmarkDetailedData?.bodyMovement, session: sessionAnalysisData?.technicalMetrics?.bodyMovement, final: bodyMovementScore },
    rhythm: { benchmark: benchmarkDetailedData?.rhythm, session: sessionAnalysisData?.technicalMetrics?.rhythm, final: rhythmScore },
    releasePoint: { benchmark: benchmarkDetailedData?.releasePoint, session: sessionAnalysisData?.technicalMetrics?.releasePoint, final: releasePointScore }
  });

  // Determine availability - use sessionStorage data if AnalysisContext is empty
  const hasSessionResults = sessionAnalysisData?.intensity > 0 || benchmarkDetailedData?.overall > 0;
  const hasValidResults = (state.finalIntensity > 0 && state.speedClass && state.speedClass !== 'No Action') || hasSessionResults;

  // Check for no bowling action detection
  const noBowlingDetected = typeof window !== 'undefined' && (
    window.sessionStorage.getItem('noBowlingActionDetected') === 'true' ||
    state.speedClass === 'No Action' ||
    sessionAnalysisData?.speedClass === 'No Action' ||
    (state.finalIntensity === 0 && sessionAnalysisData?.intensity === 0)
  );

  // Handle Retry button click - Clear analysis data and go to record-upload
  const handleRetry = React.useCallback(() => {
    console.log('[Retry] User clicked retry - clearing analysis data');
    
    if (typeof window !== 'undefined') {
      // Clear analysis and video data only - preserve user auth/flow data
      window.sessionStorage.removeItem('analysisResults');
      window.sessionStorage.removeItem('compositeCardUrl');
      window.sessionStorage.removeItem('generatedVideoUrl');
      window.sessionStorage.removeItem('existingCompositeCardUrl');
      window.sessionStorage.removeItem('existingVideoUrl');
      window.sessionStorage.removeItem('existingSimilarityPercent');
      window.sessionStorage.removeItem('geminiAvatarUrl');
      window.sessionStorage.removeItem('videoRenderId');
      window.sessionStorage.removeItem('videoRenderStatus');
      window.sessionStorage.removeItem('videoRenderStartTime');
      window.sessionStorage.removeItem('analysisVideoData');
      window.sessionStorage.removeItem('benchmarkDetailedData');
      window.sessionStorage.removeItem('leaderboardEntryId');
      
      // Keep these items for page protection and user flow:
      // - playerPhone, playerName
      // - otpVerified, otpVerifiedForBowling
      // - detailsCompleted
      // - isReturningUser, existingRecordId
      // - userFlow
      
      console.log('[Retry] Redirecting to record-upload page...');
      console.log('[Retry] Preserved session data:', {
        phone: window.sessionStorage.getItem('playerPhone'),
        name: window.sessionStorage.getItem('playerName'),
        otpVerified: window.sessionStorage.getItem('otpVerified'),
        detailsCompleted: window.sessionStorage.getItem('detailsCompleted'),
        isReturningUser: window.sessionStorage.getItem('isReturningUser')
      });
    }
    
    // Navigate to record-upload page using Next.js router (client-side navigation)
    router.push('/record-upload');
  }, [router]);

  // ===================================================================
  // CONDITIONAL RENDERS BELOW - THESE ARE SAFE NOW
  // ===================================================================

  // Authorization checks FIRST
  if (isAuthorized === null) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000'
      }}>
        <div style={{ color: '#fff', fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return <UnauthorizedAccess />;
  }

  // Show loading while checking for data
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  // Check for no bowling action detection
  if (noBowlingDetected) {
    return (
      <div
        className="min-h-screen flex flex-col relative"
        style={{
          backgroundImage: "url(/images/instructions/Instructions%20bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <NoBowlingActionModal
          open={showNoBowlingModal}
          onOpenChange={setShowNoBowlingModal}
        />
      </div>
    );
  }

  // Handle View Video button click - Trigger video rendering OR load existing video
  const handleViewVideo = async () => {
    try {
      // VERSION CHECK - to verify new code is running
      console.log('═══════════════════════════════════════');
      console.log('🔥 VIDEO RENDERING VERSION: 2025-01-07-v6 🔥');
      console.log('[handleViewVideo] 🎬 VIEW VIDEO BUTTON CLICKED');
      console.log('[handleViewVideo] START:', new Date().toISOString());
      
      if (typeof accuracyDisplay === 'number' && accuracyDisplay <= 85) {
        alert('View Video is available only for scores above 85%.');
        return;
      }

      // ✅ CHECK: Returning user with existing video - Skip rendering!
      if (typeof window !== 'undefined') {
        const isReturningUser = window.sessionStorage.getItem('isReturningUser') === 'true';
        const hasVideo = window.sessionStorage.getItem('hasVideo') === 'true';
        const existingVideoUrl = window.sessionStorage.getItem('existingVideoUrl');
        
        if (isReturningUser && hasVideo && existingVideoUrl) {
          console.log('[handleViewVideo] 🔄 Returning user with existing video detected!');
          console.log('[handleViewVideo] 🎥 Existing video URL:', existingVideoUrl.substring(0, 100) + '...');
          console.log('[handleViewVideo] ⏭️ SKIPPING video rendering - navigating directly to download page');
          
          // Set the video URL for download page to use
          window.sessionStorage.setItem('videoRenderStatus', 'completed');
          window.sessionStorage.setItem('generatedVideoUrl', existingVideoUrl);
          
          // Navigate directly to download page with existing video
          window.location.href = '/download-video';
          return;
        }
      }

      // 🧹 CLEAR old video data before starting new render (for new users or retry)
      if (typeof window !== 'undefined') {
        console.log('[handleViewVideo] 🧹 Clearing old video data...');
        window.sessionStorage.removeItem('generatedVideoUrl');
        window.sessionStorage.removeItem('videoRenderId');
        window.sessionStorage.removeItem('videoRenderStatus');
        window.sessionStorage.removeItem('videoRenderStartTime');
      }

      console.log('[handleViewVideo] 🚀 Starting NEW video rendering process...');
      setIsRenderingVideo(true);
      setRenderProgress(5);

      // Prepare analysis data for video rendering
      // Get frameIntensities from sessionStorage if available
      let frameIntensitiesData = [];
      try {
        const storedAnalysisData = sessionAnalysisData;
        if (storedAnalysisData && storedAnalysisData.frameIntensities) {
          frameIntensitiesData = storedAnalysisData.frameIntensities;
          console.log('📊 Found frameIntensities in session storage:', frameIntensitiesData.length, 'frames');
        } else {
          console.warn('⚠️ No frameIntensities found in session storage - using empty array');
        }
      } catch (err) {
        console.warn('⚠️ Could not retrieve frameIntensities:', err);
      }
      
      const videoAnalysisData = {
        intensity: finalIntensityValue,
        speedClass: speedLabel,
        kmh: kmhValue,
        similarity: accuracyDisplay,
        frameIntensities: frameIntensitiesData, // Include frame intensities
        phases: {
          runUp: runUpScore,
          delivery: deliveryScore,
          followThrough: followThroughScore
        },
        technicalMetrics: {
          armSwing: armSwingScore,
          bodyMovement: bodyMovementScore,
          rhythm: rhythmScore,
          releasePoint: releasePointScore
        },
        recommendations: benchmarkDetailedData?.recommendations || sessionAnalysisData?.recommendations || ['Great technique! Keep practicing to maintain consistency.'],
        playerName: sessionAnalysisData?.playerName || playerName || 'Player'
      };

      console.log('📦 Analysis data prepared for video:', videoAnalysisData);
      setRenderProgress(20);

      // Prepare assets: thumbnail + uploaded video path
      let thumbnailPublicUrl: string | null = null;
      
      // 📤 Upload thumbnail to Supabase to avoid huge base64 in Lambda payload
      try {
        if (typeof window !== 'undefined') {
          const bestFrameDataUrl = window.sessionStorage.getItem('detectedFrameDataUrl') || window.sessionStorage.getItem('videoThumbnail');
          
          if (bestFrameDataUrl && bestFrameDataUrl.startsWith('data:')) {
            console.log('[handleViewVideo] 📤 Uploading thumbnail to Supabase...');
            const { uploadThumbnailToSupabase } = await import('@/lib/utils/videoUpload');
            thumbnailPublicUrl = await uploadThumbnailToSupabase(bestFrameDataUrl);
            
            if (thumbnailPublicUrl) {
              console.log('[handleViewVideo] ✅ Thumbnail uploaded:', thumbnailPublicUrl.substring(0, 80));
            } else {
              console.warn('[handleViewVideo] ⚠️ Thumbnail upload failed, will use fallback image');
            }
          }
        }
      } catch (e) {
        console.warn('[handleViewVideo] Error uploading thumbnail:', e);
      }

      // Ensure user's uploaded video is persisted in public/uploads and get its public path
      let userVideoPublicPath: string | null = null;
      try {
        if (typeof window !== 'undefined') {
          userVideoPublicPath = window.sessionStorage.getItem('uploadedVideoPublicPath');
          if (!userVideoPublicPath) {
            let uploadFile: File | null = null;
            const w: any = window as any;
            if (w.tempVideoFile instanceof File && w.tempVideoFile.size > 0) {
              uploadFile = w.tempVideoFile as File;
            } else {
              const base64 = window.sessionStorage.getItem('uploadedVideoData');
              if (base64 && base64.startsWith('data:')) {
                const res = await fetch(base64);
                const blob = await res.blob();
                uploadFile = new File([blob], window.sessionStorage.getItem('uploadedFileName') || 'uploaded-video.mp4', { type: blob.type || 'video/mp4' });
              }
            }
            if (uploadFile) {
              const publicUrl = await uploadUserVideoToSupabase(uploadFile);
              if (publicUrl) {
                userVideoPublicPath = publicUrl as string;
                window.sessionStorage.setItem('uploadedVideoPublicPath', userVideoPublicPath);
              } else {
                console.warn('Upload user video failed');
              }
            } else {
              console.warn('No uploadable user video available in this session');
            }
          }
        }
      } catch (e) { console.warn('Error ensuring uploaded video path:', e); }

      // 🚀 Start rendering (local on localhost OR when env variable is set, Lambda otherwise)
      const useLocalRender = process.env.NEXT_PUBLIC_USE_LOCAL_RENDER === 'true';
      const isLocalhost = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        useLocalRender
      );
      
      console.log('[handleViewVideo] 🌍 Environment:', isLocalhost ? 'LOCAL RENDER' : 'LAMBDA');
      console.log('[handleViewVideo] 🔧 USE_LOCAL_RENDER env:', useLocalRender);
      console.log('[handleViewVideo] Analysis data being sent:', videoAnalysisData);
      setRenderProgress(5);
      
      let renderResult: any;
      
      if (isLocalhost) {
        // LOCAL DEVELOPMENT: Use Node.js rendering server
        console.log('[handleViewVideo] 🏠 Using LOCAL Node.js rendering server...');
        
        const { startLocalRender, checkLocalRenderServer } = await import('@/lib/utils/localRender');
        
        // Check if render server is running
        const serverRunning = await checkLocalRenderServer();
        if (!serverRunning) {
          throw new Error('Local render server not running! Please start it with: node server/render-video.js');
        }
        
        console.log('[handleViewVideo] ✅ Local render server is running');
        console.log('[handleViewVideo] 📊 Assets prepared:', {
          hasVideo: !!userVideoPublicPath,
          hasThumbnail: !!thumbnailPublicUrl,
          thumbnailSource: thumbnailPublicUrl ? 'Supabase URL' : 'Fallback image'
        });
        
        renderResult = await startLocalRender({
            analysisData: videoAnalysisData,
          userVideoUrl: userVideoPublicPath || undefined,
          thumbnailDataUrl: thumbnailPublicUrl || undefined,
        });
        
      } else {
        // PRODUCTION: Use Lambda/PHP proxy
        console.log('[handleViewVideo] ☁️ Using PRODUCTION Lambda rendering...');
        
        const { startRemotionRender } = await import('@/lib/utils/browserLambda');
        
        console.log('[handleViewVideo] 📊 Assets prepared:', {
          hasVideo: !!userVideoPublicPath,
          hasThumbnail: !!thumbnailPublicUrl,
          thumbnailSource: thumbnailPublicUrl ? 'Supabase URL' : 'Fallback image'
        });
        
        renderResult = await startRemotionRender({
          analysisData: videoAnalysisData,
          userVideoUrl: userVideoPublicPath || undefined,
          thumbnailDataUrl: thumbnailPublicUrl || undefined,
        });
      }
      
      console.log('[handleViewVideo] 📋 Render result:', renderResult);
      
      if (!renderResult.success) {
        console.error('[handleViewVideo] ❌ Render FAILED:', renderResult.error);
        throw new Error(renderResult.error || 'Failed to start render');
      }
      
      // LOCAL RENDERING: Also needs polling (like Lambda)
      // The render happens in background on the server
      
      // PRODUCTION LAMBDA: Use polling for render status
      if (!renderResult.renderId) {
        console.error('[handleViewVideo] ❌ No renderId returned!');
        throw new Error('No renderId returned from render');
      }
      
      const renderId = renderResult.renderId;
      console.log('[handleViewVideo] ✅ Render started successfully!');
      console.log('[handleViewVideo] 🆔 Render ID:', renderId);
      console.log('[handleViewVideo] 📊 Analysis data sent:', {
        playerName: videoAnalysisData.playerName,
        similarity: videoAnalysisData.similarity,
        speedClass: videoAnalysisData.speedClass,
        hasVideo: !!userVideoPublicPath,
        hasThumbnail: !!thumbnailPublicUrl,
        thumbnailUrl: thumbnailPublicUrl?.substring(0, 80) + '...'
      });
      
      setRenderProgress(10);
      
      // ⏱️ Record start time
      const renderStartTime = Date.now();
      
      // Store render info in sessionStorage
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('videoRenderId', renderId);
        window.sessionStorage.setItem('videoRenderStatus', 'rendering');
        window.sessionStorage.setItem('videoRenderStartTime', Date.now().toString());
      }
      
      // 🎬 PROGRESS TRACKING - Poll for render status
      console.log('[handleViewVideo] 🎬 Starting progress polling...');
      console.log('[handleViewVideo] Render ID:', renderId);
      console.log('[handleViewVideo] Environment:', isLocalhost ? 'LOCAL' : 'PRODUCTION');
      
      let finalVideoUrl: string | null = null;
      const maxPollingAttempts = 150; // 150 attempts × 4 seconds = 10 minutes max
      let pollCount = 0;
      
      for (let attempt = 0; attempt < maxPollingAttempts; attempt++) {
        pollCount++;
        const elapsed = Math.round((Date.now() - renderStartTime) / 1000);
        
        console.log(`[handleViewVideo] 📊 Poll #${pollCount}/${maxPollingAttempts} (${elapsed}s elapsed)...`);
        
        // Check render status (different for local vs production)
        let status: any;
        
        if (isLocalhost) {
          // LOCAL: Check status from local render server
          const { checkLocalRenderStatus } = await import('@/lib/utils/localRender');
          status = await checkLocalRenderStatus(renderId);
          
          console.log('[handleViewVideo] 📋 Local render status:', {
            done: status.done,
            percentage: status.percentage,
            hasUrl: !!status.url,
            error: status.error,
          });
          
          // Update progress bar (local uses percentage)
          if (status.percentage !== undefined) {
            const progressValue = Math.min(95, Math.round(status.percentage));
            console.log(`[handleViewVideo] 📊 Setting progress to ${progressValue}%`);
            setRenderProgress(progressValue);
          }
          
        } else {
          // PRODUCTION: Check status from Lambda
          const { checkRenderStatus } = await import('@/lib/utils/browserLambda');
          status = await checkRenderStatus(renderId);
          
          console.log('[handleViewVideo] 📋 Lambda render status:', {
            done: status.done,
            progress: status.overallProgress,
            step: status.currentStep,
            hasUrl: !!status.url,
            error: status.error,
          });
          
          // Update progress bar (Lambda uses overallProgress)
          if (status.overallProgress !== undefined) {
            const progressValue = Math.min(95, Math.round(status.overallProgress));
            console.log(`[handleViewVideo] 📊 Setting progress to ${progressValue}%`);
            setRenderProgress(progressValue);
          }
        }
        
        // Check if render is complete
        if (status.done && (status.url || status.videoUrl)) {
          finalVideoUrl = status.url || status.videoUrl;
          console.log('[handleViewVideo] ✅✅✅ RENDER COMPLETE! ✅✅✅');
          console.log('[handleViewVideo] 🎥 Video URL:', finalVideoUrl);
          setRenderProgress(100);
              break;
            }
        
        // Check for errors
        if (status.error) {
          console.error('[handleViewVideo] ❌ Status check error:', status.error);
          throw new Error(`Render status check failed: ${status.error}`);
        }
        
        // Still rendering - wait 4 seconds before next poll
        console.log('[handleViewVideo] ⏳ Video not ready yet, waiting 4 seconds...');
        await new Promise(resolve => setTimeout(resolve, 4000));
      }
      
      // Check if we got a video URL
      if (!finalVideoUrl) {
        console.error('[handleViewVideo] ❌ Timeout! No video found after 10 minutes');
        throw new Error('Render timed out after 10 minutes. The video may still be processing.');
      }
      
      console.log('[handleViewVideo] 💾 Storing video URL in sessionStorage...');
      console.log('[handleViewVideo] Final URL:', finalVideoUrl);
      
      // Store video URL and navigate to download page
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('generatedVideoUrl', finalVideoUrl);
        window.sessionStorage.setItem('videoRenderStatus', 'completed');
        console.log('[handleViewVideo] ✅ Video URL stored successfully!');
        
        // 📤 UPLOAD RENDERED VIDEO TO SUPABASE STORAGE
        let supabaseVideoUrl = finalVideoUrl; // Fallback to original URL
        try {
          console.log('[handleViewVideo] 📤 Uploading rendered video to Supabase Storage...');
          
          const { uploadRenderedVideoToSupabase } = await import('@/lib/utils/uploadRenderedVideoToSupabase');
          
          const playerNameForUpload = sessionAnalysisData?.playerName || playerName || 'Anonymous';
          const uploadResult = await uploadRenderedVideoToSupabase(
            finalVideoUrl,
            playerNameForUpload,
            Date.now().toString()
          );
          
          if (uploadResult.success && uploadResult.publicUrl) {
            console.log('[handleViewVideo] ✅ Video uploaded to Supabase!');
            console.log('[handleViewVideo] 🔗 Raw Supabase URL:', uploadResult.publicUrl);
            
            // 🆕 NORMALIZE URL BEFORE USING (fixes https// -> https://)
            const normalizedUrl = normalizeVideoUrl(uploadResult.publicUrl);
            
            if (!normalizedUrl) {
              console.error('[handleViewVideo] ❌ URL normalization failed! Using fallback.');
              supabaseVideoUrl = finalVideoUrl; // Fallback to original
            } else {
              supabaseVideoUrl = normalizedUrl;
              console.log('[handleViewVideo] ✅ Normalized URL:', supabaseVideoUrl.substring(0, 80) + '...');
            }
            
            // Update sessionStorage with normalized Supabase URL
            window.sessionStorage.setItem('generatedVideoUrl', supabaseVideoUrl);
          } else {
            console.warn('[handleViewVideo] ⚠️ Supabase upload failed, using original URL:', uploadResult.error);
          }
        } catch (uploadError) {
          console.error('[handleViewVideo] ❌ Error uploading to Supabase:', uploadError);
          // Continue with original URL
        }
        
        // 📊 UPDATE LEADERBOARD ENTRY WITH SUPABASE VIDEO URL
        try {
          console.log('[handleViewVideo] ═══════════════════════════════════════');
          console.log('[handleViewVideo] 📊 UPDATING BOWLING_ATTEMPTS WITH VIDEO URL');
          console.log('[handleViewVideo] ═══════════════════════════════════════');
          
          const leaderboardId = window.sessionStorage.getItem('leaderboardEntryId');
          console.log('[handleViewVideo] 📦 Leaderboard ID from session:', leaderboardId);
          console.log('[handleViewVideo] 🎥 Video URL:', supabaseVideoUrl);
          console.log('[handleViewVideo] 🔍 URL starts with https://:', supabaseVideoUrl?.startsWith('https://'));
          
            if (leaderboardId && supabaseVideoUrl) {
            // ⚠️ CRITICAL: Validate and normalize URL before saving to database
            console.log('[handleViewVideo] 🔍 ========== CLIENT-SIDE URL VALIDATION ==========');
            console.log('[handleViewVideo] 🔍 Original URL:', supabaseVideoUrl);
            console.log('[handleViewVideo] 🔍 URL length:', supabaseVideoUrl?.length);
            console.log('[handleViewVideo] 🔍 Contains bowllikebumrah.com:', supabaseVideoUrl?.includes('bowllikebumrah.com'));
            
            // CRITICAL: Reject if URL contains domain corruption
            if (supabaseVideoUrl && supabaseVideoUrl.includes('bowllikebumrah.com')) {
              console.error('[handleViewVideo] ❌❌❌ BLOCKED: Attempted to save corrupted URL!');
              console.error('[handleViewVideo] ❌ Corrupted URL:', supabaseVideoUrl);
              console.error('[handleViewVideo] ❌ This URL will NOT be saved to database');
            } else {
              const finalVideoUrl = normalizeVideoUrl(supabaseVideoUrl);
              
              if (!finalVideoUrl || !finalVideoUrl.startsWith('https://hqzukyxnnjnstrecybzx.supabase.co/storage/')) {
                console.error('[handleViewVideo] ❌ Invalid URL format! URL must be valid Supabase URL');
                console.error('[handleViewVideo] 🔍 Original URL:', supabaseVideoUrl);
                console.error('[handleViewVideo] 🔍 Normalized URL:', finalVideoUrl);
                console.error('[handleViewVideo] ❌ URL will NOT be saved to database');
              } else {
                console.log('[handleViewVideo] ✅ URL validated and normalized, proceeding with UPDATE...');
                console.log('[handleViewVideo] 🔗 Clean URL:', finalVideoUrl.substring(0, 80) + '...');
                
                const { error: updateError, data: updateData } = await supabase
                  .from('bowling_attempts')
                  .update({ video_url: finalVideoUrl })  // Use normalized URL
                  .eq('id', leaderboardId)
                  .select();
                
                if (updateError) {
                  console.error('[handleViewVideo] ❌ Failed to update video URL:', updateError);
                  console.error('[handleViewVideo] ❌ Error details:', JSON.stringify(updateError));
                } else {
                  console.log('[handleViewVideo] ✅ Video URL saved to database!');
                  console.log('[handleViewVideo] 📋 Updated record:', updateData);
                }
              }
            }
            console.log('[handleViewVideo] 🔍 ===================================================');
          } else {
            console.warn('[handleViewVideo] ⚠️ Missing required data:');
            console.warn('[handleViewVideo]   - Leaderboard ID:', leaderboardId ? '✅' : '❌ MISSING');
            console.warn('[handleViewVideo]   - Video URL:', supabaseVideoUrl ? '✅' : '❌ MISSING');
          }
          console.log('[handleViewVideo] ═══════════════════════════════════════');
        } catch (error) {
          console.error('[handleViewVideo] ❌ Error updating video URL:', error);
          // Don't block navigation on error
        }
        
        // 📱 SEND WHATSAPP MESSAGE WITH VIDEO LINK
        try {
          const playerPhone = window.sessionStorage.getItem('playerPhone');
          const playerDisplayName = sessionAnalysisData?.playerName || playerName || window.sessionStorage.getItem('playerName') || 'Player';
          const leaderboardId = window.sessionStorage.getItem('leaderboardEntryId');
          
          if (playerPhone && supabaseVideoUrl && leaderboardId) {
            console.log('[handleViewVideo] 📱 Sending WhatsApp message...');
            console.log('[handleViewVideo] Phone:', playerPhone);
            console.log('[handleViewVideo] Name:', playerDisplayName);
            console.log('[handleViewVideo] Video URL:', supabaseVideoUrl.substring(0, 100) + '...');
            
            // 🔗 SHORTEN SUPABASE URL using URL shortening service
            console.log('[handleViewVideo] 🔗 Shortening URL...');
            const shortenedUrl = await shortenUrlForWhatsApp(supabaseVideoUrl);
            
            console.log('[handleViewVideo] 🔗 Original URL:', supabaseVideoUrl.substring(0, 80) + '...');
            console.log('[handleViewVideo] 🔗 Shortened URL:', shortenedUrl);
            
            // Send WhatsApp message via API endpoint with shortened URL
            const whatsappResponse = await fetch('/api/send-whatsapp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phoneNumber: '91' + playerPhone, // Add country code
                userName: playerDisplayName,
                videoLink: shortenedUrl // Use shortened URL
              })
            });
            
            const whatsappResult = await whatsappResponse.json();
            
            if (whatsappResult.success) {
              console.log('[handleViewVideo] ✅ WhatsApp message sent successfully!');
              console.log('[handleViewVideo] Response ID:', whatsappResult.data?.responseId);
              
              // Update database to mark whatsapp_sent as true
              if (leaderboardId) {
                console.log('[handleViewVideo] 📊 Updating whatsapp_sent flag...');
                const { error: whatsappUpdateError } = await supabase
                  .from('bowling_attempts')
                  .update({ whatsapp_sent: true })
                  .eq('id', leaderboardId);
                
                if (whatsappUpdateError) {
                  console.error('[handleViewVideo] ❌ Failed to update whatsapp_sent flag:', whatsappUpdateError);
                } else {
                  console.log('[handleViewVideo] ✅ whatsapp_sent flag updated to true!');
                }
              }
            } else {
              console.error('[handleViewVideo] ❌ Failed to send WhatsApp:', whatsappResult.error);
            }
          } else {
            console.warn('[handleViewVideo] ⚠️ Skipping WhatsApp - missing phone or video URL');
            console.warn('[handleViewVideo] Phone:', playerPhone ? 'available' : 'missing');
            console.warn('[handleViewVideo] Video URL:', supabaseVideoUrl ? 'available' : 'missing');
          }
        } catch (whatsappError) {
          console.error('[handleViewVideo] ❌ Error sending WhatsApp message:', whatsappError);
          // Don't block navigation on WhatsApp error
        }
        
        console.log('[handleViewVideo] 🚀 Navigating to download page in 1 second...');
        
        // Short delay to show 100% completion
        setTimeout(() => {
          console.log('[handleViewVideo] 🚀 NAVIGATING NOW!');
          window.location.href = '/download-video'; 
        }, 1000);
      }

    } catch (error) {
      console.error('❌ Video rendering error:', error);
      alert('Failed to generate video. Please try again.');
      setIsRenderingVideo(false);
      setRenderProgress(0);
    }
  };

  // Download composite card functionality - Downloads the card shown on UI
  const downloadCompositeCard = async () => {
    try {
      // Determine which card URL to use
      let cardUrlToDownload: string | null = null;
      
      // PRIORITY 1: Returning user with existing card
      if (isReturningUser && existingCompositeCardUrl) {
        console.log('📥 Downloading EXISTING composite card for returning user...');
        console.log('🔗 Existing URL:', existingCompositeCardUrl);
        cardUrlToDownload = existingCompositeCardUrl;
      }
      // PRIORITY 2: First-time user - use the card that was just uploaded to Supabase
      else if (typeof window !== 'undefined') {
        const freshCardUrl = window.sessionStorage.getItem('compositeCardUrl');
        if (freshCardUrl) {
          console.log('📥 Downloading FRESH composite card for first-time user...');
          console.log('🔗 Fresh URL:', freshCardUrl);
          cardUrlToDownload = freshCardUrl;
        }
      }
      
      // If we have a URL, download from it
      if (cardUrlToDownload) {
        console.log('📥 Downloading composite card from URL...');
        
        // Download the composite card from URL
        const response = await fetch(cardUrlToDownload);
        if (!response.ok) {
          throw new Error(`Failed to fetch card: ${response.status}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bowling-report-${sessionAnalysisData?.playerName || playerName || 'player'}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        console.log('✅ Composite card downloaded successfully from URL');
        return;
      }
      
      // FALLBACK: If no URL available, generate fresh (shouldn't happen normally)
      console.warn('⚠️ No composite card URL found, generating fresh card...');
      console.log('🎨 Generating new composite card for download...');
      await downloadCompositeCardManual({
        accuracyDisplay,
        runUpScore,
        deliveryScore,
        followThroughScore,
        playerName: sessionAnalysisData?.playerName || playerName || "PLAYER NAME",
        kmhValue,
        armSwingScore,
        bodyMovementScore,
        rhythmScore,
        releasePointScore,
        recommendations: (benchmarkDetailedData?.recommendations?.length || sessionAnalysisData?.recommendations?.length) > 0
          ? (benchmarkDetailedData?.recommendations || sessionAnalysisData?.recommendations || []).join(' ')
          : "Great technique! Keep practicing to maintain consistency.",
        sessionAnalysisData
      });
    } catch (error) {
      console.error('❌ Download failed:', error);
      alert('Failed to download the report. Please try again.');
    }
  };

  return (
    <>
      {/* Video Rendering Loader Overlay */}
      {isRenderingVideo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                border: '4px solid rgba(255, 255, 255, 0.2)',
                borderTop: '4px solid #FDC217',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}
            />
            <h2
              style={{
                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                fontWeight: 700,
                fontSize: 24,
                color: '#fff',
                marginBottom: 12
              }}
            >
              Generating Your Video
            </h2>
            <p
              style={{
                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                fontSize: 16,
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: 24
              }}
            >
              Please wait while we create your bowling analysis video...
            </p>
            <div
              style={{
                width: 300,
                height: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 4,
                overflow: 'hidden',
                margin: '0 auto'
              }}
            >
              <div
                style={{
                  width: `${renderProgress}%`,
                  height: '100%',
                  backgroundColor: '#FDC217',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <p
              style={{
                fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                fontSize: 14,
                color: 'rgba(255, 255, 255, 0.6)',
                marginTop: 12
              }}
            >
              {renderProgress}%
            </p>
          </div>
        </div>
      )}

      {/* Mobile Layout */}
      <div
        className="md:hidden min-h-screen flex flex-col relative"
        style={{
          backgroundImage: "url(/images/instructions/Instructions%20bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
      <main className="flex-1 px-6 pt-20 pb-8 flex justify-center relative z-10">
        <div className="relative mx-auto" style={{ width: 400, marginTop: 4 }}>
          
          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16, paddingLeft: 4 }}>
            <div
              onClick={() => {
                console.log('🏠 Homepage logo clicked - clearing session data and reloading...');
                if (typeof window !== 'undefined') {
                  sessionStorage.clear();
                  window.location.href = '/';
                }
              }}
            >
              <img
                src="/images/newhomepage/Bowling%20Campaign%20Logo.png"
                alt="Bowling Campaign Logo"
                style={{ width: 208, height: "auto", cursor: "pointer" }}
              />
            </div>
          </div>

          <div style={{ position: "relative", width: "100%" }}>
            
            {/* Loan Approved Decoration */}
            <img
              src="/images/instructions/loanapproved.png"
              alt="Loan Approved"
              style={{ 
                position: "absolute", 
                top: -170, 
                right: -8, 
                width: 150, 
                height: "auto", 
                zIndex: 1, 
                pointerEvents: "none" 
              }}
            />

            {/* Glass Box Container */}
            <div
              style={{
                position: "relative",
                borderRadius: 18,
                backgroundColor: "#FFFFFF80",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                boxShadow: "inset 0 0 0 1px #FFFFFF",
                padding: 18,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                zIndex: 2,
                marginTop: 20,
              }}
            >
              {/* Universal Back Arrow Box - Top Left */}
              <GlassBackButton />
              
              {/* Headline */}
              <div className="mb-3 text-center" style={{ marginTop: '30px' }}>
                <div
                  style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: 800,
                    fontStyle: "italic",
                    fontSize: 22,
                    color: "#000000",
                    lineHeight: 1.1,
                    marginBottom: 2,
                  }}
                >
                  Your #BumrahKiSpeedPar<br />Report is Ready!
                </div>
              </div>

              {/* Composite Card - Show existing or generate new */}
              <div style={{ 
                width: '100%',
                maxWidth: 346,
                margin: '0 auto',
                position: 'relative'
              }}>
                {isReturningUser && existingCompositeCardUrl ? (
                  // Show existing composite card for returning users
                  <div style={{
                    width: '100%',
                    maxWidth: 346,
                    margin: '0 auto'
                  }}>
                    <img 
                      src={existingCompositeCardUrl} 
                      alt="Your Analysis Card" 
                      style={{
                        width: '100%',
                        height: 'auto',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                    />
                  </div>
                ) : (
                  // Generate new composite card for new users or users without existing card
                <CompositeCard
                  accuracyDisplay={accuracyDisplay}
                  runUpScore={runUpScore}
                  deliveryScore={deliveryScore}
                  followThroughScore={followThroughScore}
                  playerName={sessionAnalysisData?.playerName || playerName || "PLAYER NAME"}
                  kmhValue={kmhValue}
                  armSwingScore={armSwingScore}
                  bodyMovementScore={bodyMovementScore}
                  rhythmScore={rhythmScore}
                  releasePointScore={releasePointScore}
                  recommendations={
                    (benchmarkDetailedData?.recommendations?.length || sessionAnalysisData?.recommendations?.length) > 0
                      ? (benchmarkDetailedData?.recommendations || sessionAnalysisData?.recommendations || []).join(' ')
                      : "Great technique! Keep practicing to maintain consistency."
                  }
                />
                )}
              </div>
              
              {/* Action Buttons - Inside glass box */}
              <div className="mb-3" style={{ width: '100%', marginTop: '20px' }}>
                {(() => {
                  // Determine which score to use
                  const effectiveScore = isReturningUser && existingSimilarityPercent !== null 
                    ? existingSimilarityPercent 
                    : accuracyDisplay;
                  
                  const shouldShowViewVideo = effectiveScore > 85;
                  
                  return shouldShowViewVideo ? (
                  // 3 buttons when score > 85%
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link href="/leaderboard" style={{ flex: 1 }}>
                        <button
                          className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                          style={{
                            width: "100%",
                            backgroundColor: '#CCEAF7',
                            borderRadius: '25.62px',
                            fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                            fontWeight: '700',
                            fontSize: '14px',
                            color: 'black',
                            padding: '10px 16px',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8
                          }}
                        >
                          <img
                            src="/frontend-images/homepage/Vector.svg"
                            alt="Leaderboard"
                            style={{ width: 16, height: 16 }}
                          />
                          Leaderboard
                        </button>
                      </Link>

                      <button
                        className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                        style={{
                          flex: 1,
                          backgroundColor: '#FDC217',
                          borderRadius: '25.62px',
                          fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                          fontWeight: '700',
                          fontSize: '14px',
                          color: 'black',
                          padding: '10px 16px',
                          border: 'none'
                        }}
                        onClick={downloadCompositeCard}
                      >
                        Download Report
                      </button>
                    </div>
                      {/* View Video & Retry Buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                    <button
                      className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                      style={{
                        width: "100%",
                        backgroundColor: '#0095d7',
                        borderRadius: '25.62px',
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: '700',
                        fontSize: '14px',
                        color: 'white',
                        padding: '10px 16px',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                      onClick={handleViewVideo}
                      disabled={isRenderingVideo}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      View Video
                    </button>
                        
                        {/* Retry Button */}
                        <button
                          className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                          style={{
                            width: "100%",
                            backgroundColor: '#FFC315',
                            borderRadius: '25.62px',
                            fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                            fontWeight: '700',
                            fontSize: '14px',
                            color: 'black',
                            padding: '10px 16px',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8
                          }}
                          onClick={handleRetry}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                          </svg>
                          Retry Analysis
                    </button>
                      </div>
                  </div>
                ) : (
                  // 2 buttons when score <= 85%
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link href="/leaderboard" style={{ flex: 1 }}>
                      <button
                        className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                        style={{
                          width: "100%",
                          backgroundColor: '#CCEAF7',
                          borderRadius: '25.62px',
                          fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                          fontWeight: '700',
                          fontSize: '14px',
                          color: 'black',
                          padding: '10px 16px',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8
                        }}
                      >
                        <img
                          src="/frontend-images/homepage/Vector.svg"
                          alt="Leaderboard"
                          style={{ width: 16, height: 16 }}
                        />
                        Leaderboard
                      </button>
                    </Link>

                    <button
                      className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                      style={{
                        flex: 1,
                        backgroundColor: '#FDC217',
                        borderRadius: '25.62px',
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: '700',
                        fontSize: '14px',
                        color: 'black',
                        padding: '10px 16px',
                        border: 'none'
                      }}
                      onClick={downloadCompositeCard}
                    >
                      Download Report
                    </button>
                  </div>
                  );
                })()}
              </div>
            </div>

            {/* Text and Retry Button - Below Glass Box */}
            {(() => {
              const effectiveScore = isReturningUser && existingSimilarityPercent !== null 
                ? existingSimilarityPercent 
                : accuracyDisplay;
              return effectiveScore <= 85;
            })() && (
              <div style={{ marginTop: '20px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Feedback Text */}
                <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                  <p style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: '700',
                    fontSize: '14px',
                    color: '#FFFFFF',
                    margin: 0,
                    marginBottom: '1px'
                  }}>
                    You've just missed the benchmark
                  </p>
                  <p style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: '700',
                    fontSize: '14px',
                    color: '#FFFFFF',
                    margin: 0
                  }}>
                    Don't worry, try again!
                  </p>
                </div>
                
                {/* Retry Button */}
                <button
                  className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                  style={{
                    width: '142px',
                    height: '36px',
                    backgroundColor: '#80CBEB',
                    borderRadius: '22.89px',
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: '700',
                    fontSize: '14px',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer'
                  }}
                onClick={() => {
                  console.log('🔄 Retry button clicked');
                  if (typeof window !== 'undefined') {
                    // Clear only analysis and video data, preserve auth state
                    clearAnalysisSessionStorage();
                    clearVideoSessionStorage();
                    
                    // Navigate to record-upload
                    window.location.href = '/record-upload';
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
                Retry
              </button>
            </div>
            )}
          </div>
        </div>
      </main>

      {/* Always include the modal in case it needs to be triggered */}
      <NoBowlingActionModal
        open={showNoBowlingModal}
        onOpenChange={setShowNoBowlingModal}
      />

        {/* Mobile Footer */}
        <footer className="md:hidden mt-auto w-full bg-black px-4 md:px-8 pt-4 pb-6">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
          <div className="text-center">
            <p 
              className="text-white text-xs"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '400',
                fontSize: 'clamp(10px, 2vw, 14px)',
                lineHeight: '1.4'
              }}
            >
              © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833 | <Link href="/terms-and-conditions" className="text-blue-300 hover:text-blue-200 underline">Terms and Conditions</Link>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span 
              className="text-white text-xs mr-2"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '400',
                fontSize: 'clamp(10px, 2vw, 14px)'
              }}
            >
              Connect with us
            </span>
              <div className="flex gap-3 md:gap-4">
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <a href="https://m.facebook.com/LnTFS?wtsid=rdr_0GljAOcj6obaXQY93" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <a href="https://www.instagram.com/lntfinance?igsh=a3ZvY2JxaWdnb25s" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/></svg>
                  </a>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <a href="https://x.com/LnTFinance" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                  </a>
                </div>
                <a href="https://www.youtube.com/user/ltfinance" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
              </div>
          </div>
        </div>
      </footer>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex flex-col" style={{
        minHeight: "100vh",
        backgroundImage: 'url("/images/analyzepagebg.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}>
        {/* Main content area with 3-column layout */}
        <div className="flex-1 flex items-stretch relative" style={{ minHeight: '75vh', paddingTop: '32px', paddingBottom: '20px', paddingLeft: '60px', paddingRight: '60px', gap: '0px' }}>
          
          {/* First Column - Logo and Loan Approved Image */}
          <div style={{ width: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingRight: '20px' }}>
            {/* Logo at top */}
            <div className="mb-8">
              <div
                onClick={() => {
                  console.log('🏠 Homepage logo clicked - clearing session data and reloading...');
                  if (typeof window !== 'undefined') {
                    sessionStorage.clear();
                    window.location.href = '/';
                  }
                }}
              >
                <img
                  src="/images/newhomepage/Bowling%20Campaign%20Logo.png"
                  alt="Bowling Campaign Logo"
                  className="w-64 lg:w-72"
                  style={{ height: "auto", cursor: "pointer" }}
                />
              </div>
            </div>

            {/* Loan Approved Image - Smaller with no bottom margin */}
            <div className="flex-1 flex items-end justify-center" style={{ marginBottom: '-20px' }}>
              <img
                src="/images/loanapprovednew.png"
                alt="Loan Approved"
                style={{ 
                  width: '300px',
                  height: 'auto',
                  objectFit: 'contain',
                  marginBottom: 0
                }}
              />
            </div>
          </div>

          {/* Second Column - Report is Ready and Buttons */}
          <div style={{ width: '450px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingLeft: '20px', paddingRight: '40px' }}>
            {/* Report is Ready Image */}
            <div className="mb-12">
              <img
                src="/images/reportisready.png"
                alt="Report is Ready"
                style={{
                  width: '450px',
                  height: 'auto',
                  objectFit: 'contain'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ width: '250px' }}>
              {(() => {
                // Determine which score to use
                const effectiveScore = isReturningUser && existingSimilarityPercent !== null 
                  ? existingSimilarityPercent 
                  : accuracyDisplay;
                
                const shouldShowViewVideo = effectiveScore > 85;
                
                return shouldShowViewVideo ? (
                  // 4 buttons when score > 85%
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Link href="/leaderboard">
                    <button
                      className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                      style={{
                        width: "100%",
                        backgroundColor: '#CCEAF7',
                        borderRadius: '25.62px',
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: '700',
                        fontSize: '16px',
                        color: 'black',
                        padding: '12px 20px',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <img
                        src="/frontend-images/homepage/Vector.svg"
                        alt="Leaderboard"
                        style={{ width: 20, height: 20 }}
                      />
                      Leaderboard
                    </button>
                  </Link>

                  <button
                    className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                    style={{
                      width: "100%",
                      backgroundColor: '#FDC217',
                      borderRadius: '25.62px',
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: '700',
                      fontSize: '16px',
                      color: 'black',
                      padding: '12px 20px',
                      border: 'none'
                    }}
                    onClick={downloadCompositeCard}
                  >
                    Download Report
                  </button>

                  <button
                    className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                    style={{
                      width: "100%",
                      backgroundColor: '#0D4D80',
                      borderRadius: '25.62px',
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: '700',
                      fontSize: '16px',
                      color: 'white',
                      padding: '12px 20px',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                    onClick={handleViewVideo}
                    disabled={isRenderingVideo}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                    View Video
                  </button>

                    {/* Retry Button - Desktop */}
                    <button
                      className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                      style={{
                        width: "100%",
                        backgroundColor: '#FFC315',
                        borderRadius: '25.62px',
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: '700',
                        fontSize: '16px',
                        color: 'black',
                        padding: '12px 20px',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                      onClick={handleRetry}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                      </svg>
                      Retry Analysis
                  </button>
                </div>
              ) : (
                // 2 buttons when score <= 85%
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Link href="/leaderboard">
                    <button
                      className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                      style={{
                        width: "100%",
                        backgroundColor: '#CCEAF7',
                        borderRadius: '25.62px',
                        fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                        fontWeight: '700',
                        fontSize: '16px',
                        color: 'black',
                        padding: '12px 20px',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8
                      }}
                    >
                      <img
                        src="/frontend-images/homepage/Vector.svg"
                        alt="Leaderboard"
                        style={{ width: 20, height: 20 }}
                      />
                      Leaderboard
                    </button>
                  </Link>

                  <button
                    className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                    style={{
                      width: "100%",
                      backgroundColor: '#FDC217',
                      borderRadius: '25.62px',
                      fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                      fontWeight: '700',
                      fontSize: '16px',
                      color: 'black',
                      padding: '12px 20px',
                      border: 'none'
                    }}
                    onClick={downloadCompositeCard}
                  >
                    Download Report
                  </button>
                </div>
                );
              })()}
            </div>

            {/* Missed Benchmark Text and Retry Button - Only show when score <= 85% */}
            {(() => {
              const effectiveScore = isReturningUser && existingSimilarityPercent !== null 
                ? existingSimilarityPercent 
                : accuracyDisplay;
              return effectiveScore <= 85;
            })() && (
              <div className="mt-8 text-center">
                {/* Missed Benchmark Text */}
                <div className="mb-4">
                  <p style={{
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: '700',
                    fontSize: '16px',
                    color: '#FFFFFF',
                    margin: 0,
                    lineHeight: 1.4
                  }}>
                    You've just missed the benchmark<br />
                    Don't worry, try again!
                  </p>
                </div>
                
                {/* Retry Button */}
                <button
                  className="transition-all duration-300 hover:brightness-110 hover:scale-105"
                  style={{
                    width: '200px',
                    backgroundColor: '#0D4D80',
                    borderRadius: '22.89px',
                    fontFamily: "'FrutigerLT Pro', Inter, sans-serif",
                    fontWeight: '700',
                    fontSize: '16px',
                    color: 'white',
                    padding: '12px 20px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    margin: '0 auto'
                  }}
                  onClick={() => {
                    console.log('🔄 Retry button clicked');
                    if (typeof window !== 'undefined') {
                      // Clear only analysis and video data, preserve auth state
                      clearAnalysisSessionStorage();
                      clearVideoSessionStorage();
                      
                      // Navigate to record-upload
                      window.location.href = '/record-upload';
                    }
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                  </svg>
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Third Column - Composite Card with Glass Container */}
          <div style={{ width: '420px', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', paddingLeft: '20px', marginLeft: '35px' }}>
            <div className="relative" style={{ width: '380px' }}>
              {/* Glass Container Background */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5)), url(/images/ballsglass.png)",
                  backgroundRepeat: "no-repeat, no-repeat",
                  backgroundPosition: "center, center",
                  backgroundSize: "100% 100%, contain",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: "inset 0 0 0 1px #FFFFFF",
                  borderRadius: 30,
                  zIndex: 1,
                }}
              />

              {/* Composite Card - Centered */}
              <div className="relative flex items-center justify-center" style={{ height: '100%', padding: '20px', zIndex: 2 }}>
                <div style={{ 
                  width: '100%',
                  maxWidth: 346,
                  margin: '0 auto',
                  position: 'relative'
                }}>
                  {isReturningUser && existingCompositeCardUrl ? (
                    // Show existing composite card for returning users
                    <div style={{
                      width: '100%',
                      maxWidth: 346,
                      margin: '0 auto'
                    }}>
                      <img 
                        src={existingCompositeCardUrl} 
                        alt="Your Analysis Card" 
                        style={{
                          width: '100%',
                          height: 'auto',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}
                      />
                    </div>
                  ) : (
                    // Generate new composite card for new users or users without existing card
                  <CompositeCard
                    accuracyDisplay={accuracyDisplay}
                    runUpScore={runUpScore}
                    deliveryScore={deliveryScore}
                    followThroughScore={followThroughScore}
                    playerName={sessionAnalysisData?.playerName || playerName || "PLAYER NAME"}
                    kmhValue={kmhValue}
                    armSwingScore={armSwingScore}
                    bodyMovementScore={bodyMovementScore}
                    rhythmScore={rhythmScore}
                    releasePointScore={releasePointScore}
                    recommendations={
                      (benchmarkDetailedData?.recommendations?.length || sessionAnalysisData?.recommendations?.length) > 0
                        ? (benchmarkDetailedData?.recommendations || sessionAnalysisData?.recommendations || []).join(' ')
                        : "Great technique! Keep practicing to maintain consistency."
                    }
                  />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Footer */}
        <footer className="w-full bg-black px-4 md:px-8 pt-4 pb-6 relative z-20">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 md:gap-6 max-w-7xl mx-auto">
            <div className="text-center">
              <p 
              className="text-white text-xs"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '400',
                fontSize: 'clamp(10px, 2vw, 14px)',
                lineHeight: '1.4'
              }}
            >
                © L&T Finance Limited (formerly known as L&T Finance Holdings Limited) | CIN: L67120MH2008PLC181833 | <Link href="/terms-and-conditions" className="text-blue-300 hover:text-blue-200 underline">Terms and Conditions</Link>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span 
              className="text-white text-xs mr-2"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: '400',
                fontSize: 'clamp(10px, 2vw, 14px)'
              }}
            >
                Connect with us
              </span>
              <div className="flex gap-3 md:gap-4">
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <a href="https://m.facebook.com/LnTFS?wtsid=rdr_0GljAOcj6obaXQY93" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <a href="https://www.instagram.com/lntfinance?igsh=a3ZvY2JxaWdnb25s" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/></svg>
                  </a>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <a href="https://x.com/LnTFinance" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                  </a>
                </div>
                <a href="https://www.youtube.com/user/ltfinance" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Always include the modal in case it needs to be triggered */}
      <NoBowlingActionModal
        open={showNoBowlingModal}
        onOpenChange={setShowNoBowlingModal}
      />
    </>
  );
}



