'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * 🔐 ADMIN LOGIN PAGE
 * 
 * Simple password-based authentication for admin dashboard
 * Password: bumrah-admin-2025 (can be changed via env)
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simple password check (in production, use proper auth)
      const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'bumrah-admin-2025';
      
      if (password === correctPassword) {
        // Store auth token in session storage
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('adminAuth', 'true');
          window.sessionStorage.setItem('adminToken', correctPassword);
        }
        
        // Redirect to dashboard  
        router.push('/admin/dashboard');
      } else {
        setError('Invalid password. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FFCB17]">
      {/* Login Card */}
      <Card className="w-full max-w-md relative z-10 bg-[#0EA5E9] border-none shadow-2xl">
        <CardHeader className="space-y-4 pb-6">
          {/* Logo */}
          <div className="flex justify-center">
            <Image
              src="/images/bowlkarbumrahkispeedpar.avif"
              alt="Bowl Kar Bumrah Ki Speed Par"
              width={320}
              height={140}
              className="object-contain"
              priority
            />
          </div>
          
          <CardTitle className="text-2xl font-bold text-center text-white">
            Admin Login
          </CardTitle>
          <CardDescription className="text-center text-white/90 font-medium">
            Enter your password to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full bg-white border-2 border-white/20 text-black placeholder:text-gray-500 focus:border-[#FFCB17] focus:ring-[#FFCB17]"
                autoFocus
              />
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-100 border-red-400 text-red-800">
                <AlertDescription className="font-medium">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-[#FFCB17] text-black hover:bg-[#FFD700] font-bold text-lg py-6 shadow-lg"
              disabled={loading || !password}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-white font-medium">
            <p>Bumrah Ki Speed Par - Admin Panel</p>
            <p className="mt-1 text-xs">© 2025 All rights reserved</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

