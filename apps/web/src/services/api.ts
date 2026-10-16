import {
  User,
  Book,
  BookCopy,
  BorrowingRequest,
  Loan,
  Reservation,
  Renewal,
  NotificationItem,
  LibrarySettingItem,
  AuditLogItem,
  Category,
  Author,
  SystemOverviewStats,
  AnalyticsChartsData,
} from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api/v1';

class ApiClient {
  private getHeaders(isJson = true): HeadersInit {
    const headers: Record<string, string> = {};
    if (isJson) headers['Content-Type'] = 'application/json';

    const token = localStorage.getItem('libnexa_access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      ...this.getHeaders(!(options.body instanceof FormData)),
      ...(options.headers as Record<string, string>),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data?.error?.message || data?.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMsg);
      }

      // Automatically map items to data if the backend returns paginated items
      if (data && data.success && data.data === undefined && Array.isArray(data.items)) {
        data.data = data.items;
      }

      return data;
    } catch (err: any) {
      console.warn(`[API ERROR] ${endpoint}:`, err.message);
      throw err;
    }
  }

  // Auth Endpoints
  async login(identifier: string, password: string) {
    return this.request<{ success: boolean; data: { user: User; accessToken: string; refreshToken: string } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      }
    );
  }

  async registerStudent(payload: {
    fullName: string;
    email: string;
    password: string;
    matricNumber: string;
    department?: string;
    faculty?: string;
    phone?: string;
  }) {
    return this.request<{ success: boolean; data: { user: User; accessToken: string; refreshToken: string } }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async getMe() {
    return this.request<{ success: boolean; data: User }>('/auth/me');
  }

  async changePassword(oldPassword: string, newPassword: string) {
    return this.request<{ success: boolean; data: { message: string } }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  // Books
  async getBooks(params: {
    search?: string;
    categoryId?: string;
    authorId?: string;
    availableOnly?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const q = new URLSearchParams();
    if (params.search) q.append('search', params.search);
    if (params.categoryId && params.categoryId !== 'ALL') q.append('categoryId', params.categoryId);
    if (params.authorId) q.append('authorId', params.authorId);
    if (params.availableOnly) q.append('availableOnly', 'true');
    if (params.page) q.append('page', params.page.toString());
    if (params.limit) q.append('limit', params.limit.toString());
    if (params.sortBy) q.append('sortBy', params.sortBy);
    if (params.sortOrder) q.append('sortOrder', params.sortOrder);

    return this.request<{
      success: boolean;
      data: Book[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/books?${q.toString()}`);
  }

  async getBookById(id: string) {
    return this.request<{ success: boolean; data: Book }>(`/books/${id}`);
  }

  async getCategories() {
    return this.request<{ success: boolean; data: Category[] }>('/books/meta/categories');
  }

  async getAuthors() {
    return this.request<{ success: boolean; data: Author[] }>('/books/meta/authors');
  }

  async createBook(payload: {
    title: string;
    isbn: string;
    description: string;
    publisherName?: string;
    publicationYear?: number;
    edition?: string;
    language?: string;
    coverImageUrl?: string;
    authorNames: string[];
    categoryNames: string[];
  }) {
    return this.request<{ success: boolean; data: Book }>('/books', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateBook(id: string, payload: Partial<Book>) {
    return this.request<{ success: boolean; data: Book }>(`/books/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteBook(id: string) {
    return this.request<{ success: boolean; data: { message: string } }>(`/books/${id}`, {
      method: 'DELETE',
    });
  }

  // Copies
  async getCopies(params: { bookId?: string; status?: string; condition?: string; search?: string } = {}) {
    const q = new URLSearchParams();
    if (params.bookId) q.append('bookId', params.bookId);
    if (params.status) q.append('status', params.status);
    if (params.condition) q.append('condition', params.condition);
    if (params.search) q.append('search', params.search);

    return this.request<{ success: boolean; data: BookCopy[] }>(`/copies?${q.toString()}`);
  }

  async createCopy(payload: {
    bookId: string;
    accessionNumber: string;
    barcode?: string;
    shelfLocation: string;
    condition?: 'NEW' | 'GOOD' | 'FAIR' | 'DAMAGED';
    status?: 'AVAILABLE' | 'UNDER_MAINTENANCE' | 'WITHDRAWN';
  }) {
    return this.request<{ success: boolean; data: BookCopy }>('/copies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCopy(id: string, payload: Partial<BookCopy>) {
    return this.request<{ success: boolean; data: BookCopy }>(`/copies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // Borrowing Requests
  async createBorrowRequest(bookId: string) {
    return this.request<{ success: boolean; data: BorrowingRequest }>('/borrowing-requests', {
      method: 'POST',
      body: JSON.stringify({ bookId }),
    });
  }

  async getBorrowingRequests(params: {
    status?: string;
    userId?: string;
    bookId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const q = new URLSearchParams();
    if (params.status && params.status !== 'ALL') q.append('status', params.status);
    if (params.userId) q.append('userId', params.userId);
    if (params.bookId) q.append('bookId', params.bookId);
    if (params.search) q.append('search', params.search);
    if (params.page) q.append('page', params.page.toString());
    if (params.limit) q.append('limit', params.limit.toString());

    return this.request<{
      success: boolean;
      data: BorrowingRequest[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/borrowing-requests?${q.toString()}`);
  }

  async reviewBorrowRequest(id: string, decision: 'APPROVE' | 'REJECT', rejectionReason?: string, assignedCopyId?: string) {
    return this.request<{ success: boolean; data: BorrowingRequest }>(`/borrowing-requests/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, rejectionReason, assignedCopyId }),
    });
  }

  async confirmCollection(requestId: string) {
    return this.request<{ success: boolean; data: Loan }>(`/borrowing-requests/${requestId}/confirm-collection`, {
      method: 'POST',
    });
  }

  // Loans & Returns
  async getLoans(params: {
    status?: string;
    userId?: string;
    bookId?: string;
    search?: string;
    isOverdue?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    const q = new URLSearchParams();
    if (params.status && params.status !== 'ALL') q.append('status', params.status);
    if (params.userId) q.append('userId', params.userId);
    if (params.bookId) q.append('bookId', params.bookId);
    if (params.search) q.append('search', params.search);
    if (params.isOverdue) q.append('isOverdue', 'true');
    if (params.page) q.append('page', params.page.toString());
    if (params.limit) q.append('limit', params.limit.toString());

    return this.request<{
      success: boolean;
      data: Loan[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/loans?${q.toString()}`);
  }

  async processReturn(loanId: string, condition: 'NEW' | 'GOOD' | 'FAIR' | 'DAMAGED', notes?: string) {
    return this.request<{
      success: boolean;
      data: {
        loan: Loan;
        assignedReservation: any;
        message: string;
      };
    }>(`/loans/${loanId}/return`, {
      method: 'POST',
      body: JSON.stringify({ condition, notes }),
    });
  }

  // Reservations
  async createReservation(bookId: string) {
    return this.request<{ success: boolean; data: Reservation }>('/reservations', {
      method: 'POST',
      body: JSON.stringify({ bookId }),
    });
  }

  async getReservations(params: {
    status?: string;
    userId?: string;
    bookId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const q = new URLSearchParams();
    if (params.status && params.status !== 'ALL') q.append('status', params.status);
    if (params.userId) q.append('userId', params.userId);
    if (params.bookId) q.append('bookId', params.bookId);
    if (params.search) q.append('search', params.search);
    if (params.page) q.append('page', params.page.toString());
    if (params.limit) q.append('limit', params.limit.toString());

    return this.request<{
      success: boolean;
      data: Reservation[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/reservations?${q.toString()}`);
  }

  async cancelReservation(id: string) {
    return this.request<{ success: boolean; data: { message: string } }>(`/reservations/${id}/cancel`, {
      method: 'POST',
    });
  }

  // Renewals
  async requestRenewal(loanId: string, reason?: string) {
    return this.request<{ success: boolean; data: Renewal }>('/renewals', {
      method: 'POST',
      body: JSON.stringify({ loanId, reason }),
    });
  }

  async getRenewals(params: { status?: string; page?: number; limit?: number } = {}) {
    const q = new URLSearchParams();
    if (params.status && params.status !== 'ALL') q.append('status', params.status);
    if (params.page) q.append('page', params.page.toString());
    if (params.limit) q.append('limit', params.limit.toString());

    return this.request<{
      success: boolean;
      data: Renewal[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/renewals?${q.toString()}`);
  }

  async reviewRenewal(renewalId: string, decision: 'APPROVE' | 'REJECT', rejectionReason?: string) {
    return this.request<{ success: boolean; data: Renewal }>(`/renewals/${renewalId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, rejectionReason }),
    });
  }

  // Notifications
  async getNotifications() {
    return this.request<{ success: boolean; data: NotificationItem[]; unreadCount: number }>('/notifications');
  }

  async markNotificationAsRead(id: string) {
    return this.request<{ success: boolean; message: string }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsAsRead() {
    return this.request<{ success: boolean; message: string }>('/notifications/read-all', {
      method: 'PATCH',
    });
  }

  async getNotificationPreferences() {
    return this.request<{
      success: boolean;
      data: { emailEnabled: boolean; pushEnabled: boolean; reminderEnabled: boolean };
    }>('/notifications/preferences');
  }

  async updateNotificationPreferences(prefs: {
    emailEnabled?: boolean;
    pushEnabled?: boolean;
    reminderEnabled?: boolean;
  }) {
    return this.request<{ success: boolean; data: any }>('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    });
  }

  async triggerDueReminders() {
    return this.request<{ success: boolean; processed: number; simulatedAlerts: any[] }>(
      '/notifications/trigger-reminders',
      { method: 'POST' }
    );
  }

  // Reports
  async getOverviewStats() {
    return this.request<{ success: boolean; data: SystemOverviewStats }>('/reports/overview');
  }

  async getAnalyticsCharts() {
    return this.request<{ success: boolean; data: AnalyticsChartsData }>('/reports/analytics');
  }

  async exportReport(type: 'INVENTORY' | 'CIRCULATION' | 'OVERDUE' | 'AUDIT') {
    return this.request<{ success: boolean; data: { reportType: string; exportedAt: string; records: any[] } }>(
      `/reports/export?type=${type}`
    );
  }

  // Admin
  async getUsers(params: { role?: string; status?: string; search?: string; page?: number; limit?: number } = {}) {
    const q = new URLSearchParams();
    if (params.role && params.role !== 'ALL') q.append('role', params.role);
    if (params.status && params.status !== 'ALL') q.append('status', params.status);
    if (params.search) q.append('search', params.search);
    if (params.page) q.append('page', params.page.toString());
    if (params.limit) q.append('limit', params.limit.toString());

    return this.request<{
      success: boolean;
      data: User[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/admin/users?${q.toString()}`);
  }

  async createLibrarian(payload: {
    fullName: string;
    email: string;
    password: string;
    membershipNumber?: string;
    phone?: string;
  }) {
    return this.request<{ success: boolean; data: User }>('/admin/librarians', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateUserStatus(id: string, payload: { accountStatus?: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'; role?: string }) {
    return this.request<{ success: boolean; data: User }>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async getSettings() {
    return this.request<{ success: boolean; data: LibrarySettingItem[] }>('/admin/settings');
  }

  async updateSettings(settings: Record<string, string>) {
    return this.request<{ success: boolean; data: LibrarySettingItem[] }>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  async getAuditLogs(params: { action?: string; actorId?: string; page?: number; limit?: number } = {}) {
    const q = new URLSearchParams();
    if (params.action) q.append('action', params.action);
    if (params.actorId) q.append('actorId', params.actorId);
    if (params.page) q.append('page', params.page.toString());
    if (params.limit) q.append('limit', params.limit.toString());

    return this.request<{
      success: boolean;
      data: AuditLogItem[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/admin/audit-logs?${q.toString()}`);
  }
}

export const api = new ApiClient();
export default api;
