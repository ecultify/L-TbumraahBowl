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
- Ensure shoulders and head are fully visible without being cropped on any side`;
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
        console.log('Applying background removal for full transparency...');
        const transparentImageUrl = await this.removeBackground(responseData.imageUrl);
        
        // Resize to 300x300 if not already
        console.log('Resizing image to 300x300...');
        const resizedImageUrl = await this.resizeImage(transparentImageUrl || responseData.imageUrl, 300, 300);
        
        return {
          success: true,
          imageUrl: resizedImageUrl
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
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('Canvas context not available');
            resolve(imageUrl); // Return original on error
            return;
          }
          
          // Set exact dimensions
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          
          // Draw image with high quality scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          
          // Convert to data URL
          const resizedImageUrl = canvas.toDataURL('image/png');
          console.log(`✅ Image resized to ${targetWidth}x${targetHeight}`);
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

  // Remove background from image to make it fully transparent
  private async removeBackground(imageUrl: string): Promise<string> {
    try {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('Canvas context not available');
            resolve(imageUrl); // Return original on error
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw image
          ctx.drawImage(img, 0, 0);
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Remove semi-transparent backgrounds
          // Make any pixel with low alpha or grayish colors fully transparent
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // Check if pixel is semi-transparent (alpha < 255)
            // or if it's a grayish/whitish background color
            const isGrayish = Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30;
            const isLight = (r + g + b) / 3 > 200;
            const isSemiTransparent = a < 255;
            
            // Make background fully transparent
            if (isSemiTransparent || (isGrayish && isLight)) {
              data[i + 3] = 0; // Set alpha to 0 (fully transparent)
            }
          }
          
          // Put the modified image data back
          ctx.putImageData(imageData, 0, 0);
          
          // Convert to data URL
          const transparentImageUrl = canvas.toDataURL('image/png');
          console.log('✅ Background removed successfully');
          resolve(transparentImageUrl);
        };
        
        img.onerror = (error) => {
          console.error('Failed to load image for background removal:', error);
          resolve(imageUrl); // Return original on error
        };
        
        img.src = imageUrl;
      });
    } catch (error) {
      console.error('Background removal error:', error);
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
      
      // Set canvas size for chest-level portrait
      canvas.width = 400;
      canvas.height = 500;
      
      // Fill with a gradient background (blue jersey color)
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#1e3a8a'); // Dark blue
      gradient.addColorStop(1, '#3b82f6'); // Lighter blue
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw jersey collar
      ctx.fillStyle = '#f97316'; // Orange trim
      ctx.fillRect(50, 80, canvas.width - 100, 10);
      
      // Add "INDIA" text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('INDIA', canvas.width / 2, 120);
      
      // Draw arm shapes (folded across chest)
      ctx.fillStyle = '#1e3a8a';
      
      // Left arm
      ctx.beginPath();
      ctx.ellipse(100, 200, 40, 80, Math.PI / 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Right arm
      ctx.beginPath();
      ctx.ellipse(300, 200, 40, 80, -Math.PI / 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add the face/head image
      if (request.croppedHeadImage) {
        const headImg = new Image();
        await new Promise((resolve, reject) => {
          headImg.onload = resolve;
          headImg.onerror = reject;
          headImg.src = request.croppedHeadImage;
        });
        
        // Calculate head position and size
        const headWidth = 140;
        const headHeight = 140;
        const headX = (canvas.width - headWidth) / 2;
        const headY = 10;
        
        // Draw the head
        ctx.drawImage(headImg, headX, headY, headWidth, headHeight);
      }
      
      // Convert canvas to base64
      const compositeImageUrl = canvas.toDataURL('image/png', 0.9);
      
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