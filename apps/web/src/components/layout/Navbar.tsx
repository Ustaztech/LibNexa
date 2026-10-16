import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  User as UserIcon,
  LogOut,
  ChevronDown,
  BookMarked,
  Shield,
  GraduationCap,
  Library,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface NavbarProps {
  onOpenMobileSidebar: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenMobileSidebar,
  onOpenNotifications,
  unreadNotificationsCount,
  searchQuery,
  onSearchChange,
  activeTab,
  onSelectTab,
}) => {
  const { user, role, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'catalogue':
        return 'University Book Catalogue';
      case 'loans':
        return 'My Borrowed Books & Renewals';
      case 'requests':
        return 'Borrowing Requests Tracking';
      case 'reservations':
        return 'Active Waitlist Reservations';
      case 'circulation':
        return 'Circulation Desk & Borrow Queue';
      case 'inventory':
        return 'Library Inventory & Physical Copies';
      case 'admin_analytics':
        return 'Circulation Analytics & Reports';
      case 'admin_users':
        return 'User Accounts & Staff Directory';
      case 'admin_settings':
        return 'Borrowing Policies & Rules';
      case 'notifications':
        return 'System Notifications & Alerts';
      default:
        return 'Dashboard';
    }
  };

  const getRoleBadgeStyle = (r: UserRole) => {
    switch (r) {
      case 'ADMIN':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'LIBRARIAN':
        return 'bg-brand-teal/15 text-brand-cyan border-brand-teal/30';
      case 'STUDENT':
      default:
        return 'bg-brand-royal/15 text-blue-300 border-brand-royal/30';
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-brand-navy/95 border-b border-white/10 shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Mobile Hamburger + Page Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h2 className="font-heading font-bold text-base sm:text-lg text-white leading-tight">
                {getPageTitle(activeTab)}
              </h2>
              <p className="text-[11px] text-white/50 hidden sm:block">
                Nasarawa State University, Keffi — Digital Library
              </p>
            </div>
          </div>

          {/* Search Bar in Header */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search catalog by title, ISBN, author, discipline..."
                className="w-full pl-9 pr-4 py-2 bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder-white/40 text-xs rounded-xl border border-white/10 focus:border-brand-cyan focus:outline-none transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Actions: Notifications & User Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors focus:outline-none"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-md animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Profile Menu */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 p-1.5 pl-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors focus:outline-none"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-royal to-brand-teal flex items-center justify-center text-white font-bold text-xs shadow">
                    {user.fullName.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">
                      {user.fullName.split(' ')[0]}
                    </p>
                    <span className={`inline-block text-[10px] font-mono font-medium px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(role)}`}>
                      {role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-white/50" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div
                    onMouseLeave={() => setShowUserMenu(false)}
                    className="absolute right-0 mt-2 w-64 rounded-2xl bg-brand-navy/95 backdrop-blur-xl border border-white/15 shadow-elevated p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    <div className="p-3 border-b border-white/10 mb-1">
                      <p className="text-xs font-bold text-white">{user.fullName}</p>
                      <p className="text-[11px] text-white/60 truncate">{user.email}</p>
                      {user.matricNumber && (
                        <p className="text-[10px] font-mono text-brand-cyan mt-1">Matric: {user.matricNumber}</p>
                      )}
                      {user.membershipNumber && (
                        <p className="text-[10px] font-mono text-brand-gold mt-1">Staff ID: {user.membershipNumber}</p>
                      )}
                      {user.department && (
                        <p className="text-[10px] text-white/50">{user.department}</p>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onSelectTab('notifications');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Bell className="w-4 h-4 text-amber-400" />
                        Notifications ({unreadNotificationsCount})
                      </button>
                    </div>

                    <div className="pt-2 mt-1 border-t border-white/10">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="md:hidden pb-3">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search catalog by title, ISBN, author..."
              className="w-full pl-9 pr-4 py-2 bg-white/10 text-white placeholder-white/40 text-xs rounded-xl border border-white/10 focus:border-brand-cyan focus:outline-none"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
