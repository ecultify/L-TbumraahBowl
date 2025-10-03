// Manual canvas rendering - exact mirror of CompositeCard DOM
export async function downloadCompositeCardManual(options: {
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
}) {
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
    console.log('📥 Starting manual canvas - rendering at reference width 346px (v2.0 - Fixed positioning)');
    
    await document.fonts.ready;
    
    // Reference dimensions (always render at 346px wide for consistency)
    const REFERENCE_WIDTH = 346;
    const REFERENCE_HEIGHT = REFERENCE_WIDTH * 1.8;
    
    // Create high-res canvas
    const EXPORT_SCALE = 3;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = REFERENCE_WIDTH * EXPORT_SCALE;
    canvas.height = REFERENCE_HEIGHT * EXPORT_SCALE;
    ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    console.log('Canvas:', canvas.width, 'x', canvas.height, 'at scale', EXPORT_SCALE);
    
    // Load images
    const loadImg = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    
    const [upper, bottom, vector] = await Promise.all([
      loadImg('/frontend-images/homepage/upperpart.png'),
      loadImg('/frontend-images/homepage/bottompart.png'),
      loadImg('/images/Vector 8.svg')
    ]);
    
    let torso: HTMLImageElement | null = null;
    const torsoSrc = sessionStorage.getItem('generatedTorsoImage');
    if (torsoSrc) {
      try { torso = await loadImg(torsoSrc); } catch (e) { console.warn('Torso load failed'); }
    }
    
    // Draw background images
    const upperH = (REFERENCE_WIDTH * upper.height) / upper.width;
    ctx.drawImage(upper, 0, 0, REFERENCE_WIDTH, upperH);
    
    if (torso) {
      // Match UI placement: slightly smaller than 300 to mirror on-screen
      const torsoSize = 285;
      const torsoTop = 105;
      const torsoRightOffset = -20;
      const x = REFERENCE_WIDTH + torsoRightOffset - torsoSize;
      // Add a subtle drop shadow to prevent blending with background
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      ctx.drawImage(torso, x, torsoTop, torsoSize, torsoSize);
      ctx.restore();
    }
    
    const bottomH = (REFERENCE_WIDTH * bottom.height) / bottom.width;
    ctx.drawImage(bottom, 0, REFERENCE_HEIGHT - bottomH, REFERENCE_WIDTH, bottomH);
    
    // Draw text - all at scale 1 (reference dimensions)
    ctx.fillStyle = 'white';
    ctx.font = '700 32.18px "Helvetica Condensed", Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(`${accuracyDisplay}%`, 16, 103);
    
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
    ctx.textBaseline = 'middle';
    // Move text right (30 -> 32) and down (154.5 -> 155.5)
    ctx.fillText('MATCH', 32, 155.5);
    
    // Phases (positions tuned to match UI and vertical alignment)
    [{l: 'RUN-UP', s: runUpScore, t: 215}, {l: 'DELIVERY', s: deliveryScore, t: 255}, {l: 'FOLLOW THRU', s: followThroughScore, t: 295}].forEach(({l, s: score, t}) => {
      const pct = Math.min(score, 100);
      ctx.fillStyle = 'white';
      ctx.font = '700 13.56px "Helvetica Condensed", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Place percentage slightly higher so it sits above the container nicely
      ctx.fillText(`${pct}%`, 47.655, t + 12);
      
      ctx.fillStyle = '#FFCA04';
      ctx.beginPath();
      ctx.arc(23.23, t + 27.23, 7.23, Math.PI, Math.PI * 1.5);
      ctx.arc(72.08, t + 27.23, 7.23, -Math.PI/2, 0);
      ctx.arc(72.08, t + 34.27 - 7.23, 7.23, 0, Math.PI/2);
      ctx.arc(23.23, t + 34.27 - 7.23, 7.23, Math.PI/2, Math.PI);
      ctx.fill();
      
      ctx.fillStyle = '#13264A';
      ctx.font = '700 8.14px "Helvetica Condensed", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Lift label text by ~1px to avoid low positioning due to font metrics differences
      ctx.fillText(l, 47.655, t + 29.5);
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
    
    // Download
    console.log('🎨 Rendering positions:', {
      matchText: { x: 30, y: 154.5 },
      phasePercentages: 't + 18',
      techPercentages: 'y + 1',
      techBars: 'y + 10'
    });
    
    const url = canvas.toDataURL('image/png', 1.0);
    const a = document.createElement('a');
    a.download = `bowling-report-v2-${Date.now()}.png`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    console.log('✅ Download complete with updated positioning');
  } catch (error) {
    console.error('❌ Download failed:', error);
    throw error;
  }
}
