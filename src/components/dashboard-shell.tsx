'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth-actions';
import { SessionUser } from '@/lib/types';
import {
  LayoutDashboard,
  CalendarPlus,
  CalendarDays,
  Calendar,
  User,
  Users,
  CheckCircle,
  Globe,
  Star,
  BarChart3,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function getNavItems(role: string): NavItem[] {
  const common: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Request Leave', href: '/dashboard/request-leave', icon: <CalendarPlus className="w-4 h-4" /> },
    { label: 'My Leaves', href: '/dashboard/my-leaves', icon: <CalendarDays className="w-4 h-4" /> },
    { label: 'Calendar', href: '/dashboard/calendar', icon: <Calendar className="w-4 h-4" /> },
    { label: 'Profile', href: '/dashboard/profile', icon: <User className="w-4 h-4" /> },
  ];

  const approver: NavItem[] = [
    { label: 'Approvals', href: '/dashboard/approvals', icon: <CheckCircle className="w-4 h-4" /> },
    { label: 'Regional Holidays', href: '/dashboard/regional-holidays', icon: <Globe className="w-4 h-4" /> },
  ];

  const admin: NavItem[] = [
    { label: 'Employees', href: '/dashboard/employees', icon: <Users className="w-4 h-4" /> },
    { label: 'Public Holidays', href: '/dashboard/holidays', icon: <Star className="w-4 h-4" /> },
    { label: 'Reports', href: '/dashboard/reports', icon: <BarChart3 className="w-4 h-4" /> },
    { label: 'Audit Log', href: '/dashboard/audit-log', icon: <ScrollText className="w-4 h-4" /> },
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-4 h-4" /> },
  ];

  if (role === 'ADMIN') return [...common, ...approver, ...admin];
  if (role === 'APPROVER') return [...common, ...approver];
  return common;
}

export function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = getNavItems(user.role);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutAction();
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${sidebarOpen ? 'open' : ''} md:translate-x-0`}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className="px-5 py-5 flex items-center justify-between border-b border-gray-800/60">
          <div className="min-w-0">
            <h1
              className="text-sm font-bold tracking-[0.15em] text-[#ec1c24]"
              style={{ fontFamily: 'Orbitron, monospace' }}
            >
              JEDLIK
            </h1>
            <p className="text-[10px] text-gray-500 tracking-[0.1em] uppercase mt-0.5">
              Leave Portal
            </p>
          </div>
          <button
            className="md:hidden text-gray-400 hover:text-white p-2 -mr-2"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          <div className="px-3 mb-2">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-3 mb-1">
              Menu
            </p>
          </div>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''}`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User Info + Logout — sticky so it's always visible */}
        <div className="sidebar-sticky-footer p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-full bg-[#ec1c24]/20 text-[#ec1c24] flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{user.name}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider truncate">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 min-h-[2.5rem]"
          >
            <LogOut className="w-4 h-4" />
            <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 md:ml-64">
        {/* Top Header (Mobile) */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3 flex items-center justify-between md:px-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="md:hidden text-gray-600 hover:text-gray-900 -ml-2 p-2"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span
              className="md:hidden text-sm font-bold tracking-[0.15em] text-[#ec1c24]"
              style={{ fontFamily: 'Orbitron, monospace' }}
            >
              JEDLIK
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 min-w-0">
            <span className="text-sm text-gray-600">Welcome,</span>
            <span className="text-sm font-semibold text-gray-900 truncate max-w-[16rem]">{user.name}</span>
            <span className="badge badge-paid text-[10px] ml-1">{user.role}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="md:hidden flex items-center gap-2 min-w-0">
              <span className="text-xs text-gray-600 truncate max-w-[8rem]">{user.name}</span>
              <div className="w-8 h-8 shrink-0 rounded-full bg-[#ec1c24]/10 text-[#ec1c24] flex items-center justify-center text-xs font-bold">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
