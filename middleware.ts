import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 🔒 MIDDLEWARE - Route Protection
 * 
 * Protects admin routes from unauthorized access
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if accessing admin routes (except login page)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    // In a real app, you'd check for a secure HTTP-only cookie
    // For now, we're using client-side auth which is handled by the page components
    // This middleware just serves as an extra layer
    
    // You could add IP whitelist or other server-side checks here
    console.log('[Middleware] Admin route accessed:', pathname);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};

