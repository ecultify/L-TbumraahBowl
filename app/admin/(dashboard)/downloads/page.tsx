'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileImage, Video, Search, ExternalLink, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://hqzukyxnnjnstrecybzx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxenVreXhubmpuc3RyZWN5Ynp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTM4OTIsImV4cCI6MjA3MzA2OTg5Mn0.-FaJuxBuwxk5L-WCYKv--Vmq0g_aPBjGOTBKgwTrcOI';
const supabase = createClient(supabaseUrl, supabaseKey);

interface BowlingAttempt {
  id: string;
  display_name: string;
  phone_number: string;
  composite_card_url: string | null;
  video_url: string | null;
  similarity_percent: number | null;
  created_at: string;
}

/**
 * 📥 ADMIN DOWNLOADS PAGE
 * 
 * View and download files from bowling_attempts table
 */
export default function AdminDownloadsPage() {
  const [compositeCards, setCompositeCards] = useState<BowlingAttempt[]>([]);
  const [videos, setVideos] = useState<BowlingAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all bowling attempts with composite cards
      const { data: cardsData, error: cardsError } = await supabase
        .from('bowling_attempts')
        .select('id, display_name, phone_number, composite_card_url, video_url, similarity_percent, created_at')
        .not('composite_card_url', 'is', null)
        .order('created_at', { ascending: false });

      if (cardsError) {
        console.error('Error fetching composite cards:', cardsError);
        throw new Error('Failed to load composite cards');
      }

      // Fetch all bowling attempts with videos
      const { data: videosData, error: videosError } = await supabase
        .from('bowling_attempts')
        .select('id, display_name, phone_number, composite_card_url, video_url, similarity_percent, created_at')
        .not('video_url', 'is', null)
        .order('created_at', { ascending: false });

      if (videosError) {
        console.error('Error fetching videos:', videosError);
        throw new Error('Failed to load videos');
      }

      setCompositeCards(cardsData || []);
      setVideos(videosData || []);
    } catch (err: any) {
      console.error('Error in fetchFiles:', err);
      setError(err.message || 'Failed to load files');
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

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      setDownloading(fileUrl);
      
      // Download file from URL
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download file');
    } finally {
      setDownloading(null);
    }
  };

  const viewFile = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  const filterAttempts = (attempts: BowlingAttempt[]) => {
    if (!searchTerm) return attempts;
    return attempts.filter(attempt => 
      attempt.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attempt.phone_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getFileName = (url: string | null, type: 'card' | 'video'): string => {
    if (!url) return '';
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1] || `${type}-${Date.now()}`;
  };

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
      <div>
        <h1 className="text-3xl font-bold text-[#FFCB17]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>Downloads</h1>
        <p className="text-[#FFCB17] mt-1" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>View and download files from storage buckets</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <FileImage className="h-10 w-10 text-purple-600" />
              <div>
                <div className="text-3xl font-bold">{compositeCards.length}</div>
                <p className="text-sm text-muted-foreground">Composite Cards</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Video className="h-10 w-10 text-blue-600" />
              <div>
                <div className="text-3xl font-bold">{videos.length}</div>
                <p className="text-sm text-muted-foreground">Rendered Videos</p>
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
              placeholder="Search files by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different buckets */}
      <Tabs defaultValue="composite-cards" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="composite-cards" className="flex items-center gap-2">
            <FileImage className="h-4 w-4" />
            Composite Cards ({filterAttempts(compositeCards).length})
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Videos ({filterAttempts(videos).length})
          </TabsTrigger>
        </TabsList>

        {/* Composite Cards Tab */}
        <TabsContent value="composite-cards">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Composite Cards</CardTitle>
                  <CardDescription>Bowling analysis report images from database</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filterAttempts(compositeCards).length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No composite cards found</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Player Name</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Similarity</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterAttempts(compositeCards).map((attempt) => (
                        <TableRow key={attempt.id}>
                          <TableCell className="font-medium">
                            {attempt.display_name || 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {attempt.phone_number || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {attempt.similarity_percent ? (
                              <Badge variant="secondary">{attempt.similarity_percent.toFixed(1)}%</Badge>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(attempt.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => attempt.composite_card_url && viewFile(attempt.composite_card_url)}
                                className="flex items-center gap-1"
                                disabled={!attempt.composite_card_url}
                              >
                                <ExternalLink className="h-3 w-3" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => attempt.composite_card_url && downloadFile(
                                  attempt.composite_card_url,
                                  getFileName(attempt.composite_card_url, 'card')
                                )}
                                disabled={downloading === attempt.composite_card_url || !attempt.composite_card_url}
                                className="flex items-center gap-1"
                              >
                                {downloading === attempt.composite_card_url ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Download className="h-3 w-3" />
                                )}
                                Download
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Rendered Videos</CardTitle>
                  <CardDescription>Analysis videos with overlays from database</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filterAttempts(videos).length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No videos found</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Player Name</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Similarity</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterAttempts(videos).map((attempt) => (
                        <TableRow key={attempt.id}>
                          <TableCell className="font-medium">
                            {attempt.display_name || 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {attempt.phone_number || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {attempt.similarity_percent ? (
                              <Badge variant="secondary">{attempt.similarity_percent.toFixed(1)}%</Badge>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(attempt.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => attempt.video_url && viewFile(attempt.video_url)}
                                className="flex items-center gap-1"
                                disabled={!attempt.video_url}
                              >
                                <ExternalLink className="h-3 w-3" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => attempt.video_url && downloadFile(
                                  attempt.video_url,
                                  getFileName(attempt.video_url, 'video')
                                )}
                                disabled={downloading === attempt.video_url || !attempt.video_url}
                                className="flex items-center gap-1"
                              >
                                {downloading === attempt.video_url ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Download className="h-3 w-3" />
                                )}
                                Download
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

