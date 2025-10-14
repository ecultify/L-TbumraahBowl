'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import './admin-styles.css';

/**
 * 🎨 ADMIN LAYOUT
 * 
 * Layout with sidebar navigation for all admin pages
 * Protects routes by checking authentication
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  // Check authentication
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuth = window.sessionStorage.getItem('adminAuth');
      if (!isAuth) {
        router.push('/admin/login');
      }
    }
  }, [router]);

  return (
    <div className="flex h-screen bg-gray-100 relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/Desktop.png)' }}
      />
      
      {/* Sidebar */}
      <aside className="w-64 h-full shadow-lg relative z-10">
        <AdminSidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}

