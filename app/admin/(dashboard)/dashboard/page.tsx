'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, Users, FileImage, Video, MessageSquare, TrendingUp, CheckCircle2, Film, ArrowRight } from 'lucide-react';

interface Analytics {
  totalAttempts: number;
  uniqueUsers: number;
  compositeCardsGenerated: number;
  videosGenerated: number;
  whatsappMessagesSent: number;
  completionFunnel: {
    started: number;
    withCompositeCard: number;
    withVideo: number;
    withWhatsApp: number;
    completionRate: number;
  };
  recentActivity: {
    last7Days: number;
    withCompositeCard: number;
    withVideo: number;
    withWhatsApp: number;
  };
  averageSimilarity: number;
}

/**
 * 📊 ADMIN OVERVIEW PAGE
 * 
 * Main dashboard with key metrics and recent activity
 */
export default function AdminOverviewPage() {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#FFCB17]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>Overview</h1>
        <p className="text-[#FFCB17] mt-1" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>Key metrics and performance summary</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Target className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{analytics?.totalAttempts || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              All bowling attempts
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{analytics?.uniqueUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Unique phone numbers
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Composite Cards</CardTitle>
            <FileImage className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{analytics?.compositeCardsGenerated || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Generated successfully
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Videos Generated</CardTitle>
            <Video className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{analytics?.videosGenerated || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Rendered and uploaded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>WhatsApp Messages</CardTitle>
            <CardDescription>Messages sent to users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold mb-4 text-green-600">
              {analytics?.whatsappMessagesSent || 0}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total messages delivered</span>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between text-sm font-medium">
                  <span>Last 7 days:</span>
                  <span className="text-blue-600">{analytics?.recentActivity.withWhatsApp || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>User journey completion stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Funnel Steps */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Started */}
                <div className="funnel-step bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-all">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-3">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {analytics?.completionFunnel.started || 0}
                    </div>
                    <div className="text-sm font-medium text-blue-700 mb-1">Started</div>
                    <div className="text-lg font-semibold text-blue-800">100%</div>
                  </div>
                </div>

                {/* Composite Card */}
                <div className="funnel-step bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-all">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mb-3">
                      <FileImage className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      {analytics?.completionFunnel.withCompositeCard || 0}
                    </div>
                    <div className="text-sm font-medium text-purple-700 mb-1">Card Created</div>
                    <div className="text-lg font-semibold text-purple-800">
                      {analytics?.completionFunnel.started ? Math.round(analytics.completionFunnel.withCompositeCard / analytics.completionFunnel.started * 100) : 0}%
                    </div>
                  </div>
                </div>

                {/* Video */}
                <div className="funnel-step bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border-2 border-orange-200 hover:border-orange-400 transition-all">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-3">
                      <Video className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-orange-600 mb-1">
                      {analytics?.completionFunnel.withVideo || 0}
                    </div>
                    <div className="text-sm font-medium text-orange-700 mb-1">Video Made</div>
                    <div className="text-lg font-semibold text-orange-800">
                      {analytics?.completionFunnel.started ? Math.round(analytics.completionFunnel.withVideo / analytics.completionFunnel.started * 100) : 0}%
                    </div>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="funnel-step bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-200 hover:border-green-400 transition-all">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-3">
                      <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {analytics?.completionFunnel.withWhatsApp || 0}
                    </div>
                    <div className="text-sm font-medium text-green-700 mb-1">Sent</div>
                    <div className="text-lg font-semibold text-green-800">
                      {analytics?.completionFunnel.started ? Math.round(analytics.completionFunnel.withWhatsApp / analytics.completionFunnel.started * 100) : 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Overall Completion */}
              <div className="mt-6 pt-6 border-t bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <span className="text-base font-semibold text-gray-700">Overall Completion Rate</span>
                  </div>
                  <span className="text-3xl font-bold text-green-600">{analytics?.completionFunnel.completionRate || 0}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Recent Activity (Last 7 Days)</CardTitle>
          <CardDescription>User engagement in the past week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {analytics?.recentActivity.last7Days || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total Attempts</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">
                {analytics?.recentActivity.withCompositeCard || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Composite Cards</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">
                {analytics?.recentActivity.withVideo || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Videos</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {analytics?.recentActivity.withWhatsApp || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">WhatsApp Sent</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Average Similarity</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{analytics?.averageSimilarity || 0}%</p>
              </div>
              <Target className="h-8 w-8 text-blue-600/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-900">Success Rate</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {analytics?.compositeCardsGenerated && analytics?.totalAttempts
                    ? Math.round((analytics.compositeCardsGenerated / analytics.totalAttempts) * 100)
                    : 0}%
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-900">Video Rate</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {analytics?.videosGenerated && analytics?.totalAttempts
                    ? Math.round((analytics.videosGenerated / analytics.totalAttempts) * 100)
                    : 0}%
                </p>
              </div>
              <Film className="h-8 w-8 text-purple-600/50" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

