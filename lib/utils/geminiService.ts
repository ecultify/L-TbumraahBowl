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
  return `GENERATE A 300x300 PIXEL PNG IMAGE WITH COMPLETELY TRANSPARENT BACKGROUND (ALPHA CHANNEL): Create a professional chest-level portrait of an Indian cricket player using the EXACT face from the provided image without any modifications. The person must be wearing an official Indian cricket team blue jersey with "INDIA" text only.

CRITICAL - IMAGE DIMENSIONS:
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
- Indian cricket team jersey: primary blue with orange accents
- Jersey must be completely clean: absolutely no brand logos, sponsor marks, badges, numbers, or extra text anywhere except the "INDIA" wordmark
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
      
      const response = await fetch('/api/generate-imagen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Backend API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend API error response:', errorData);
        
        throw new Error(errorData.error || `Backend API error: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Backend API response received');

      if (responseData.success && responseData.imageUrl) {
        console.log('Gemini 2.5 Flash Image Preview torso generation completed successfully via backend');
        
        // Apply background removal to make it fully transparent
        console.log('ðŸŽ¨ [TORSO GEN] Applying background removal for full transparency...');
        let transparentImageUrl: string | null = null;
        
        try {
          transparentImageUrl = await this.removeBackground(responseData.imageUrl);
          if (transparentImageUrl && transparentImageUrl !== responseData.imageUrl) {
            console.log('âœ… [TORSO GEN] Background removal completed successfully');
          } else {
            console.warn('âš ï¸ [TORSO GEN] Background removal returned original image, may not have worked');
          }
        } catch (bgError) {
          console.error('âŒ [TORSO GEN] Background removal failed with error:', bgError);
          console.log('ðŸ”„ [TORSO GEN] Continuing with original image...');
        }
        
        // Resize to 300x300 if not already
        console.log('ðŸ“ [TORSO GEN] Resizing image to 300x300...');
        const finalImageUrl = transparentImageUrl || responseData.imageUrl;
        const resizedImageUrl = await this.resizeImage(finalImageUrl, 300, 300);
        // Run a second background removal pass post-resize to guarantee transparent edges
        let finalPng = resizedImageUrl;
        try {
          const secondPass = await this.removeBackground(resizedImageUrl);
          if (secondPass && secondPass.startsWith('data:image/png')) {
            finalPng = secondPass;
          }
        } catch {}
        
        if (!resizedImageUrl) {
          console.error('âŒ [TORSO GEN] Image resize failed, using original image');
        } else {
          console.log('âœ… [TORSO GEN] Image resize completed successfully');
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
    try {
      return new Promise((resolve, reject) => {
        const img = new Image();
        // Don't set crossOrigin for data URLs - causes issues on iOS
        if (!imageUrl.startsWith('data:')) {
          img.crossOrigin = 'anonymous';
        }
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('Canvas context not available');
            resolve(imageUrl); // Return original on error
            return;
          }
          
          // Set exact canvas dimensions (square output)
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // Compute aspect-fit (contain) to avoid squeezing
          const iw = img.width;
          const ih = img.height;
          const scale = Math.min(targetWidth / iw, targetHeight / ih);
          const dw = Math.round(iw * scale);
          const dh = Math.round(ih * scale);
          const dx = Math.floor((targetWidth - dw) / 2);
          const dy = Math.floor((targetHeight - dh) / 2);

          // Draw image with high quality scaling, centered with transparent padding
          ctx.clearRect(0, 0, targetWidth, targetHeight);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, dx, dy, dw, dh);
          
          // ALWAYS use PNG to preserve transparency from background removal
          // PNG supports alpha channel, JPEG does not
          const format = 'image/png';
          const quality = 1.0; // Max quality for PNG (transparency preservation)
          const resizedImageUrl = canvas.toDataURL(format, quality);
          console.log(`âœ… Image resized to ${targetWidth}x${targetHeight}, format: ${format}, preserving transparency`);
          resolve(resizedImageUrl);
        };
        
        img.onerror = (error) => {
          console.error('Failed to load image for resizing:', error);
          resolve(imageUrl); // Return original on error
        };
        
        img.src = imageUrl;
      });
    } catch (error) {
      console.error('Image resize error:', error);
      return imageUrl; // Return original on error
    }
  }

  // Detect iOS devices
  private isIOS(): boolean {
    if (typeof window === 'undefined') return false;
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    console.log('ðŸ” [BG REMOVAL] iOS Detection:', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
      isIOS: isIOSDevice
    });
    return isIOSDevice;
  }

  // Remove background from image to make it fully transparent
  private async removeBackground(imageUrl: string): Promise<string> {
    try {
      console.log('ðŸ”§ [BG REMOVAL] Starting background removal process...');
      console.log('ðŸ”§ [BG REMOVAL] Image URL type:', imageUrl.startsWith('data:') ? 'Data URL' : 'External URL');
      // Prefer server-side remove.bg for best quality
      try {
        const resp = await fetch('/api/remove-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageUrl })
        });
        if (resp.ok) {
          const out = await resp.json();
          if (out?.imageUrl && typeof out.imageUrl === 'string') {
            console.log('✅ [BG REMOVAL] remove.bg succeeded via backend proxy');
            return out.imageUrl as string;
          }
        } else {
          const errText = await resp.text();
          console.warn('⚠️ [BG REMOVAL] remove.bg backend error:', errText);
        }
      } catch (rbErr) {
        console.warn('⚠️ [BG REMOVAL] remove.bg backend unavailable, falling back to local algorithm:', rbErr);
      }
      
      return new Promise((resolve, reject) => {
        const img = new Image();
        // Don't set crossOrigin for data URLs - causes issues on iOS
        if (!imageUrl.startsWith('data:')) {
          img.crossOrigin = 'anonymous';
        }
        
        img.onload = () => {
          console.log('ðŸ”§ [BG REMOVAL] Image loaded successfully, dimensions:', img.width, 'x', img.height);
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('âŒ [BG REMOVAL] Canvas context not available');
            resolve(imageUrl); // Return original on error
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw image
          ctx.drawImage(img, 0, 0);
          console.log('ðŸ”§ [BG REMOVAL] Image drawn to canvas');
          
          // Always process background removal, but use simpler algorithm on iOS for performance
          const useSimplifiedAlgorithm = this.isIOS();
          if (useSimplifiedAlgorithm) {
            console.log('âš ï¸ [BG REMOVAL] Using simplified background removal on iOS for performance');
          }
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          console.log('ðŸ”§ [BG REMOVAL] Image data extracted, processing', data.length / 4, 'pixels');
          
          let transparentPixels = 0;
          let processedPixels = 0;
          
          // PASS 1: Remove semi-transparent backgrounds and obvious background colors
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // Check if pixel is semi-transparent (alpha < 255)
            const isSemiTransparent = a < 255;
            
            if (useSimplifiedAlgorithm) {
              // Simplified algorithm for iOS - only remove semi-transparent and very light pixels
              const isVeryLight = (r + g + b) / 3 > 240;
              
              if (isSemiTransparent || isVeryLight) {
                data[i + 3] = 0; // Set alpha to 0 (fully transparent)
                transparentPixels++;
              }
            } else {
              // Full algorithm for non-iOS devices
              // Check if it's a grayish/whitish background color
              const isGrayish = Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30;
              const isLight = (r + g + b) / 3 > 200;
              
              // Check if it's a very light color (likely background)
              const isVeryLight = (r + g + b) / 3 > 240;
              
              // Check if it's a solid color background (all RGB values are similar and high)
              const isSolidBackground = Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && Math.abs(r - b) < 10 && (r + g + b) / 3 > 180;
              
              // Check if it's a blue-ish background (common in AI generated images)
              const isBlueBackground = b > r && b > g && b > 150 && (r + g) < b;
              
              // Make background fully transparent
              if (isSemiTransparent || 
                  (isGrayish && isLight) || 
                  isVeryLight || 
                  isSolidBackground || 
                  isBlueBackground) {
                data[i + 3] = 0; // Set alpha to 0 (fully transparent)
                transparentPixels++;
              }
            }
            processedPixels++;
          }
          
          console.log('ðŸ”§ [BG REMOVAL] Pass 1 complete - Basic background removal');
          
          // PASS 2: Erosion - Remove isolated pixels and noise
          if (!useSimplifiedAlgorithm) {
            console.log('ðŸ”§ [BG REMOVAL] Starting Pass 2 - Erosion (remove noise and spots)...');
            const width = canvas.width;
            const height = canvas.height;
            const pixelsToRemove: number[] = [];
            
            for (let y = 1; y < height - 1; y++) {
              for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const currentAlpha = data[idx + 3];
                
                // Skip if already transparent
                if (currentAlpha === 0) continue;
                
                // Check 8 surrounding pixels
                let transparentNeighbors = 0;
                const neighbors = [
                  [-1, -1], [0, -1], [1, -1],
                  [-1,  0],          [1,  0],
                  [-1,  1], [0,  1], [1,  1]
                ];
                
                for (const [dx, dy] of neighbors) {
                  const nx = x + dx;
                  const ny = y + dy;
                  const nIdx = (ny * width + nx) * 4;
                  if (data[nIdx + 3] === 0) {
                    transparentNeighbors++;
                  }
                }
                
                // If 6+ neighbors are transparent, this is likely noise
                if (transparentNeighbors >= 6) {
                  pixelsToRemove.push(idx);
                }
              }
            }
            
            // Remove isolated pixels
            for (const idx of pixelsToRemove) {
              data[idx + 3] = 0;
              transparentPixels++;
            }
            
            console.log('ðŸ”§ [BG REMOVAL] Pass 2 complete - Removed', pixelsToRemove.length, 'isolated noise pixels');
          }
          
          // PASS 3: Aggressive edge cleanup - Remove semi-transparent edge artifacts
          if (!useSimplifiedAlgorithm) {
            console.log('ðŸ”§ [BG REMOVAL] Starting Pass 3 - Edge artifact cleanup...');
            const width = canvas.width;
            const height = canvas.height;
            let edgePixelsRemoved = 0;
            
            for (let y = 1; y < height - 1; y++) {
              for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const currentAlpha = data[idx + 3];
                
                // Skip if already transparent or fully opaque
                if (currentAlpha === 0 || currentAlpha === 255) continue;
                
                // Check if this pixel is on the edge of transparency
                let hasTransparentNeighbor = false;
                const neighbors = [
                  [-1, -1], [0, -1], [1, -1],
                  [-1,  0],          [1,  0],
                  [-1,  1], [0,  1], [1,  1]
                ];
                
                for (const [dx, dy] of neighbors) {
                  const nx = x + dx;
                  const ny = y + dy;
                  const nIdx = (ny * width + nx) * 4;
                  if (data[nIdx + 3] === 0) {
                    hasTransparentNeighbor = true;
                    break;
                  }
                }
                
                // If on edge and semi-transparent (likely artifact), make fully transparent
                if (hasTransparentNeighbor && currentAlpha < 128) {
                  data[idx + 3] = 0;
                  edgePixelsRemoved++;
                }
              }
            }
            
            console.log('ðŸ”§ [BG REMOVAL] Pass 3 complete - Removed', edgePixelsRemoved, 'edge artifacts');
          }
          
          // PASS 4: Color-based cleanup - Remove remaining background-like pixels
          if (!useSimplifiedAlgorithm) {
            console.log('ðŸ”§ [BG REMOVAL] Starting Pass 4 - Color-based final cleanup...');
            let colorPixelsRemoved = 0;
            
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const a = data[i + 3];
              
              // Skip if already transparent
              if (a === 0) continue;
              
              // More aggressive color detection for background-like colors
              const avg = (r + g + b) / 3;
              const colorVariance = Math.max(Math.abs(r - avg), Math.abs(g - avg), Math.abs(b - avg));
              
              // Remove pixels that are:
              // 1. Very light (> 220 average)
              // 2. Low color variance (< 20) - grayish
              // 3. Semi-transparent (< 200 alpha)
              if ((avg > 220 && colorVariance < 20) || a < 200) {
                data[i + 3] = 0;
                colorPixelsRemoved++;
              }
            }
            
            console.log('ðŸ”§ [BG REMOVAL] Pass 4 complete - Removed', colorPixelsRemoved, 'background-like pixels');
          }
          
          console.log('ðŸ”§ [BG REMOVAL] Processed', processedPixels, 'pixels, made', transparentPixels, 'transparent');
          
          // Put the modified image data back
          ctx.putImageData(imageData, 0, 0);
          
          // Convert to data URL
          const transparentImageUrl = canvas.toDataURL('image/png');
          console.log('âœ… [BG REMOVAL] Background removed successfully, output size:', transparentImageUrl.length, 'characters');
          resolve(transparentImageUrl);
        };
        
        img.onerror = (error) => {
          console.error('âŒ [BG REMOVAL] Failed to load image for background removal:', error);
          console.error('âŒ [BG REMOVAL] Image URL that failed:', imageUrl.substring(0, 100) + '...');
          resolve(imageUrl); // Return original on error
        };
        
        console.log('ðŸ”§ [BG REMOVAL] Setting image source...');
        img.src = imageUrl;
      });
    } catch (error) {
      console.error('âŒ [BG REMOVAL] Background removal error:', error);
      return imageUrl; // Return original on error
    }
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
  console.log('ðŸ§ª [TEST] Testing background removal with image:', imageUrl.substring(0, 100) + '...');
  const service = getGeminiTorsoService();
  
  // Access private method for testing
  const result = await (service as any).removeBackground(imageUrl);
  console.log('ðŸ§ª [TEST] Background removal test result:', result ? 'Success' : 'Failed');
  return result;
}
