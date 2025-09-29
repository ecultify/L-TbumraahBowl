// Gemini API Service for Torso Generation
'use client';

const GEMINI_API_KEY = 'AIzaSyBRyKCamJ5jwSbzGS_lHt1hz6xVuaMbPa8';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent';

export interface TorsoGenerationRequest {
  croppedHeadImage: string; // base64 data URL
  gender?: 'male' | 'female' | 'auto';
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

// Enhanced prompt for generating Indian cricket jersey torso with chest-level crop
function createTorsoGenerationPrompt(): string {
  return `Generate a professional chest-level portrait of an Indian cricket player using the EXACT face from the provided image without any modifications. The person should be wearing an official Indian cricket team blue jersey with "INDIA" text only (no other logos), arms folded across chest, proper upright posture. Adapt body type and build according to the detected gender. Maintain exact facial features and skin tone from input. Even studio lighting, clean background, photorealistic. Crop the generated image at chest level so the final image shows only from neck to chest.

REQUIREMENTS:
- Use input face EXACTLY as provided with ZERO alterations
- Indian cricket team jersey: primary blue with orange accents  
- Only "INDIA" text - NO other logos or sponsors
- Arms folded across chest pose
- Professional cricket player posture
- Chest-level cropping (neck to chest only)
- Gender-appropriate body proportions
- High resolution photorealistic quality`;
}

// Enhanced negative prompt
function createNegativePrompt(): string {
  return `altered_face, modified_facial_features, enhanced_face, different_expression, changed_face_angle, face_beautification, face_smoothing, different_skin_tone_on_face, mismatched_face, AI_enhanced_face, face_style_transfer, modified_eyes, altered_nose, changed_mouth, different_eyebrows, face_retouching, harsh_blend_lines, inconsistent_lighting, disproportionate_head_to_body_ratio, wrong_gender_body_type, overly_muscular, too_skinny, awkward_pose, bad_jersey_fit, visible_editing_artifacts, sponsor_logos, brand_logos, commercial_logos, text_other_than_india, advertisements, full_body_shot, waist_visible, legs_visible, below_chest_content`;
}

export class GeminiTorsoService {
  private apiKey: string;

  constructor() {
    this.apiKey = GEMINI_API_KEY;
  }

  // Generate torso image with Gemini 2.0 Flash Preview Image Generation
  async generateTorso(request: TorsoGenerationRequest): Promise<TorsoGenerationResult> {
    try {
      console.log('Starting Gemini 2.0 Flash Preview Image Generation...');
      
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

      const prompt = createTorsoGenerationPrompt();
      const negativePrompt = createNegativePrompt();

      // Prepare request body for Gemini 2.0 Flash Preview Image Generation
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `${prompt}

NEGATIVE PROMPT: ${negativePrompt}`
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseModalities: ["TEXT", "IMAGE"]
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      console.log('Sending request to Gemini 2.0 Flash Preview API...');
      
      const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Gemini API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error response:', errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log('Gemini API response received');

      // Check if the response contains generated content
      if (responseData.candidates && responseData.candidates.length > 0) {
        const candidate = responseData.candidates[0];
        
        // Check for inline data (image response)
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inline_data && part.inline_data.data) {
              const generatedImageBase64 = part.inline_data.data;
              const generatedMimeType = part.inline_data.mime_type || 'image/png';
              
              const imageUrl = `data:${generatedMimeType};base64,${generatedImageBase64}`;
              
              console.log('Gemini 2.0 Flash torso generation completed successfully');
              return {
                success: true,
                imageUrl
              };
            }
          }
        }
        
        // Check for text response (fallback)
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const textContent = candidate.content.parts[0].text;
          
          if (textContent) {
            console.log('Gemini generated text response:', textContent.substring(0, 200) + '...');
            
            return {
              success: false,
              error: 'Gemini 2.0 Flash returned text instead of image. Model may not support image generation.'
            };
          }
        }
      }

      // If we reach here, the response format was unexpected
      console.error('Unexpected Gemini API response format:', responseData);
      
      return {
        success: false,
        error: 'Unexpected response format from Gemini API'
      };

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