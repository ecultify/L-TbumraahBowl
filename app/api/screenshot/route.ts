import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
  let browser = null;

  try {
    console.log('🚀 Starting Puppeteer screenshot...');
    
    const body = await request.json();
    const { url, selector = '#composite-card', waitTime = 3000 } = body;
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Launch browser with optimized settings
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-default-apps'
      ],
      timeout: 60000
    });
    
    const page = await browser.newPage();
    
    // Set viewport to match typical desktop
    await page.setViewport({ 
      width: 1200, 
      height: 800,
      deviceScaleFactor: 2 // High DPI for crisp screenshots
    });
    
    // Navigate to the page
    console.log('📄 Navigating to:', url);
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for the composite card element
    console.log('⏳ Waiting for composite card...');
    
    try {
      await page.waitForSelector(selector, { timeout: 15000 });
      console.log('✅ Composite card element found');
    } catch (waitError) {
      console.error('❌ Timeout waiting for selector:', selector);
      throw new Error(`Timeout waiting for element: ${selector}`);
    }
    
    // Wait for fonts to load
    try {
      await page.evaluate(() => {
        return document.fonts ? document.fonts.ready : Promise.resolve();
      });
      console.log('✅ Fonts loaded');
    } catch (fontError) {
      console.warn('⚠️ Font loading failed, continuing anyway');
    }
    
    // Additional wait for dynamic content and animations
    console.log('⏳ Waiting for dynamic content...');
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Get the element
    const element = await page.$(selector);
    if (!element) {
      console.error('❌ Element not found after waiting:', selector);
      throw new Error(`Element ${selector} not found`);
    }
    
    console.log('📸 Taking screenshot of element...');
    
    // Take screenshot of the specific element
    const screenshot = await element.screenshot({
      type: 'png',
      encoding: 'base64'
    });
    
    if (!screenshot) {
      throw new Error('Screenshot data is empty');
    }
    
    console.log('✅ Screenshot captured successfully!');
    
    return NextResponse.json({ 
      success: true, 
      image: `data:image/png;base64,${screenshot}`,
      message: 'Screenshot captured successfully'
    });
    
  } catch (error) {
    console.error('❌ Screenshot error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to capture screenshot',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  } finally {
    // Always close the browser
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
}