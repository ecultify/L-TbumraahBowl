import Link from 'next/link';
import { Camera, Upload, Activity } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="flex items-center justify-between max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Cricket Bowling Speed Meter
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Developed by</span>
          <img 
            src="https://ecultify.com/wp-content/uploads/2022/09/logo-ecultify.png.webp" 
            alt="Ecultify" 
            className="h-8 w-auto"
          />
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Activity className="w-12 h-12 text-blue-600" />
            <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              AI-Powered Bowling Analysis
            </h2>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Analyze your bowling action with AI-powered motion detection. 
            Record or upload your delivery and see if you're bowling slow, fast, or absolutely zooming!
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-20">
          <Link 
            href="/analyze" 
            className="group bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center gap-3 justify-center"
          >
            <Camera className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
            Record with Camera
          </Link>
          <Link 
            href="/analyze?tab=upload" 
            className="group bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center gap-3 justify-center"
          >
            <Upload className="w-6 h-6 group-hover:-translate-y-1 transition-transform duration-300" />
            Upload a Video
          </Link>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-3xl p-8 shadow-xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Record or Upload</h3>
              <p className="text-gray-600">
                Capture your bowling action live or upload an existing video (max 20 seconds)
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">AI Analysis</h3>
              <p className="text-gray-600">
                Our AI analyzes motion patterns and body movements to estimate bowling intensity
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl font-bold text-orange-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Speed Meter</h3>
              <p className="text-gray-600">
                See your result on our animated speed meter: Slow, Fast, or Zooooom!
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-12 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              All analysis runs on your device. Nothing is uploaded.
            </div>
            <Link 
              href="/analyze?tab=upload"
              className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium hover:bg-purple-200 transition-colors"
            >
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Try our benchmark video
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}