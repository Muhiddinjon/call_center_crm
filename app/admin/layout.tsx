'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Headphones,
  LayoutDashboard,
  Users,
  FileText,
  Tag,
  Settings,
  LogOut,
  ChevronLeft,
  BarChart3,
  Activity,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  username: string;
  fullName?: string;
  isAdmin: boolean;
}

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/monitoring', icon: Activity, label: 'Monitoring' },
  { href: '/admin/shifts', icon: Calendar, label: 'Smenalar' },
  { href: '/admin/stats', icon: BarChart3, label: 'Statistika' },
  { href: '/admin/reports', icon: FileText, label: 'Hisobotlar' },
  { href: '/admin/users', icon: Users, label: 'Foydalanuvchilar' },
  { href: '/admin/topics', icon: Tag, label: 'Murojaat turlari' },
  { href: '/admin/settings', icon: Settings, label: 'Sozlamalar' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.error || !data.isAdmin) {
          router.push('/');
        } else {
          setUser(data);
        }
      })
      .catch(() => router.push('/'));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gray-900 text-white z-40">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Headphones className="w-8 h-8 text-blue-400" />
            <div>
              <div className="font-bold">Call Center CRM</div>
              <div className="text-xs text-gray-400">Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                pathname === item.href
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Back to operator panel */}
        <div className="absolute bottom-20 left-0 right-0 px-4">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Operator panelga
          </Link>
        </div>

        {/* User info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{user.fullName || user.username}</div>
              <div className="text-xs text-gray-400">Administrator</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Chiqish"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
