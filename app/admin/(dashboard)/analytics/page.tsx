'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, AlertTriangle, FileImage, Video, MessageSquare } from 'lucide-react';

// Simple Progress component (replaces Radix UI Progress to avoid build issues)
const SimpleProgress = ({ value = 0, className = '' }: { value: number; className?: string }) => (
  <div className={`relative h-10 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}>
    <div
      className="h-full transition-all duration-500 ease-out"
      style={{
        width: `${Math.min(100, Math.max(0, value))}%`,
        background: value >= 75 ? 'linear-gradient(to right, #22c55e, #16a34a)' : 
                   value >= 50 ? 'linear-gradient(to right, #f97316, #ea580c)' :
                   value >= 25 ? 'linear-gradient(to right, #a855f7, #9333ea)' :
                   'linear-gradient(to right, #3b82f6, #2563eb)'
      }}
    />
  </div>
);

interface Analytics {
  totalAttempts: number;
  completionFunnel: {
    started: number;
    withCompositeCard: number;
    withVideo: number;
    withWhatsApp: number;
    completionRate: number;
  };
  dropoffAnalysis: {
    noCompositeCard: number;
    noVideo: number;
    noWhatsApp: number;
  };
}

/**
 * 📈 ADMIN ANALYTICS PAGE
 * 
 * Detailed funnel visualization and dropoff analysis
 */
export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = window.sessionStorage.getItem('adminToken') || 'bumrah-admin-2025';
      
      const response = await fetch('/api/admin/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#FFCB17]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>Analytics</h1>
        <p className="text-[#FFCB17] mt-1" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>Conversion funnel and user journey analysis</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Conversion Funnel */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Conversion Funnel
          </CardTitle>
          <CardDescription>User journey from start to completion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Stage 1: Started */}
            <div>
              <div className="flex justify-between mb-3">
                <div>
                  <span className="text-lg font-semibold">1. Started Analysis</span>
                  <p className="text-sm text-muted-foreground">Users who began the bowling analysis</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-blue-600">{analytics?.completionFunnel.started || 0}</span>
                  <p className="text-sm text-muted-foreground">100%</p>
                </div>
              </div>
              <SimpleProgress value={100} className="bg-blue-100" />
              <div className="mt-2 text-xs text-muted-foreground">
                Baseline: All users who uploaded a video
              </div>
            </div>

            {/* Stage 2: Composite Card */}
            <div>
              <div className="flex justify-between mb-3">
                <div>
                  <span className="text-lg font-semibold">2. Composite Card Generated</span>
                  <p className="text-sm text-muted-foreground">Analysis card with metrics created</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-purple-600">{analytics?.completionFunnel.withCompositeCard || 0}</span>
                  <p className="text-sm text-muted-foreground">
                    {analytics?.totalAttempts ? Math.round((analytics.completionFunnel.withCompositeCard / analytics.totalAttempts) * 100) : 0}%
                  </p>
                </div>
              </div>
              <SimpleProgress 
                value={analytics?.totalAttempts ? (analytics.completionFunnel.withCompositeCard / analytics.totalAttempts) * 100 : 0} 
                className="bg-purple-100" 
              />
              <div className="mt-2 text-xs text-red-600 font-medium">
                Dropoff: {analytics?.dropoffAnalysis.noCompositeCard || 0} users
              </div>
            </div>

            {/* Stage 3: Video */}
            <div>
              <div className="flex justify-between mb-3">
                <div>
                  <span className="text-lg font-semibold">3. Video Generated</span>
                  <p className="text-sm text-muted-foreground">Analysis video rendered successfully</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-orange-600">{analytics?.completionFunnel.withVideo || 0}</span>
                  <p className="text-sm text-muted-foreground">
                    {analytics?.totalAttempts ? Math.round((analytics.completionFunnel.withVideo / analytics.totalAttempts) * 100) : 0}%
                  </p>
                </div>
              </div>
              <SimpleProgress 
                value={analytics?.totalAttempts ? (analytics.completionFunnel.withVideo / analytics.totalAttempts) * 100 : 0} 
                className="bg-orange-100" 
              />
              <div className="mt-2 text-xs text-red-600 font-medium">
                Dropoff: {analytics?.dropoffAnalysis.noVideo || 0} users
              </div>
            </div>

            {/* Stage 4: WhatsApp (Complete) */}
            <div>
              <div className="flex justify-between mb-3">
                <div>
                  <span className="text-lg font-semibold">4. WhatsApp Sent (Complete)</span>
                  <p className="text-sm text-muted-foreground">Message delivered to user</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-green-600">{analytics?.completionFunnel.withWhatsApp || 0}</span>
                  <p className="text-sm text-muted-foreground">
                    {analytics?.completionFunnel.completionRate || 0}%
                  </p>
                </div>
              </div>
              <SimpleProgress 
                value={analytics?.completionFunnel.completionRate || 0} 
                className="bg-green-100" 
              />
              <div className="mt-2 text-xs text-red-600 font-medium">
                Dropoff: {analytics?.dropoffAnalysis.noWhatsApp || 0} users
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dropoff Analysis */}
      <Card className="border-red-200 hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertTriangle className="h-5 w-5" />
            Dropoff Analysis
          </CardTitle>
          <CardDescription>Where users are leaving the funnel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Dropoff 1 */}
            <div className="p-6 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-4">
                <FileImage className="h-8 w-8 text-red-600/50" />
                <span className="text-3xl font-bold text-red-600">{analytics?.dropoffAnalysis.noCompositeCard || 0}</span>
              </div>
              <h3 className="font-semibold text-red-900 mb-2">Before Composite Card</h3>
              <p className="text-sm text-muted-foreground">
                Users who started but didn't get a composite card generated
              </p>
              <div className="mt-4 text-xs font-medium text-red-700">
                {analytics?.totalAttempts 
                  ? `${Math.round((analytics.dropoffAnalysis.noCompositeCard / analytics.totalAttempts) * 100)}% dropoff rate`
                  : '0% dropoff rate'
                }
              </div>
            </div>

            {/* Dropoff 2 */}
            <div className="p-6 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-4">
                <Video className="h-8 w-8 text-red-600/50" />
                <span className="text-3xl font-bold text-red-600">{analytics?.dropoffAnalysis.noVideo || 0}</span>
              </div>
              <h3 className="font-semibold text-red-900 mb-2">Before Video</h3>
              <p className="text-sm text-muted-foreground">
                Users with composite card but no video generated
              </p>
              <div className="mt-4 text-xs font-medium text-red-700">
                {analytics?.completionFunnel.withCompositeCard 
                  ? `${Math.round((analytics.dropoffAnalysis.noVideo / analytics.completionFunnel.withCompositeCard) * 100)}% dropoff rate`
                  : '0% dropoff rate'
                }
              </div>
            </div>

            {/* Dropoff 3 */}
            <div className="p-6 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-4">
                <MessageSquare className="h-8 w-8 text-red-600/50" />
                <span className="text-3xl font-bold text-red-600">{analytics?.dropoffAnalysis.noWhatsApp || 0}</span>
              </div>
              <h3 className="font-semibold text-red-900 mb-2">Before WhatsApp</h3>
              <p className="text-sm text-muted-foreground">
                Users with video but WhatsApp message not sent
              </p>
              <div className="mt-4 text-xs font-medium text-red-700">
                {analytics?.completionFunnel.withVideo 
                  ? `${Math.round((analytics.dropoffAnalysis.noWhatsApp / analytics.completionFunnel.withVideo) * 100)}% dropoff rate`
                  : '0% dropoff rate'
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retention Metrics */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stage Retention Rates
          </CardTitle>
          <CardDescription>How well each stage retains users from the previous stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div>
                <p className="font-semibold">Started → Composite Card</p>
                <p className="text-sm text-muted-foreground">Users who got composite card after starting</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-600">
                  {analytics?.totalAttempts 
                    ? Math.round((analytics.completionFunnel.withCompositeCard / analytics.totalAttempts) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">retention</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <div>
                <p className="font-semibold">Composite Card → Video</p>
                <p className="text-sm text-muted-foreground">Users who got video after composite card</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-600">
                  {analytics?.completionFunnel.withCompositeCard 
                    ? Math.round((analytics.completionFunnel.withVideo / analytics.completionFunnel.withCompositeCard) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">retention</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="font-semibold">Video → WhatsApp</p>
                <p className="text-sm text-muted-foreground">Users who got WhatsApp after video</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  {analytics?.completionFunnel.withVideo 
                    ? Math.round((analytics.completionFunnel.withWhatsApp / analytics.completionFunnel.withVideo) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">retention</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

