'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, TrendingUp, Users, RotateCcw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://hqzukyxnnjnstrecybzx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxenVreXhubmpuc3RyZWN5Ynp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTM4OTIsImV4cCI6MjA3MzA2OTg5Mn0.-FaJuxBuwxk5L-WCYKv--Vmq0g_aPBjGOTBKgwTrcOI';
const supabase = createClient(supabaseUrl, supabaseKey);

interface RetryStats {
  phone_number: string;
  display_name: string;
  retry_count: number;
  total_attempts: number;
  last_attempt: string;
  best_similarity: number | null;
}

/**
 * 🔄 ADMIN RETRIES PAGE
 * 
 * Shows retry statistics - how many times users have retried
 */
export default function AdminRetriesPage() {
  const [retryStats, setRetryStats] = useState<RetryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRetryStats();
  }, []);

  const fetchRetryStats = async () => {
    try {
      setLoading(true);
      setError('');

      // Get all attempts grouped by phone number
      const { data, error: fetchError } = await supabase
        .from('bowling_attempts')
        .select('phone_number, display_name, retry_count, similarity_percent, created_at')
        .not('phone_number', 'is', null)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching retry stats:', fetchError);
        throw new Error('Failed to load retry statistics');
      }

      // Group by phone number and calculate stats
      const phoneGroups = new Map<string, {
        phone_number: string;
        display_name: string;
        attempts: Array<{
          retry_count: number;
          similarity_percent: number | null;
          created_at: string;
        }>;
      }>();

      data?.forEach((attempt) => {
        const phone = attempt.phone_number;
        if (!phoneGroups.has(phone)) {
          phoneGroups.set(phone, {
            phone_number: phone,
            display_name: attempt.display_name || 'Unknown',
            attempts: []
          });
        }
        phoneGroups.get(phone)?.attempts.push({
          retry_count: attempt.retry_count || 0,
          similarity_percent: attempt.similarity_percent,
          created_at: attempt.created_at
        });
      });

      // Calculate statistics for each phone number
      const stats: RetryStats[] = Array.from(phoneGroups.values()).map((group) => {
        const sortedAttempts = group.attempts.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        const latestAttempt = sortedAttempts[0];
        const bestSimilarity = Math.max(...group.attempts.map(a => a.similarity_percent || 0));

        return {
          phone_number: group.phone_number,
          display_name: group.display_name,
          retry_count: latestAttempt.retry_count,
          total_attempts: group.attempts.length,
          last_attempt: latestAttempt.created_at,
          best_similarity: bestSimilarity > 0 ? bestSimilarity : null
        };
      });

      // Sort by retry count (highest first)
      stats.sort((a, b) => b.retry_count - a.retry_count);

      setRetryStats(stats);
    } catch (err: any) {
      console.error('Error in fetchRetryStats:', err);
      setError(err.message || 'Failed to load retry statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filterStats = (stats: RetryStats[]) => {
    if (!searchTerm) return stats;
    return stats.filter(stat => 
      stat.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stat.phone_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Calculate summary stats
  const totalUsers = retryStats.length;
  const usersWithRetries = retryStats.filter(s => s.retry_count > 0).length;
  const totalRetries = retryStats.reduce((sum, s) => sum + s.retry_count, 0);
  const avgRetriesPerUser = totalUsers > 0 ? (totalRetries / totalUsers).toFixed(2) : '0';

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#FFCB17]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            Retry Statistics
          </h1>
          <p className="text-[#FFCB17] mt-1" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
            Track how many times users have retried their bowling attempts
          </p>
        </div>
        <Button onClick={fetchRetryStats} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Users className="h-10 w-10 text-blue-600" />
              <div>
                <div className="text-3xl font-bold">{totalUsers}</div>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <RotateCcw className="h-10 w-10 text-orange-600" />
              <div>
                <div className="text-3xl font-bold">{usersWithRetries}</div>
                <p className="text-sm text-muted-foreground">Users with Retries</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <RefreshCw className="h-10 w-10 text-purple-600" />
              <div>
                <div className="text-3xl font-bold">{totalRetries}</div>
                <p className="text-sm text-muted-foreground">Total Retries</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-10 w-10 text-green-600" />
              <div>
                <div className="text-3xl font-bold">{avgRetriesPerUser}</div>
                <p className="text-sm text-muted-foreground">Avg Retries/User</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Retry Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Retry Details by Phone Number</CardTitle>
          <CardDescription>
            Shows how many times each phone number has retried the bowling analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filterStats(retryStats).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm ? 'No results found' : 'No retry data available'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Player Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Retry Count</TableHead>
                    <TableHead>Total Attempts</TableHead>
                    <TableHead>Best Similarity</TableHead>
                    <TableHead>Last Attempt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterStats(retryStats).map((stat, index) => (
                    <TableRow key={stat.phone_number} className={stat.retry_count > 0 ? 'bg-yellow-50' : ''}>
                      <TableCell className="font-medium">
                        {stat.display_name || 'N/A'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {stat.phone_number}
                      </TableCell>
                      <TableCell>
                        {stat.retry_count > 0 ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <RotateCcw className="h-3 w-3" />
                            {stat.retry_count}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">0</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{stat.total_attempts}</Badge>
                      </TableCell>
                      <TableCell>
                        {stat.best_similarity ? (
                          <Badge 
                            variant="secondary"
                            className={
                              stat.best_similarity >= 85 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {stat.best_similarity.toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(stat.last_attempt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

