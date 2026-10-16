import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import { Book, Category, BorrowingRequest, Loan, Reservation, NotificationItem } from './types';
import api from './services/api';

// Layout & Navigation
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { NotificationDrawer } from './components/layout/NotificationDrawer';
import { AuthPage } from './components/auth/AuthPage';

// Views
import { BookCard } from './components/catalogue/BookCard';
import { BookDetailModal } from './components/catalogue/BookDetailModal';
import { FilterBar } from './components/catalogue/FilterBar';

import { StudentLoansView } from './components/student/StudentLoansView';
import { StudentRequestsView } from './components/student/StudentRequestsView';
import { StudentReservationsView } from './components/student/StudentReservationsView';

import { CirculationDeskView } from './components/librarian/CirculationDeskView';
import { InventoryManagerView } from './components/librarian/InventoryManagerView';

import { AdminPoliciesView } from './components/admin/AdminPoliciesView';
import { AdminUsersView } from './components/admin/AdminUsersView';
import { AdminAnalyticsView } from './components/admin/AdminAnalyticsView';

import { BookOpen, Sparkles, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const { user, role, isAuthenticated, isLoading: isAuthLoading, getDefaultTabForRole } = useAuth();
  const { showToast } = useToast();

  // App Navigation & Layout State
  const [activeTab, setActiveTab] = useState<string>('catalogue');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Modals & Drawers
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [selectedBookForDetail, setSelectedBookForDetail] = useState<Book | null>(null);

  // Catalogue State
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);

  // Student Activity State
  const [myLoans, setMyLoans] = useState<Loan[]>([]);
  const [myRequests, setMyRequests] = useState<BorrowingRequest[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);

  // Staff / Circulation State
  const [allCirculationRequests, setAllCirculationRequests] = useState<BorrowingRequest[]>([]);
  const [allCirculationLoans, setAllCirculationLoans] = useState<Loan[]>([]);
  const [allRenewals, setAllRenewals] = useState<any[]>([]);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Set default dashboard and enforce RBAC upon login or role change
  useEffect(() => {
    if (isAuthenticated && role) {
      const defaultTab = getDefaultTabForRole(role);
      setActiveTab(defaultTab);
    }
  }, [isAuthenticated, role, getDefaultTabForRole]);

  // Strict RBAC route protection
  useEffect(() => {
    if (!isAuthenticated) return;

    if (role === 'STUDENT') {
      const allowed = ['catalogue', 'loans', 'requests', 'reservations', 'notifications'];
      if (!allowed.includes(activeTab)) {
        setActiveTab('catalogue');
      }
    } else if (role === 'LIBRARIAN') {
      const allowed = ['circulation', 'inventory', 'catalogue', 'notifications'];
      if (!allowed.includes(activeTab)) {
        setActiveTab('circulation');
      }
    } else if (role === 'ADMIN') {
      const allowed = ['admin_analytics', 'admin_users', 'admin_settings', 'circulation', 'inventory', 'catalogue', 'notifications'];
      if (!allowed.includes(activeTab)) {
        setActiveTab('admin_analytics');
      }
    }
  }, [activeTab, role, isAuthenticated]);

  // 1. Fetch Catalogue Books (strictly from backend database)
  const fetchCatalogue = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingBooks(true);
    try {
      const res = await api.getBooks({
        search: searchQuery || undefined,
        categoryId: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        availableOnly: availableOnly || undefined,
        sortBy: sortBy,
      });

      if (res.success && res.data) {
        setBooks(res.data);
      } else {
        setBooks([]);
      }
    } catch (err: any) {
      setBooks([]);
      showToast({
        type: 'error',
        title: 'Could not load books',
        message: err.message || 'Error connecting to university catalog service.',
      });
    } finally {
      setIsLoadingBooks(false);
    }
  }, [isAuthenticated, searchQuery, selectedCategory, availableOnly, sortBy, showToast]);

  // 2. Fetch Categories
  const fetchCategories = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      } else {
        setCategories([]);
      }
    } catch {
      setCategories([]);
    }
  }, [isAuthenticated]);

  // 3. Fetch User Activity & Role Data
  const fetchUserData = useCallback(async () => {
    if (!isAuthenticated) return;

    // Notifications
    try {
      const notifRes = await api.getNotifications();
      if (notifRes.success && notifRes.data) {
        setNotifications(notifRes.data);
        setUnreadCount(notifRes.unreadCount || 0);
      }
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }

    // Role-specific data
    if (role === 'STUDENT') {
      try {
        const [loansRes, reqsRes, resRes] = await Promise.all([
          api.getLoans(),
          api.getBorrowingRequests(),
          api.getReservations(),
        ]);
        if (loansRes.success && loansRes.data) setMyLoans(loansRes.data);
        if (reqsRes.success && reqsRes.data) setMyRequests(reqsRes.data);
        if (resRes.success && resRes.data) setMyReservations(resRes.data);
      } catch {
        setMyLoans([]);
        setMyRequests([]);
        setMyReservations([]);
      }
    } else {
      // Staff (LIBRARIAN / ADMIN)
      try {
        const [reqsRes, loansRes, renewalsRes] = await Promise.all([
          api.getBorrowingRequests(),
          api.getLoans(),
          api.getRenewals(),
        ]);
        if (reqsRes.success && reqsRes.data) setAllCirculationRequests(reqsRes.data);
        if (loansRes.success && loansRes.data) setAllCirculationLoans(loansRes.data);
        if (renewalsRes.success && renewalsRes.data) setAllRenewals(renewalsRes.data);
      } catch {
        setAllCirculationRequests([]);
        setAllCirculationLoans([]);
        setAllRenewals([]);
      }
    }
  }, [isAuthenticated, role]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCatalogue();
    }
  }, [isAuthenticated, fetchCatalogue]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
    }
  }, [isAuthenticated, fetchCategories]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserData();
    }
  }, [isAuthenticated, fetchUserData]);

  // Borrow Request Action Handler
  const handleRequestBorrow = async (book: Book) => {
    try {
      await api.createBorrowRequest(book.id);
      showToast({
        type: 'success',
        title: 'Borrow Request Submitted',
        message: `Your request for "${book.title}" is queued for librarian review.`,
      });
      fetchUserData();
      fetchCatalogue();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Request Failed',
        message: err.message || 'Maximum borrowing requests reached or policy limit applied.',
      });
    }
  };

  // Reserve Book Action Handler
  const handleReserve = async (book: Book) => {
    try {
      await api.createReservation(book.id);
      showToast({
        type: 'success',
        title: 'Book Reserved',
        message: `You joined the waitlist for "${book.title}". You will be alerted once a copy is returned!`,
      });
      fetchUserData();
      fetchCatalogue();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Reservation Failed',
        message: err.message || 'Could not place reservation.',
      });
    }
  };

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-brand-bg dark:bg-brand-dark flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-royal text-white flex items-center justify-center animate-spin mb-4 shadow-elevated">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="font-heading font-bold text-sm text-brand-dark dark:text-white">
          Authenticating with LIBNEXA NSUK...
        </p>
      </div>
    );
  }

  // Strictly Require Authentication: If not logged in, show AuthPage full-screen
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Active loan and pending request counts for badges
  const pendingRequestsCount = allCirculationRequests.filter((r) => r.status === 'PENDING').length;
  const activeLoansCount = myLoans.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE').length;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-darkText dark:bg-brand-dark dark:text-white flex transition-colors selection:bg-brand-teal selection:text-white">
      {/* Clean Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        pendingRequestsCount={pendingRequestsCount}
        activeLoansCount={activeLoansCount}
        unreadNotificationsCount={unreadCount}
      />

      {/* Main Content Layout with Sidebar Offset */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Navbar */}
        <Navbar
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
          unreadNotificationsCount={unreadCount}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

        {/* View Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* TAB: CATALOGUE */}
          {activeTab === 'catalogue' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Hero Banner */}
              <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 mesh-gradient-header text-white shadow-elevated">
                <div className="relative z-10 max-w-2xl">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/20 mb-3 text-brand-cyan">
                    <Sparkles className="w-3.5 h-3.5" />
                    NSUK Central Library Catalogue
                  </span>
                  <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-tight">
                    Discover, Borrow, and Reserve University Knowledge Materials.
                  </h1>
                  <p className="text-xs sm:text-sm text-white/80 mt-2 leading-relaxed">
                    Real-time physical copy availability, automated 14-day loan cycles, shelf mapping, and waitlist fulfillment.
                  </p>
                </div>

                <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-end pr-8">
                  <BookOpen className="w-64 h-64 text-white" />
                </div>
              </div>

              {/* Filter Bar */}
              <FilterBar
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                availableOnly={availableOnly}
                onToggleAvailableOnly={() => setAvailableOnly(!availableOnly)}
                sortBy={sortBy}
                onSortChange={setSortBy}
                totalResults={books.length}
              />

              {/* Books Grid */}
              {isLoadingBooks ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <div
                      key={n}
                      className="h-80 rounded-2xl bg-white/50 dark:bg-white/5 border border-brand-navy/5 animate-pulse"
                    />
                  ))}
                </div>
              ) : books.length === 0 ? (
                <div className="p-16 text-center rounded-3xl bg-white dark:bg-brand-navy/40 border border-brand-navy/5 dark:border-white/10 shadow-card">
                  <BookOpen className="w-12 h-12 text-brand-royal/30 dark:text-brand-cyan/30 mx-auto mb-3" />
                  <h3 className="font-heading font-bold text-base text-brand-dark dark:text-white">
                    No Books Found
                  </h3>
                  <p className="text-xs text-brand-mutedText dark:text-white/60 mt-1 max-w-sm mx-auto">
                    Try adjusting your search criteria or clearing subject filters.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {books.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onSelect={setSelectedBookForDetail}
                      onRequestBorrow={handleRequestBorrow}
                      onReserve={handleReserve}
                      isStudent={role === 'STUDENT'}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: STUDENT LOANS (RBAC Protected: STUDENT only) */}
          {activeTab === 'loans' && role === 'STUDENT' && (
            <div className="animate-in fade-in duration-300">
              <StudentLoansView loans={myLoans} onRefresh={fetchUserData} />
            </div>
          )}

          {/* TAB: STUDENT REQUESTS (RBAC Protected: STUDENT only) */}
          {activeTab === 'requests' && role === 'STUDENT' && (
            <div className="animate-in fade-in duration-300">
              <StudentRequestsView requests={myRequests} onRefresh={fetchUserData} />
            </div>
          )}

          {/* TAB: STUDENT RESERVATIONS (RBAC Protected: STUDENT only) */}
          {activeTab === 'reservations' && role === 'STUDENT' && (
            <div className="animate-in fade-in duration-300">
              <StudentReservationsView reservations={myReservations} onRefresh={fetchUserData} />
            </div>
          )}

          {/* TAB: LIBRARIAN CIRCULATION DESK (RBAC Protected: LIBRARIAN / ADMIN) */}
          {activeTab === 'circulation' && (role === 'LIBRARIAN' || role === 'ADMIN') && (
            <div className="animate-in fade-in duration-300">
              <CirculationDeskView
                requests={allCirculationRequests}
                loans={allCirculationLoans}
                renewals={allRenewals}
                onRefresh={fetchUserData}
              />
            </div>
          )}

          {/* TAB: LIBRARIAN INVENTORY (RBAC Protected: LIBRARIAN / ADMIN) */}
          {activeTab === 'inventory' && (role === 'LIBRARIAN' || role === 'ADMIN') && (
            <div className="animate-in fade-in duration-300">
              <InventoryManagerView books={books} onRefresh={fetchCatalogue} />
            </div>
          )}

          {/* TAB: ADMIN ANALYTICS (RBAC Protected: ADMIN only) */}
          {activeTab === 'admin_analytics' && role === 'ADMIN' && (
            <div className="animate-in fade-in duration-300">
              <AdminAnalyticsView />
            </div>
          )}

          {/* TAB: ADMIN USERS (RBAC Protected: ADMIN only) */}
          {activeTab === 'admin_users' && role === 'ADMIN' && (
            <div className="animate-in fade-in duration-300">
              <AdminUsersView />
            </div>
          )}

          {/* TAB: ADMIN POLICIES (RBAC Protected: ADMIN only) */}
          {activeTab === 'admin_settings' && role === 'ADMIN' && (
            <div className="animate-in fade-in duration-300">
              <AdminPoliciesView />
            </div>
          )}

          {/* TAB: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="animate-in fade-in duration-300 max-w-3xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-extrabold text-xl text-brand-dark dark:text-white">
                    System Notifications & Reminders
                  </h2>
                  <p className="text-xs text-brand-mutedText dark:text-white/60">
                    Real-time alerts regarding loan due dates, approvals, and waitlists
                  </p>
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-brand-navy/60 border border-brand-navy/10 text-xs text-brand-mutedText">
                  No notifications recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        !n.readAt
                          ? 'bg-white dark:bg-brand-navy border-brand-cyan/40 shadow-sm'
                          : 'bg-white/60 dark:bg-white/5 border-brand-navy/5 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-bold text-xs text-brand-dark dark:text-white">{n.title}</h4>
                        <span className="text-[10px] text-brand-mutedText font-mono">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-brand-darkText/80 dark:text-white/70 mt-1 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-brand-navy/10 dark:border-white/10 bg-white/50 dark:bg-brand-navy/40 backdrop-blur-md py-5 text-xs text-brand-mutedText dark:text-white/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-brand-dark dark:text-white">
                LIB<span className="text-brand-royal dark:text-brand-cyan">NEXA</span>
              </span>
              <span>—</span>
              <span>Nasarawa State University, Keffi (NSUK) Library Services</span>
            </div>
            <div className="text-[11px]">
              Institutional Role: <span className="font-bold text-brand-royal dark:text-brand-cyan">{role}</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Book Detail Modal */}
      <BookDetailModal
        book={selectedBookForDetail}
        isOpen={!!selectedBookForDetail}
        onClose={() => setSelectedBookForDetail(null)}
        onRequestBorrow={handleRequestBorrow}
        onReserve={handleReserve}
      />

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onRefresh={fetchUserData}
      />
    </div>
  );
};

export default App;
