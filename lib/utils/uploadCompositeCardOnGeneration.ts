'use client';

import { uploadCompositeCard } from './compositeCardUpload';

/**
 * Generates and uploads composite card to Supabase when analysis completes
 * This happens automatically when the card is displayed, not when downloaded
 */
export async function uploadCompositeCardOnGeneration(options: {
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
}): Promise<{ compositeCardUrl: string; recordId: string } | null> {
  const {
    accuracyDisplay,
    runUpScore,
    deliveryScore,
    followThroughScore,
    playerName,
    kmhValue,
    armSwingScore,
    bodyMovementScore,
    rhythmScore,
    releasePointScore,
    recommendations,
    sessionAnalysisData
  } = options;

  try {
    console.log('🎨 Auto-generating composite card for upload to Supabase...');
    
    // Wait for fonts to be ready and explicitly load Helvetica Condensed
    if (typeof document !== 'undefined') {
      await document.fonts.ready;
      
      // Explicitly load Helvetica Condensed font before rendering
      try {
        // Try to load Helvetica Condensed from system fonts
        const helveticaCondensed = new FontFace(
          'Helvetica Condensed',
          'local("Helvetica Condensed"), local("HelveticaNeue-CondensedBold"), local("Arial Narrow")'
        );
        await helveticaCondensed.load();
        document.fonts.add(helveticaCondensed);
        console.log('✅ Helvetica Condensed font loaded successfully');
      } catch (fontError) {
        console.warn('⚠️ Could not load Helvetica Condensed, will use fallback font:', fontError);
      }
    }
    
    // Reference dimensions (same as download version)
    const REFERENCE_WIDTH = 346;
    const REFERENCE_HEIGHT = REFERENCE_WIDTH * 1.8;
    
    // Create high-res canvas
    const EXPORT_SCALE = 3;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ Failed to get canvas context');
      return null;
    }
    
    canvas.width = REFERENCE_WIDTH * EXPORT_SCALE;
    canvas.height = REFERENCE_HEIGHT * EXPORT_SCALE;
    ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    console.log('📐 Canvas:', canvas.width, 'x', canvas.height, 'at scale', EXPORT_SCALE);
    
    // Load images
    const loadImg = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    
    const [upper, bottom, vector, defaultAvatar] = await Promise.all([
      loadImg('/frontend-images/homepage/upperpart.png'),
      loadImg('/frontend-images/homepage/bottompart.png'),
      loadImg('/images/Vector 8.svg'),
      loadImg('/images/defaultavatar.png')
    ]);
    
    // Load Gemini torso if available
    let torso: HTMLImageElement | null = null;
    let useDefaultAvatar = false;
    const torsoSrc = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('generatedTorsoImage') : null;
    if (torsoSrc) {
      try { 
        torso = await loadImg(torsoSrc);
        console.log('✅ Loaded Gemini generated torso image');
      } catch (e) { 
        console.warn('⚠️ Gemini torso load failed, using default avatar');
        useDefaultAvatar = true;
      }
    } else {
      console.log('ℹ️ No Gemini image found, using default avatar');
      useDefaultAvatar = true;
    }
    
    // Draw background images
    const upperH = (REFERENCE_WIDTH * upper.height) / upper.width;
    ctx.drawImage(upper, 0, 0, REFERENCE_WIDTH, upperH);
    
    // Draw avatar (Gemini generated or default)
    if (torso && !useDefaultAvatar) {
      // Gemini generated torso - match UI placement with updated offset
      const torsoSize = 285;
      const torsoTop = 105;
      const torsoRightOffset = 20; // Moved 35px to the right (was -15, now 20) to match UI
      const x = REFERENCE_WIDTH + torsoRightOffset - torsoSize;
      // Add a subtle drop shadow to prevent blending with background
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      ctx.drawImage(torso, x, torsoTop, torsoSize, torsoSize);
      ctx.restore();
      console.log('🎨 Drew Gemini torso at x:', x, 'size:', torsoSize);
    } else if (useDefaultAvatar) {
      // Default avatar - match UI placement
      const defaultSize = 300;
      const defaultTop = 105;
      const defaultRightOffset = 20; // Moved 35px to the right (was -15, now 20) to match UI
      const x = REFERENCE_WIDTH + defaultRightOffset - defaultSize;
      ctx.drawImage(defaultAvatar, x, defaultTop, defaultSize, defaultSize);
      console.log('🎨 Drew default avatar at x:', x, 'size:', defaultSize);
    }
    
    const bottomH = (REFERENCE_WIDTH * bottom.height) / bottom.width;
    ctx.drawImage(bottom, 0, REFERENCE_HEIGHT - bottomH, REFERENCE_WIDTH, bottomH);
    
    // Draw text - all at scale 1 (reference dimensions)
    ctx.fillStyle = 'white';
    ctx.font = '700 32.18px "Helvetica Condensed", Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(`${accuracyDisplay}%`, 16, 110); // Moved closer to MATCH box (was 98.39px, now 110px)
    
    // MATCH box
    ctx.fillStyle = '#114F80';
    ctx.beginPath();
    ctx.moveTo(26.5, 144);
    ctx.lineTo(91, 144);
    ctx.lineTo(91, 165);
    ctx.lineTo(26.5, 165);
    ctx.quadraticCurveTo(16, 165, 16, 154.5);
    ctx.lineTo(16, 154.5);
    ctx.quadraticCurveTo(16, 144, 26.5, 144);
    ctx.fill();
    
    ctx.fillStyle = '#FFCA04';
    ctx.font = '700 14px "Helvetica Condensed", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    // Match UI: box at 144 + text offset 2 = 146, left at 30 (16 + 14)
    ctx.fillText('MATCH', 30, 146);
    
    // Phases - Match UI exactly: percentage at top, label box at top + 20
    [{l: 'RUN-UP', s: runUpScore, t: 215}, {l: 'DELIVERY', s: deliveryScore, t: 255}, {l: 'FOLLOW THRU', s: followThroughScore, t: 295}].forEach(({l, s: score, t}) => {
      const pct = Math.min(score, 100);
      
      // Percentage - centered above the label box
      ctx.fillStyle = 'white';
      ctx.font = '700 13.56px "Helvetica Condensed", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`${pct}%`, 47.655, t + 11); // Use alphabetic baseline + offset for stable positioning
      
      // Label box - rounded rect at top + 20
      ctx.fillStyle = '#FFCA04';
      const boxTop = t + 20; // Match UI: top + 20
      const boxHeight = 14.27; // Match UI height
      const boxRadius = 7.23; // Half of height (rounded pill shape)
      ctx.beginPath();
      ctx.arc(23.23, boxTop + boxRadius, boxRadius, Math.PI, Math.PI * 1.5);
      ctx.arc(72.08, boxTop + boxRadius, boxRadius, -Math.PI/2, 0);
      ctx.arc(72.08, boxTop + boxHeight - boxRadius, boxRadius, 0, Math.PI/2);
      ctx.arc(23.23, boxTop + boxHeight - boxRadius, boxRadius, Math.PI/2, Math.PI);
      ctx.fill();
      
      // Label text - centered in the box
      ctx.fillStyle = '#13264A';
      ctx.font = '700 8.14px "Helvetica Condensed", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(l, 47.655, boxTop + (boxHeight / 2)); // Centered vertically
    });
    
    // Name
    ctx.fillStyle = 'white';
    ctx.font = '400 16px "Helvetica Condensed", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText((sessionAnalysisData?.playerName || playerName || 'PLAYER NAME').toUpperCase(), 16, 403.06);
    
    // Speed
    ctx.textBaseline = 'alphabetic';
    const speedY = 399.44 + 61.94 * 0.7;
    ctx.font = '700 36.17px "Helvetica Condensed", Arial, sans-serif';
    const sw = ctx.measureText(`${kmhValue}`).width;
    ctx.fillText(`${kmhValue}`, 256.16, speedY);
    ctx.font = '700 9.04px "Helvetica Condensed", Arial, sans-serif';
    ctx.fillText('kmph', 260.16 + sw, speedY);
    
    // Technical metrics
    [{l: 'ARM SWING', v: armSwingScore}, {l: 'BODY MOVEMENT', v: bodyMovementScore}, {l: 'RHYTHM', v: rhythmScore}, {l: 'RELEASE POINT', v: releasePointScore}].forEach((m, i) => {
      const y = 466.38 + i * 16;
      const pct = Math.min(m.v, 100);
      ctx.fillStyle = 'white';
      ctx.font = '400 6px "Helvetica Condensed", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(m.l, 256.16, y);
      ctx.font = '700 8.14px "Helvetica Condensed", Arial, sans-serif';
      ctx.textAlign = 'right';
      // Move percentage up slightly for better alignment
      ctx.fillText(`${pct}%`, 333.92, y - 1.0);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(256.16, y + 10, 77.76, 3);
      ctx.fillStyle = '#FFC315';
      ctx.fillRect(256.16, y + 10, (77.76 * pct) / 100, 3);
    });
    
    // Recommendations
    ctx.fillStyle = 'white';
    ctx.font = '700 10px "Helvetica Condensed", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('RECOMMENDATIONS', 16, 465);
    ctx.font = '400 8px "Helvetica Condensed", Arial, sans-serif';
    const words = (recommendations || "Great technique! Keep practicing to maintain consistency.").split(' ');
    let line = '', y = 479;
    words.forEach((w, i) => {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > 160 && i > 0) {
        ctx.fillText(line, 16, y);
        line = w + ' ';
        y += 10;
      } else {
        line = test;
      }
    });
    ctx.fillText(line, 16, y);
    
    // Speed meter
    ctx.font = '700 8px "Helvetica Condensed", Arial, sans-serif';
    ctx.fillText('SPEED METER ANALYSIS', 16, 433.06);
    
    ['#FCF0C4', '#F6E49E', '#FFCA04', '#118DC9', '#0F76A8'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(16 + i * 31.32, 445, 30.32, 5.35);
    });
    
    ctx.fillStyle = 'white';
    ctx.font = '700 12px "Helvetica Condensed", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${accuracyDisplay}%`, 16 + 30.32 * 4 + 1 * 4 + 15.16, 430);
    
    ctx.fillRect(16, 453.35, 157.82, 0.89);
    ctx.drawImage(vector, 16 + (157.82 * accuracyDisplay / 100) - 1.475, 448.85, 2.95, 9.85);
    
    console.log('🎨 Canvas rendering complete - all positions match UI:');
    console.log('  - Main %: 110px (closer to MATCH box)');
    console.log('  - MATCH text: 146px (box 144 + offset 2)');
    console.log('  - Phases: 215, 255, 295px (labels at +20)');
    console.log('  - All other elements aligned to UI');
    
    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
      }, 'image/png', 1.0);
    });
    
    // Upload to Supabase
    console.log('📤 Uploading composite card to Supabase (auto-upload on generation)...');
    const uploadResult = await uploadCompositeCard(blob, options, playerName);
    
    if (uploadResult) {
      console.log('✅ Composite card auto-uploaded successfully!');
      console.log('🔗 URL:', uploadResult.compositeCardUrl);
      console.log('📝 Record ID:', uploadResult.recordId);
      
      // Store the URL in sessionStorage for potential use later
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('uploadedCompositeCardUrl', uploadResult.compositeCardUrl);
        sessionStorage.setItem('uploadedCompositeCardId', uploadResult.recordId);
      }
      
      return uploadResult;
    } else {
      console.warn('⚠️ Composite card auto-upload failed');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Composite card auto-upload error:', error);
    return null;
  }
}

