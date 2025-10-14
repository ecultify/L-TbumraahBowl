'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Target, TrendingUp, Video as VideoIcon } from 'lucide-react';

interface TopPlayer {
  name: string;
  phone: string;
  similarity: number;
  hasVideo: boolean;
  hasCompositeCard: boolean;
  createdAt: string;
}

/**
 * 🏆 ADMIN TOP PLAYERS PAGE
 * 
 * Leaderboard showing best performers by similarity
 */
export default function AdminTopPlayersPage() {
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTopPlayers();
  }, []);

  const fetchTopPlayers = async () => {
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
      setTopPlayers(data.topPlayers || []);
    } catch (err) {
      console.error('Error fetching top players:', err);
      setError('Failed to load top players data');
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

  const getRankDisplay = (rank: number) => {
    return `#${rank}`;
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
        <h1 className="text-3xl font-bold text-[#FFCB17]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>Top Players</h1>
        <p className="text-[#FFCB17] mt-1" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>Best performers ranked by similarity score</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Top 3 Podium */}
      {topPlayers.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 2nd Place */}
          <Card className="bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300">
            <CardHeader className="text-center pb-3">
              <div className="flex justify-center mb-2">
                <Trophy className="h-12 w-12 text-gray-500" />
              </div>
              <CardTitle className="text-xl">{topPlayers[1]?.name}</CardTitle>
              <CardDescription>{topPlayers[1]?.phone}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Badge className="mb-2 bg-gray-500">2nd Place</Badge>
              <div className="text-4xl font-bold text-gray-700 mb-2">
                {topPlayers[1]?.similarity}%
              </div>
              <p className="text-sm text-muted-foreground">Similarity Score</p>
            </CardContent>
          </Card>

          {/* 1st Place */}
          <Card className="bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-400 shadow-lg md:-mt-4">
            <CardHeader className="text-center pb-3">
              <div className="flex justify-center mb-2">
                <Trophy className="h-16 w-16 text-yellow-600" />
              </div>
              <CardTitle className="text-2xl">{topPlayers[0]?.name}</CardTitle>
              <CardDescription>{topPlayers[0]?.phone}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Badge className="mb-2 bg-yellow-600">1st Place</Badge>
              <div className="text-5xl font-bold text-yellow-700 mb-2">
                {topPlayers[0]?.similarity}%
              </div>
              <p className="text-sm text-muted-foreground">Similarity Score</p>
            </CardContent>
          </Card>

          {/* 3rd Place */}
          <Card className="bg-gradient-to-br from-orange-100 to-orange-200 border-orange-300">
            <CardHeader className="text-center pb-3">
              <div className="flex justify-center mb-2">
                <Trophy className="h-12 w-12 text-orange-600" />
              </div>
              <CardTitle className="text-xl">{topPlayers[2]?.name}</CardTitle>
              <CardDescription>{topPlayers[2]?.phone}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Badge className="mb-2 bg-orange-600">3rd Place</Badge>
              <div className="text-4xl font-bold text-orange-700 mb-2">
                {topPlayers[2]?.similarity}%
              </div>
              <p className="text-sm text-muted-foreground">Similarity Score</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Complete Leaderboard
          </CardTitle>
          <CardDescription>Top 10 players by similarity score</CardDescription>
        </CardHeader>
        <CardContent>
          {topPlayers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No players found</p>
              <p className="text-sm text-muted-foreground mt-2">Check back after users complete attempts</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold w-20">Rank</TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">Similarity</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPlayers.map((player, index) => {
                    const rank = index + 1;
                    const isTopThree = rank <= 3;
                    
                    return (
                      <TableRow 
                        key={index} 
                        className={`hover:bg-gray-50 ${isTopThree ? 'bg-yellow-50' : ''}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-semibold ${isTopThree ? 'text-yellow-600' : 'text-gray-600'}`}>
                              {getRankDisplay(rank)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={`font-medium ${isTopThree ? 'font-bold' : ''}`}>
                          {player.name}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {player.phone}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={`font-semibold ${
                              isTopThree ? 'bg-yellow-200 text-yellow-900' : ''
                            }`}
                          >
                            {player.similarity}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {player.hasCompositeCard && (
                              <Badge variant="outline" className="text-xs">
                                Card
                              </Badge>
                            )}
                            {player.hasVideo && (
                              <Badge variant="outline" className="text-xs">
                                Video
                              </Badge>
                            )}
                            {!player.hasCompositeCard && !player.hasVideo && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(player.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Highest Similarity</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {topPlayers[0]?.similarity || 0}%
                </p>
              </div>
              <Target className="h-10 w-10 text-blue-600/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-900">Average Top 10</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {topPlayers.length > 0
                    ? Math.round(topPlayers.reduce((sum, p) => sum + p.similarity, 0) / topPlayers.length)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-600/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-900">With Videos</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {topPlayers.filter(p => p.hasVideo).length}/{topPlayers.length}
                </p>
              </div>
              <VideoIcon className="h-10 w-10 text-purple-600/50" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

