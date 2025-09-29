import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = 'AIzaSyBRyKCamJ5jwSbzGS_lHt1hz6xVuaMbPa8';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, referenceImage } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('Sending request to Gemini 2.5 Flash Image Preview API...');

    // Prepare request body for Gemini 2.5 Flash Image Preview (same format as your working curl)
    const requestBody: any = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseModalities: ["IMAGE"]
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

    // Add reference image if provided
    if (referenceImage) {
      requestBody.contents[0].parts.push({
        inline_data: {
          mime_type: referenceImage.mime_type,
          data: referenceImage.data
        }
      });
    }

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Gemini API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      
        // Provide specific guidance for common errors
        if (response.status === 503) {
          return NextResponse.json(
            { error: 'Gemini 2.5 Flash Image Preview is currently unavailable (503). The service may be experiencing issues.' },
            { status: 503 }
          );
        } else if (response.status === 400) {
          return NextResponse.json(
            { error: 'Invalid request (400). Please check the request format.' },
            { status: 400 }
          );
        } else if (response.status === 403) {
          return NextResponse.json(
            { error: 'Access denied (403). You may need special access to the Gemini 2.5 Flash Image Preview model.' },
            { status: 403 }
          );
        } else {
          return NextResponse.json(
            { error: `Gemini API error: ${response.status} - ${errorText}` },
            { status: response.status }
          );
        }
    }

    const responseData = await response.json();
    console.log('Gemini API response received');
    console.log('Full response structure:', JSON.stringify(responseData, null, 2));

    // Check if the response contains generated content (Gemini format)
    if (responseData.candidates && responseData.candidates.length > 0) {
      const candidate = responseData.candidates[0];
      console.log('Candidate structure:', JSON.stringify(candidate, null, 2));
      
      // Check for inline data (image response) - Multiple possible locations
      if (candidate.content && candidate.content.parts) {
        console.log('Found content parts:', candidate.content.parts.length);
        for (const part of candidate.content.parts) {
          console.log('Part structure:', JSON.stringify(part, null, 2));
          
          // Check for inline_data in part
          if (part.inline_data && part.inline_data.data) {
            const generatedImageBase64 = part.inline_data.data;
            const generatedMimeType = part.inline_data.mime_type || 'image/png';
            
            const imageUrl = `data:${generatedMimeType};base64,${generatedImageBase64}`;
            
            console.log('Gemini 2.5 Flash Image Preview torso generation completed successfully');
            return NextResponse.json({
              success: true,
              imageUrl
            });
          }
          
          // Check for inlineData (alternative format)
          if (part.inlineData && part.inlineData.data) {
            const generatedImageBase64 = part.inlineData.data;
            const generatedMimeType = part.inlineData.mimeType || 'image/png';
            
            const imageUrl = `data:${generatedMimeType};base64,${generatedImageBase64}`;
            
            console.log('Gemini 2.5 Flash Image Preview torso generation completed successfully (inlineData format)');
            return NextResponse.json({
              success: true,
              imageUrl
            });
          }
          
          // Check for image field directly
          if (part.image && part.image.data) {
            const generatedImageBase64 = part.image.data;
            const generatedMimeType = part.image.mime_type || part.image.mimeType || 'image/png';
            
            const imageUrl = `data:${generatedMimeType};base64,${generatedImageBase64}`;
            
            console.log('Gemini 2.5 Flash Image Preview torso generation completed successfully (image format)');
            return NextResponse.json({
              success: true,
              imageUrl
            });
          }
          
          // Check for executionResult or any other nested structures
          if (part.executionResult && part.executionResult.outcome && part.executionResult.outcome.includes('image')) {
            console.log('Found executionResult with image outcome:', part.executionResult);
          }
        }
      }
      
      // Check for text response (fallback)
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const textContent = candidate.content.parts[0].text;
        
        if (textContent) {
          console.log('Gemini generated text response:', textContent.substring(0, 200) + '...');
          
          return NextResponse.json({
            success: false,
            error: `Gemini 2.5 Flash Image Preview returned text instead of image. Response: "${textContent.substring(0, 150)}..." - The model may have interpreted this as a text generation request instead of image generation.`
          }, { status: 400 });
        }
      }
    }

    // If we reach here, the response format was unexpected
    console.error('Unexpected Gemini API response format:', responseData);
    
    return NextResponse.json({
      success: false,
      error: 'Unexpected response format from Gemini API'
    }, { status: 500 });

  } catch (error) {
    console.error('Imagen torso generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
