'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LayoutDashboard, TrendingUp, ClipboardList, Trophy, LogOut, Database, RotateCcw } from 'lucide-react';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const menuItems: MenuItem[] = [
  { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
  { label: 'All Attempts', href: '/admin/attempts', icon: ClipboardList },
  { label: 'Top Players', href: '/admin/players', icon: Trophy },
  { label: 'Downloads', href: '/admin/downloads', icon: Database },
  { label: 'Retries', href: '/admin/retries', icon: RotateCcw },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('adminAuth');
      window.sessionStorage.removeItem('adminToken');
    }
    router.push('/admin/login');
  };

  return (
    <div className="flex flex-col h-full bg-[#0EA5E9] text-white">
      {/* Header with Logo */}
      <div className="p-6 border-b border-white/20">
        <div className="flex items-center justify-center">
          <Image 
            src="/images/bowlkarbumrahkispeedpar.avif" 
            alt="Bowl Kar Bumrah Ki Speed Par" 
            width={220}
            height={90}
            className="object-contain w-full"
            priority
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-[#FFCB17] text-black font-semibold shadow-md'
                      : 'text-white hover:bg-[#FFCB17] hover:text-black'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/20">
        <Button
          variant="outline"
          className="w-full bg-transparent border-white/30 text-white hover:bg-[#FFCB17] hover:text-black hover:border-[#FFCB17] flex items-center justify-center gap-2 transition-all duration-200"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
}

