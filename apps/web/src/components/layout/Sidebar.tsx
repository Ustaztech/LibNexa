import React from 'react';
import {
  BookOpen,
  Bookmark,
  Clock,
  Sparkles,
  Inbox,
  Layers,
  BarChart3,
  Users,
  Sliders,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  GraduationCap,
  Library,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  pendingRequestsCount?: number;
  activeLoansCount?: number;
  unreadNotificationsCount?: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: string;
  roles: UserRole[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
  pendingRequestsCount = 0,
  activeLoansCount = 0,
  unreadNotificationsCount = 0,
}) => {
  const { user, role, logout } = useAuth();

  const NAV_ITEMS: NavItem[] = [
    // Student Links
    {
      id: 'catalogue',
      label: 'Book Catalogue',
      icon: <BookOpen className="w-4 h-4" />,
      roles: ['STUDENT', 'LIBRARIAN', 'ADMIN'],
    },
    {
      id: 'loans',
      label: 'My Loans & Renewals',
      icon: <Clock className="w-4 h-4" />,
      badge: activeLoansCount,
      badgeColor: 'bg-brand-royal text-white',
      roles: ['STUDENT'],
    },
    {
      id: 'requests',
      label: 'My Requests',
      icon: <Bookmark className="w-4 h-4" />,
      roles: ['STUDENT'],
    },
    {
      id: 'reservations',
      label: 'My Reservations',
      icon: <Sparkles className="w-4 h-4" />,
      roles: ['STUDENT'],
    },

    // Librarian Links
    {
      id: 'circulation',
      label: 'Circulation Desk',
      icon: <Inbox className="w-4 h-4" />,
      badge: pendingRequestsCount,
      badgeColor: 'bg-amber-500 text-brand-dark',
      roles: ['LIBRARIAN', 'ADMIN'],
    },
    {
      id: 'inventory',
      label: 'Inventory & Copies',
      icon: <Layers className="w-4 h-4" />,
      roles: ['LIBRARIAN', 'ADMIN'],
    },

    // Admin Links
    {
      id: 'admin_analytics',
      label: 'Overview & Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
      roles: ['ADMIN'],
    },
    {
      id: 'admin_users',
      label: 'Users & Staff',
      icon: <Users className="w-4 h-4" />,
      roles: ['ADMIN'],
    },
    {
      id: 'admin_settings',
      label: 'Borrowing Policies',
      icon: <Sliders className="w-4 h-4" />,
      roles: ['ADMIN'],
    },

    // Universal Notifications Tab
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      badge: unreadNotificationsCount,
      badgeColor: 'bg-rose-500 text-white',
      roles: ['STUDENT', 'LIBRARIAN', 'ADMIN'],
    },
  ];

  const allowedItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const getRoleIcon = (r: UserRole) => {
    switch (r) {
      case 'ADMIN':
        return <Shield className="w-3.5 h-3.5 text-brand-gold" />;
      case 'LIBRARIAN':
        return <Library className="w-3.5 h-3.5 text-brand-teal" />;
      case 'STUDENT':
      default:
        return <GraduationCap className="w-3.5 h-3.5 text-brand-cyan" />;
    }
  };

  const getRoleBadgeClass = (r: UserRole) => {
    switch (r) {
      case 'ADMIN':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'LIBRARIAN':
        return 'bg-brand-teal/15 text-brand-cyan border-brand-teal/30';
      case 'STUDENT':
      default:
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-brand-navy border-r border-white/10 text-white flex flex-col transition-all duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-royal via-brand-teal to-brand-gold p-0.5 shadow-md flex-shrink-0">
              <div className="w-full h-full bg-brand-navy rounded-[10px] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-brand-cyan" />
              </div>
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-extrabold text-lg tracking-tight">
                    LIB<span className="text-brand-cyan">NEXA</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-brand-gold/20 text-brand-gold border border-brand-gold/30 rounded">
                    NSUK
                  </span>
                </div>
                <p className="text-[10px] text-white/50 truncate">Digital Library Portal</p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User Identity Chip */}
        {user && (
          <div className="p-3 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-royal to-brand-teal flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow">
                {user.fullName.charAt(0)}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate text-white leading-tight">{user.fullName}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${getRoleBadgeClass(role)}`}>
                      {getRoleIcon(role)}
                      {role}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Menu Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {!isCollapsed && (
            <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
              {role === 'ADMIN'
                ? 'Super Admin Dashboard'
                : role === 'LIBRARIAN'
                ? 'Circulation Desk'
                : 'Student Library'}
            </p>
          )}

          {allowedItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-royal to-brand-teal text-white shadow-md font-semibold'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-brand-cyan/80 group-hover:text-brand-cyan'}`}>
                  {item.icon}
                </div>
                {!isCollapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}
                {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                      item.badgeColor || 'bg-brand-teal text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/10 bg-white/5 space-y-1">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-500/15 transition-all"
            title={isCollapsed ? 'Sign Out' : undefined}
          >
            <LogOut className="w-4 h-4 text-rose-400 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
