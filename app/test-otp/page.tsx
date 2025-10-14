'use client';

import { useState } from 'react';

export default function TestOtpPage() {
  const [phone, setPhone] = useState('8169921886');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [environment, setEnvironment] = useState<'uat' | 'prod'>('uat');
  const [sendResponse, setSendResponse] = useState<any>(null);
  const [verifyResponse, setVerifyResponse] = useState<any>(null);

  const handleSendOtp = async () => {
    setLoading(true);
    setSendResponse(null);
    
    try {
      const response = await fetch('/api/otp-new/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, template: 'bowl' }),
      });
      
      const data = await response.json();
      setSendResponse({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
      });
    } catch (error: any) {
      setSendResponse({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setVerifyResponse(null);
    
    try {
      const response = await fetch('/api/otp-new/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      
      const data = await response.json();
      setVerifyResponse({
        status: response.status,
        statusText: response.statusText,
        data,
      });
    } catch (error: any) {
      setVerifyResponse({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">OTP Test Page</h1>

        {/* Environment Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setEnvironment('uat')}
              className={`px-6 py-2 rounded-lg font-medium ${
                environment === 'uat'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              UAT (Testing)
            </button>
            <button
              onClick={() => setEnvironment('prod')}
              className={`px-6 py-2 rounded-lg font-medium ${
                environment === 'prod'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              PRODUCTION
            </button>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {environment === 'uat' ? (
              <p>✅ Using UAT endpoint: apiclouduat.ltfs.com</p>
            ) : (
              <p className="text-red-600 font-semibold">⚠️ Using PRODUCTION endpoint: apicloud.ltfs.com</p>
            )}
          </div>
        </div>

        {/* Send OTP Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Send OTP</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="10-digit phone number"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>

            <button
              onClick={async () => {
                setLoading(true);
                const res = await fetch('/api/clear-rate-limit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ phone }),
                });
                const data = await res.json();
                alert(data.message || 'Rate limit cleared');
                setLoading(false);
              }}
              disabled={loading}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Clear Rate Limit
            </button>
          </div>

          {sendResponse && (
            <div className="mt-4 p-4 bg-gray-50 rounded border">
              <h3 className="font-semibold mb-2">Response:</h3>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(sendResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Verify OTP Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Verify OTP</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="6-digit OTP"
            />
          </div>

          <button
            onClick={handleVerifyOtp}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>

          {verifyResponse && (
            <div className="mt-4 p-4 bg-gray-50 rounded border">
              <h3 className="font-semibold mb-2">Response:</h3>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(verifyResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Direct Axiom Test */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Direct Axiom API Test</h2>
          <p className="text-sm text-gray-600 mb-4">
            This will call Axiom directly from the server using the selected environment
          </p>
          
          <button
            onClick={async () => {
              setLoading(true);
              const res = await fetch('/api/test-axiom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, environment }),
              });
              const data = await res.json();
              setSendResponse(data);
              setLoading(false);
            }}
            disabled={loading}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            Test Direct Axiom Call ({environment.toUpperCase()})
          </button>
        </div>
      </div>
    </div>
  );
}

