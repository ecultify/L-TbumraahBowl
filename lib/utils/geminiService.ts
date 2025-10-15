// Gemini API Service for Torso Generation
'use client';

const GEMINI_API_KEY = 'AIzaSyBRyKCamJ5jwSbzGS_lHt1hz6xVuaMbPa8';
const IMAGEN_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImage';

export interface TorsoGenerationRequest {
  croppedHeadImage: string; // base64 data URL
  gender?: 'male' | 'female' | 'auto';
  customPrompt?: string; // Optional custom prompt to override default
}

export interface TorsoGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

// Convert data URL to base64 string (remove data:image/jpeg;base64, prefix)
function dataURLToBase64(dataURL: string): string {
  const base64Index = dataURL.indexOf('base64,');
  if (base64Index !== -1) {
    return dataURL.substring(base64Index + 7);
  }
  return dataURL; // Already base64
}

// Enhanced prompt for generating Indian cricket jersey torso with chest-level crop (no hands visible)
function createTorsoGenerationPrompt(): string {
  return `GENERATE A 300x300 PIXEL PNG IMAGE WITH COMPLETELY TRANSPARENT BACKGROUND (ALPHA CHANNEL): Create a professional chest-level portrait of an cricket player using the EXACT face from the provided image without any modifications. The person must be wearing a blue tshirt.CRITICAL - IMAGE DIMENSIONS:
- EXACT SIZE: 300 pixels wide by 300 pixels tall (300x300)
- SQUARE FORMAT: Must be a perfect square
- HIGH QUALITY: Maintain sharpness and clarity at this resolution

CRITICAL - TRANSPARENT BACKGROUND:
- MUST OUTPUT: PNG format with full alpha channel transparency
- BACKGROUND: 100% transparent - NO color, NO white, NO gray, NO background of ANY kind
- The background must be completely see-through (transparent pixels only)
- Only the person should be visible - everything else must be transparent
- NO SOLID BACKGROUNDS, NO GRADIENTS, NO STUDIO BACKGROUNDS

CRITICAL - COMPOSITION:
- FRAME INCLUDES: Entire head, full width of both shoulders, and upper chest down to mid-chest
- Provide a small transparent margin so the head and shoulders never touch the canvas edges
- NO HANDS, NO ARMS below the shoulders visible in the final output
- Use input face EXACTLY as provided with ZERO alterations
- Maintain exact facial features, hairstyle, and skin tone from input

STYLING:
- Blue Tshort Jersey: primary blue with orange accents
- Jersey must be completely clean: absolutely no brand logos, sponsor marks, badges, numbers, or extra text anywhere.
- Simple upright posture, centered composition
- Gender-appropriate body proportions
- High resolution photorealistic quality
- Clean edges with alpha transparency cutout

MANDATORY OUTPUT SPECIFICATIONS:
- Dimensions: Exactly 300x300 pixels
- Format: PNG with transparency (not JPEG)
- Background: Fully transparent alpha channel
- Person cutout: Clean edges, no halo, no artifacts
- Ensure shoulders and head are fully visible without being cropped on any side
- NO BACKGROUND COLORS OR PATTERNS - ONLY TRANSPARENT PIXELS`;
}

// Enhanced negative prompt
function createNegativePrompt(): string {
  return `altered_face, modified_facial_features, enhanced_face, different_expression, changed_face_angle, face_beautification, face_smoothing, different_skin_tone_on_face, mismatched_face, AI_enhanced_face, face_style_transfer, modified_eyes, altered_nose, changed_mouth, different_eyebrows, face_retouching, harsh_blend_lines, inconsistent_lighting, disproportionate_head_to_body_ratio, wrong_gender_body_type, overly_muscular, too_skinny, awkward_pose, bad_jersey_fit, visible_editing_artifacts, sponsor_logos, brand_logos, commercial_logos, jersey_badges, jersey_numbers, extra_text_on_shirt, text_other_than_india, advertisements, full_body_shot, waist_visible, hips_visible, legs_visible, below_chest_content, hands_visible, arms_visible, cropped_shoulders, shoulders_cut_off, head_cropped, hair_cropped, folded_arms, crossed_arms, hands_in_frame, elbows_visible, forearms_visible, wrists_visible, fingers_visible, background_color, colored_background, solid_background, gradient_background, studio_background, wall_background, opaque_background, white_background, gray_background, blue_background`;
}

export class GeminiTorsoService {
  private apiKey: string;

  constructor() {
    this.apiKey = GEMINI_API_KEY;
  }

  // Generate torso image with Imagen 3 via backend API
  async generateTorso(request: TorsoGenerationRequest): Promise<TorsoGenerationResult> {
    try {
      console.log('Starting Gemini 2.5 Flash Image Preview via backend...');
      
      if (!request.croppedHeadImage) {
        throw new Error('Cropped head image is required');
      }

      // Convert data URL to base64
      const base64Image = dataURLToBase64(request.croppedHeadImage);
      
      // Determine MIME type from data URL
      let mimeType = 'image/jpeg';
      if (request.croppedHeadImage.includes('data:image/png')) {
        mimeType = 'image/png';
      } else if (request.croppedHeadImage.includes('data:image/webp')) {
        mimeType = 'image/webp';
      }

      const prompt = request.customPrompt || createTorsoGenerationPrompt();

      // Prepare request body for backend API
      const requestBody = {
        prompt: prompt,
        referenceImage: {
          mime_type: mimeType,
          data: base64Image
        }
      };

      console.log('Sending request to backend Gemini API...');
      
      const BASE = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || '';
      const EXT = process.env.NEXT_PUBLIC_BACKEND_EXT || '';
      const genCandidates = [
        `${BASE}/api/generate-imagen${EXT}`,
        `${BASE}/api/generate-imagen.php`,
        `${BASE}/api/generate-imagen`,
      ].filter((v, i, a) => v && a.indexOf(v) === i);

      let responseData: any = null;
      for (const url of genCandidates) {
        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          console.log('Backend API response status:', resp.status, 'url:', url);
          if (!resp.ok) continue;
          const text = await resp.text();
          if (text.trim().startsWith('<?php')) {
            console.warn('Backend returned PHP source (not executed) for', url);
            continue;
          }
          try {
            responseData = JSON.parse(text);
            break;
          } catch {
            console.warn('Backend returned non-JSON for', url);
            continue;
          }
        } catch (err) {
          console.warn('Backend call failed for candidate', url, err);
        }
      }

      if (!responseData) {
        // Last-resort: direct Gemini API call from client
        try {
          console.log('Falling back to direct Gemini API call from client...');
          const directResp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': this.apiKey,
            },
            body: JSON.stringify({
              contents: [
                { parts: [{ text: prompt }] },
                ...(base64Image ? [{ parts: [{ inline_data: { mime_type: mimeType, data: base64Image } }] }] : [])
              ]
            })
          });
          const directTxt = await directResp.text();
          const directJson = JSON.parse(directTxt);
          const parts = directJson?.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            const inline = part.inline_data || part.inlineData;
            if (inline?.data) {
              const b64 = inline.data;
              const m = inline.mime_type || inline.mimeType || 'image/png';
              responseData = { success: true, imageUrl: `data:${m};base64,${b64}` };
              break;
            }
          }
        } catch (e) {
          console.error('Direct Gemini call failed:', e);
        }
      }

      if (!responseData) {
        throw new Error('Gemini backend unavailable and direct call failed');
      }
      console.log('Backend or direct API response received');

      // 🔧 CRITICAL VALIDATION: Check if Gemini returned valid image
      if (!responseData || !responseData.success || !responseData.imageUrl) {
        console.error('[GEMINI] ❌ Invalid response from Gemini API:', responseData);
        throw new Error('Gemini API returned empty or invalid image');
      }

      // 🔧 VALIDATE: Ensure imageUrl is a proper data URL
      if (!responseData.imageUrl.startsWith('data:image/')) {
        console.error('[GEMINI] ❌ Invalid image URL format:', responseData.imageUrl.substring(0, 100));
        throw new Error('Gemini API returned invalid image URL format');
      }

      console.log('✅ Gemini image validation passed');
      console.log('📊 Gemini image size:', Math.round(responseData.imageUrl.length / 1024), 'KB');
      
      if (responseData.success && responseData.imageUrl) {
        console.log('Gemini 2.5 Flash Image Preview torso generation completed successfully via backend');

        // Hostinger flow: Remove background using PHP endpoint
        console.log('[TORSO GEN] Removing background via PHP remove-bg...');
        let bgRemovedUrl: string = responseData.imageUrl;
        try {
          bgRemovedUrl = await this.removeBackground(responseData.imageUrl);
        } catch (e) {
          console.warn('[TORSO GEN] Background removal failed, using original image', e);
        }

        // Resize to 300x300
        console.log('[TORSO GEN] Resizing image to 300x300...');
        const resizedImageUrl = await this.resizeImage(bgRemovedUrl || responseData.imageUrl, 300, 300);
        const finalPng = resizedImageUrl || bgRemovedUrl || responseData.imageUrl;

        if (!resizedImageUrl) {
          console.error('[TORSO GEN] Image resize failed, using un-resized image');
        } else {
          console.log('[TORSO GEN] Image resize completed successfully');
        }

        return {
          success: true,
          imageUrl: finalPng
        };
      } else {
        return {
          success: false,
          error: responseData.error || 'Unknown error from backend API'
        };
      }

    } catch (error) {
      console.error('Gemini torso generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Resize image to exact dimensions (300x300)
  private async resizeImage(imageUrl: string, targetWidth: number, targetHeight: number): Promise<string> {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        if (!imageUrl.startsWith('data:')) { img.crossOrigin = 'anonymous'; }
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(imageUrl); return; }
          canvas.width = targetWidth; canvas.height = targetHeight;
          const iw = img.width, ih = img.height;
          const scale = Math.min(targetWidth / iw, targetHeight / ih);
          const dw = Math.round(iw * scale), dh = Math.round(ih * scale);
          const dx = Math.floor((targetWidth - dw) / 2), dy = Math.floor((targetHeight - dh) / 2);
          ctx.clearRect(0,0,targetWidth,targetHeight);
          ctx.imageSmoothingEnabled = true; (ctx as any).imageSmoothingQuality = 'high';
          ctx.drawImage(img, dx, dy, dw, dh);
          resolve(canvas.toDataURL('image/png', 1.0));
        };
        img.onerror = () => resolve(imageUrl);
        img.src = imageUrl;
      } catch { resolve(imageUrl); }
    });
  }

  // Background removal with Segmind V2 model - CLIENT-SIDE DIRECT CALL
  private async removeBackground(imageUrl: string): Promise<string> {
    console.log('[BG REMOVAL] 🎨 Starting background removal with Segmind BG Removal V2 API...');
    console.log('[BG REMOVAL] Image URL length:', imageUrl.substring(0, 100));
    
    try {
      // Convert data URL to base64 (remove data:image prefix if present)
      let base64Image = imageUrl;
      if (imageUrl.startsWith('data:')) {
        const base64Match = imageUrl.match(/^data:image\/[a-z]+;base64,(.+)$/);
        if (base64Match && base64Match[1]) {
          base64Image = base64Match[1];
        }
      }
      
      // ALWAYS compress to avoid payload size issues
      const originalSizeKB = Math.round(base64Image.length / 1024);
      console.log('[BG REMOVAL] 📊 Original Gemini image size:', originalSizeKB, 'KB');
      
      // Aggressive compression to ensure reasonable payload size
      let compressionQuality = 0.85;
      let maxWidth = 1200;
      
      if (originalSizeKB > 5000) {
        compressionQuality = 0.7;
        maxWidth = 800;
        console.log('[BG REMOVAL] 🔥 Very large image detected, using aggressive compression');
      } else if (originalSizeKB > 3000) {
        compressionQuality = 0.75;
        maxWidth = 1000;
        console.log('[BG REMOVAL] ⚠️ Large image detected, using standard compression');
      } else if (originalSizeKB > 1500) {
        compressionQuality = 0.8;
        maxWidth = 1100;
        console.log('[BG REMOVAL] 📦 Medium image detected, using light compression');
      } else {
        console.log('[BG REMOVAL] ✅ Small image, using minimal compression');
      }
      
      console.log('[BG REMOVAL] 🔧 Compressing with quality:', compressionQuality, 'maxWidth:', maxWidth);
      const finalImageToSend = await this.compressImage(imageUrl, maxWidth, compressionQuality);
      const compressedBase64 = finalImageToSend.split(',')[1] || finalImageToSend;
      const compressedSizeKB = Math.round(compressedBase64.length / 1024);
      console.log('[BG REMOVAL] ✅ Compressed from', originalSizeKB, 'KB to', compressedSizeKB, 'KB');
      
      // If still too large, compress even more
      if (compressedSizeKB > 2500) {
        console.log('[BG REMOVAL] ⚠️ Still too large, applying secondary compression...');
        const secondPass = await this.compressImage(finalImageToSend, 600, 0.6);
        const secondPassBase64 = secondPass.split(',')[1] || secondPass;
        const secondPassSizeKB = Math.round(secondPassBase64.length / 1024);
        console.log('[BG REMOVAL] ✅ Secondary compression: from', compressedSizeKB, 'KB to', secondPassSizeKB, 'KB');
        base64Image = secondPassBase64;
      } else {
        base64Image = compressedBase64;
      }
      
      console.log('[BG REMOVAL] 🚀 Calling Segmind API DIRECTLY from client (bypassing Next.js server)...');
      console.log('[BG REMOVAL] 📦 Final payload size:', Math.round(base64Image.length / 1024), 'KB');
      
      // Call Segmind API directly from client
      const SEGMIND_API_KEY = 'SG_c7a0d229dc5d25b4';
      const SEGMIND_API_URL = 'https://api.segmind.com/v1/bg-removal-v2';
      
      const response = await fetch(SEGMIND_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': SEGMIND_API_KEY
        },
        body: JSON.stringify({
          image: base64Image,
          type: 'transparent'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[BG REMOVAL] ❌ Segmind API error:', response.status, errorText);
        throw new Error(`Segmind API error: ${response.status}`);
      }
      
      // Segmind returns image binary directly
      const imageBuffer = await response.arrayBuffer();
      const base64Result = btoa(
        new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      const dataUrl = `data:image/png;base64,${base64Result}`;
      
      console.log('[BG REMOVAL] 🎉 Success! Background removed via Segmind API (client-side)');
      console.log('[BG REMOVAL] 📊 Result size:', Math.round(base64Result.length / 1024), 'KB');
      return dataUrl;
      
    } catch (error: any) {
      console.error('[BG REMOVAL] ❌ Segmind BG Removal V2 API failed:', error);
      console.error('[BG REMOVAL] Error type:', typeof error);
      console.error('[BG REMOVAL] Error message:', error.message || error);
      console.error('[BG REMOVAL] Error stack:', error.stack || 'No stack trace');
      console.warn('[BG REMOVAL] ⚠️ Returning original image due to error');
      return imageUrl;
    }
  }


  // Helper: Compress image to reduce payload size
  private async compressImage(dataUrl: string, maxWidth: number = 800, quality: number = 0.9): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not available'));
          return;
        }

        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Compress as JPEG with quality setting
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  // Fallback: Use local composite approach
  async generateTorsoFallback(request: TorsoGenerationRequest): Promise<TorsoGenerationResult> {
    try {
      console.log('Using composite approach for torso generation...');
      
      // Create a canvas for compositing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not available');
      
      // Set exact canvas size: 300x300 (square) and keep background fully transparent
      canvas.width = 300;
      canvas.height = 300;
      // Ensure fully transparent background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw a simplified chest-level jersey (no arms/hands), leaving background transparent
      // Collar
      ctx.fillStyle = '#f97316'; // Orange trim
      ctx.fillRect(60, 70, canvas.width - 120, 8);
      
      // Add "INDIA" text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('INDIA', canvas.width / 2, 110);
      
      // Draw a simple upper chest shape (no arms)
      ctx.fillStyle = '#1e3a8a'; // Jersey blue
      ctx.beginPath();
      // Rounded shoulder line
      ctx.moveTo(40, 150);
      ctx.quadraticCurveTo(75, 120, 110, 120);
      ctx.lineTo(190, 120);
      ctx.quadraticCurveTo(225, 120, 260, 150);
      // Chest down to mid-chest
      ctx.lineTo(260, 220);
      ctx.lineTo(40, 220);
      ctx.closePath();
      ctx.fill();
      
      // Add the face/head image
      if (request.croppedHeadImage) {
        const headImg = new Image();
        await new Promise((resolve, reject) => {
          headImg.onload = resolve;
          headImg.onerror = reject;
          headImg.src = request.croppedHeadImage;
        });
        
        // Calculate head position and size to fit chest-level framing
        const headWidth = 120;
        const headHeight = 120;
        const headX = (canvas.width - headWidth) / 2;
        const headY = 8;
        
        // Draw the head
        ctx.drawImage(headImg, headX, headY, headWidth, headHeight);
      }
      
      // Convert canvas to PNG (preserve transparency) and exact 300x300
      const compositeImageUrl = canvas.toDataURL('image/png', 1.0);
      
      console.log('Composite torso generation completed');
      return {
        success: true,
        imageUrl: compositeImageUrl
      };
      
    } catch (error) {
      console.error('Composite torso generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Composite generation failed'
      };
    }
  }
}

// Session storage utilities for generated torso images
export function storeGeneratedTorsoImage(imageDataUrl: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('generatedTorsoImage', imageDataUrl);
    console.log('Generated torso image stored in session storage');
  }
}

export function getGeneratedTorsoImage(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('generatedTorsoImage');
  }
  return null;
}

export function clearGeneratedTorsoImage() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('generatedTorsoImage');
  }
}

// Also export session storage utilities for cropped head images
export function getCroppedHeadImage(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('croppedHeadImage');
  }
  return null;
}

// Singleton instance
let geminiTorsoService: GeminiTorsoService | null = null;

export function getGeminiTorsoService(): GeminiTorsoService {
  if (!geminiTorsoService) {
    geminiTorsoService = new GeminiTorsoService();
  }
  return geminiTorsoService;
}

// Test function for background removal (for debugging)
export async function testBackgroundRemoval(imageUrl: string): Promise<string> {
  console.log('ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Âª [TEST] Testing background removal with image:', imageUrl.substring(0, 100) + '...');
  const service = getGeminiTorsoService();
  
  // Access private method for testing
  const result = await (service as any).removeBackground(imageUrl);
  console.log('ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Âª [TEST] Background removal test result:', result ? 'Success' : 'Failed');
  return result;
}
