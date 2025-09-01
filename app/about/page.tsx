import Link from 'next/link';
import { ArrowLeft, Shield, Cpu, AlertTriangle, Zap } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">About the Speed Meter</h1>
        </div>

        <div className="space-y-8">
          {/* Prototype Nature */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Cpu className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Prototype Technology</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  This is a prototype demonstration of cricket bowling speed analysis using computer vision. 
                  The system uses heuristic motion detection to classify bowling actions into three categories: 
                  Slow, Fast, and Zooooom.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  We offer two analysis modes: a fast mock analyzer using frame differencing, and an 
                  AI-powered pose detection system using TensorFlow.js and MoveNet for more sophisticated 
                  body movement tracking.
                </p>
                <p className="text-gray-600 leading-relaxed mt-4">
                  <strong>Benchmark Video:</strong> We've included a real cricket bowling video as a 
                  benchmark sample. This allows you to immediately test both analysis modes and see 
                  how the system performs with actual bowling footage.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4 text-green-800">Complete Privacy</h2>
                <p className="text-green-700 leading-relaxed mb-4">
                  All video analysis happens entirely on your device. No video data is ever uploaded 
                  to our servers or shared with third parties. Your bowling footage stays 100% private.
                </p>
                <p className="text-green-700 leading-relaxed">
                  The app works offline after initial load, making it perfect for practicing in 
                  locations with limited internet connectivity.
                </p>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">How Analysis Works</h2>
            
            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-6">
                <h3 className="text-lg font-semibold mb-2 text-blue-800">Mock Analyzer</h3>
                <p className="text-gray-600">
                  Samples video frames at 12 FPS, converts to grayscale, and calculates motion 
                  intensity using frame differencing. Fast and reliable for quick feedback.
                </p>
              </div>
              
              <div className="border-l-4 border-purple-500 pl-6">
                <h3 className="text-lg font-semibold mb-2 text-purple-800">Pose AI Analyzer</h3>
                <p className="text-gray-600">
                  Uses TensorFlow.js and Google's MoveNet model to track body keypoints and 
                  calculate velocity of key bowling joints (shoulders, elbows, wrists) for 
                  more sophisticated motion analysis.
                </p>
              </div>
            </div>
          </div>

          {/* Limitations */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4 text-amber-800">Known Limitations</h2>
                <ul className="space-y-2 text-amber-700">
                  <li>• Results are relative intensity estimates, not actual km/h speeds</li>
                  <li>• Best results with good lighting and clear view of the bowler</li>
                  <li>• Video quality and angle significantly affect accuracy</li>
                  <li>• AI pose detection requires modern browser and sufficient device performance</li>
                  <li>• Analysis limited to 20-second video clips for performance</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Roadmap */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Future Enhancements</h2>
                <ul className="space-y-2 text-gray-600">
                  <li>• Actual speed estimation in km/h using biomechanical models</li>
                  <li>• Release point detection and analysis</li>
                  <li>• Bowling action comparison with professional players</li>
                  <li>• Detailed technique feedback and improvement suggestions</li>
                  <li>• Multi-angle analysis support</li>
                  <li>• Historical progress tracking and analytics</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}