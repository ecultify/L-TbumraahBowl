'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Download, ExternalLink } from 'lucide-react';

interface BowlingAttempt {
  id: string;
  display_name: string;
  phone_number: string;
  similarity_percent: number;
  composite_card_url: string | null;
  video_url: string | null;
  whatsapp_sent: boolean;
  avatar_url: string | null;
  created_at: string;
}

/**
 * 📋 ADMIN ALL ATTEMPTS PAGE
 * 
 * Complete database table with search and filters
 */
export default function AdminAttemptsPage() {
  const [attempts, setAttempts] = useState<BowlingAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Table controls
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchBowlingAttempts();
  }, [page, filter, search]);

  const fetchBowlingAttempts = async () => {
    try {
      setLoading(true);
      const token = window.sessionStorage.getItem('adminToken') || 'bumrah-admin-2025';
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        filter,
        search
      });

      const response = await fetch(`/api/admin/bowling-attempts?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bowling attempts');
      }

      const data = await response.json();
      setAttempts(data.attempts);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      console.error('Error fetching bowling attempts:', err);
      setError('Failed to load bowling attempts data');
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

  const exportToCSV = () => {
    // Prepare CSV data
    const headers = ['Name', 'Phone', 'Similarity %', 'Composite Card URL', 'Video URL', 'WhatsApp Sent', 'Created At'];
    const rows = attempts.map(attempt => [
      attempt.display_name || 'Anonymous',
      attempt.phone_number || 'N/A',
      attempt.similarity_percent || 'N/A',
      attempt.composite_card_url || 'N/A',
      attempt.video_url || 'N/A',
      attempt.whatsapp_sent ? 'Yes' : 'No',
      formatDate(attempt.created_at)
    ]);

    // Create CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bowling-attempts-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#FFCB17]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>All Attempts</h1>
          <p className="text-[#FFCB17] mt-1" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>Complete database of bowling attempts</p>
        </div>
        <Button onClick={exportToCSV} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
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

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-sm text-muted-foreground">Total Records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{attempts.filter(a => a.composite_card_url).length}</div>
            <p className="text-sm text-muted-foreground">With Composite Card</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{attempts.filter(a => a.video_url).length}</div>
            <p className="text-sm text-muted-foreground">With Video</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{attempts.filter(a => a.whatsapp_sent).length}</div>
            <p className="text-sm text-muted-foreground">WhatsApp Sent</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Bowling Attempts Database</CardTitle>
          <CardDescription>Search, filter, and view all user attempts</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10"
              />
            </div>
            <Select value={filter} onValueChange={(value) => {
              setFilter(value);
              setPage(1);
            }}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Attempts</SelectItem>
                <SelectItem value="complete">Complete Only</SelectItem>
                <SelectItem value="incomplete">Incomplete Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No attempts found</p>
              <p className="text-sm text-muted-foreground mt-2">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Phone</TableHead>
                      <TableHead className="font-semibold">Similarity</TableHead>
                      <TableHead className="font-semibold">Composite Card</TableHead>
                      <TableHead className="font-semibold">Video</TableHead>
                      <TableHead className="font-semibold">WhatsApp</TableHead>
                      <TableHead className="font-semibold">Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.map((attempt) => (
                      <TableRow key={attempt.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {attempt.display_name || 'Anonymous'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {attempt.phone_number || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {attempt.similarity_percent ? (
                            <Badge variant="secondary" className="font-semibold">
                              {attempt.similarity_percent}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {attempt.composite_card_url ? (
                            <a 
                              href={attempt.composite_card_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 text-sm max-w-xs truncate"
                              title={attempt.composite_card_url}
                            >
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">View Card</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {attempt.video_url ? (
                            <a 
                              href={attempt.video_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 text-sm max-w-xs truncate"
                              title={attempt.video_url}
                            >
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">View Video</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {attempt.whatsapp_sent ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                              ✓ Sent
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              ✗ Not Sent
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(attempt.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing page {page} of {totalPages} ({total} total records)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    ← Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

