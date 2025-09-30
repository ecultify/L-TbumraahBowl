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
  return `GENERATE A PNG IMAGE WITH COMPLETELY TRANSPARENT BACKGROUND (ALPHA CHANNEL): Create a professional chest-level portrait of an Indian cricket player using the EXACT face from the provided image without any modifications. The person should be wearing an official Indian cricket team blue jersey with "INDIA" text only.

CRITICAL - TRANSPARENT BACKGROUND:
- MUST OUTPUT: PNG format with full alpha channel transparency
- BACKGROUND: 100% transparent - NO color, NO white, NO gray, NO background of ANY kind
- The background must be completely see-through (transparent pixels only)
- Only the person should be visible - everything else must be transparent

CRITICAL - COMPOSITION:
- CROP AT CHEST: Cut off the image at mid-chest level (collarbone to upper chest area only)
- NO HANDS, NO ARMS, NO SHOULDERS visible in the final output
- Show ONLY head, neck, and upper chest area with jersey
- Use input face EXACTLY as provided with ZERO alterations
- Maintain exact facial features and skin tone from input

STYLING:
- Indian cricket team jersey: primary blue with orange accents
- Only "INDIA" text - NO other logos or sponsors
- Simple upright posture, centered composition
- Gender-appropriate body proportions
- High resolution photorealistic quality
- Clean edges with alpha transparency cutout

MANDATORY OUTPUT SPECIFICATIONS:
- Format: PNG with transparency (not JPEG)
- Background: Fully transparent alpha channel
- Person cutout: Clean edges, no halo, no artifacts
- Crop level: Mid-chest (no hands/arms/shoulders)`;
}

// Enhanced negative prompt
function createNegativePrompt(): string {
  return `altered_face, modified_facial_features, enhanced_face, different_expression, changed_face_angle, face_beautification, face_smoothing, different_skin_tone_on_face, mismatched_face, AI_enhanced_face, face_style_transfer, modified_eyes, altered_nose, changed_mouth, different_eyebrows, face_retouching, harsh_blend_lines, inconsistent_lighting, disproportionate_head_to_body_ratio, wrong_gender_body_type, overly_muscular, too_skinny, awkward_pose, bad_jersey_fit, visible_editing_artifacts, sponsor_logos, brand_logos, commercial_logos, text_other_than_india, advertisements, full_body_shot, waist_visible, legs_visible, below_chest_content, hands_visible, arms_visible, shoulders_visible, folded_arms, crossed_arms, hands_in_frame, elbows_visible, forearms_visible, wrists_visible, fingers_visible, background_color, colored_background, solid_background, gradient_background, studio_background, wall_background, opaque_background, white_background, gray_background, blue_background`;
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
        return {
          success: true,
          imageUrl: responseData.imageUrl
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