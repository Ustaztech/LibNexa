import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { User, Book, BorrowingRequest, Loan, Reservation, Category, NotificationItem } from '../types';

const extraUrl = (Constants.expoConfig as any)?.extra?.apiBaseUrl;
export const DEFAULT_API_URL = extraUrl || 'http://10.111.185.208:5000/api/v1';

class MobileApiClient {
  private baseUrl: string = DEFAULT_API_URL;

  constructor() {
    this.initBaseUrl();
  }

  private async initBaseUrl() {
    try {
      const stored = await AsyncStorage.getItem('libnexa_mobile_api_url');
      if (stored) {
        this.baseUrl = stored;
      }
    } catch {}
  }

  public async setBaseUrl(url: string) {
    this.baseUrl = url.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem('libnexa_mobile_api_url', this.baseUrl);
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const token = await AsyncStorage.getItem('libnexa_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = await this.getHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string>),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = data?.error?.message || data?.message || `HTTP Error ${response.status}`;
      throw new Error(msg);
    }

    if (data && data.success && data.data === undefined && Array.isArray(data.items)) {
      data.data = data.items;
    }

    return data;
  }

  // Auth
  async login(identifier: string, pass: string) {
    return this.request<{ success: boolean; data: { user: User; accessToken: string; refreshToken: string } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ identifier, password: pass }),
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

  // Books & Catalog
  async getBooks(params: { search?: string; categoryId?: string; availableOnly?: boolean } = {}) {
    const q = new URLSearchParams();
    if (params.search) q.append('search', params.search);
    if (params.categoryId && params.categoryId !== 'ALL') q.append('categoryId', params.categoryId);
    if (params.availableOnly) q.append('availableOnly', 'true');
    q.append('limit', '30');

    return this.request<{ success: boolean; data: Book[] }>(`/books?${q.toString()}`);
  }

  async getBookById(id: string) {
    return this.request<{ success: boolean; data: Book }>(`/books/${id}`);
  }

  async getCategories() {
    return this.request<{ success: boolean; data: Category[] }>('/books/meta/categories');
  }

  // Borrowing Requests
  async createBorrowRequest(bookId: string) {
    return this.request<{ success: boolean; data: BorrowingRequest }>('/borrowing-requests', {
      method: 'POST',
      body: JSON.stringify({ bookId }),
    });
  }

  async getMyRequests() {
    return this.request<{ success: boolean; data: BorrowingRequest[] }>('/borrowing-requests');
  }

  // Loans & Renewals
  async getMyLoans() {
    return this.request<{ success: boolean; data: Loan[] }>('/loans');
  }

  async requestRenewal(loanId: string, reason?: string) {
    return this.request<{ success: boolean; data: any }>('/renewals', {
      method: 'POST',
      body: JSON.stringify({ loanId, reason }),
    });
  }

  // Reservations
  async createReservation(bookId: string) {
    return this.request<{ success: boolean; data: Reservation }>('/reservations', {
      method: 'POST',
      body: JSON.stringify({ bookId }),
    });
  }

  async getMyReservations() {
    return this.request<{ success: boolean; data: Reservation[] }>('/reservations');
  }

  async cancelReservation(id: string) {
    return this.request<{ success: boolean; data: { message: string } }>(`/reservations/${id}/cancel`, {
      method: 'POST',
    });
  }

  // Notifications
  async getNotifications() {
    return this.request<{ success: boolean; data: NotificationItem[]; unreadCount: number }>('/notifications');
  }
}

export const api = new MobileApiClient();
export default api;
