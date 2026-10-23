export type UserRole = 'STUDENT' | 'LIBRARIAN' | 'ADMIN';

export interface User {
  id: string;
  fullName: string;
  email: string;
  matricNumber?: string;
  membershipNumber?: string;
  department?: string;
  faculty?: string;
  phone?: string;
  role: UserRole;
  accountStatus: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'INACTIVE';
  emailVerifiedAt?: string;
  mustChangePassword?: boolean;
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  isbn: string;
  description: string;
  publisher?: string | { id: string; name: string };
  publicationYear?: number;
  edition?: string;
  language?: string;
  coverImageUrl?: string;
  authors: string[] | Array<{ id: string; name: string }>;
  categories: string[] | Array<{ id: string; name: string; description?: string }>;
  shelfLocation?: string;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  reservedCopies: number;
  activeReservations?: number;
  copies?: BookCopy[];
  createdAt: string;
}

export interface BookCopy {
  id: string;
  bookId: string;
  accessionNumber: string;
  barcode?: string;
  shelfLocation: string;
  condition: 'NEW' | 'GOOD' | 'FAIR' | 'DAMAGED';
  status: 'AVAILABLE' | 'RESERVED' | 'ON_LOAN' | 'UNDER_MAINTENANCE' | 'LOST' | 'WITHDRAWN';
  acquisitionDate?: string;
  book?: {
    id: string;
    title: string;
    isbn: string;
    coverImageUrl?: string;
  };
  loans?: Loan[];
}

export interface BorrowingRequest {
  id: string;
  userId: string;
  bookId: string;
  assignedCopyId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COLLECTED' | 'EXPIRED' | 'CANCELLED';
  requestedAt: string;
  reviewedById?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  collectionDeadline?: string;
  book: Book;
  user: User;
  reviewedBy?: { id: string; fullName: string };
  loan?: Loan;
}

export interface Loan {
  id: string;
  borrowingRequestId?: string;
  userId: string;
  bookCopyId: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt?: string;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE';
  returnCondition?: string;
  returnNotes?: string;
  processedById?: string;
  returnProcessedById?: string;
  bookCopy: BookCopy;
  user: User;
  processedBy?: { id: string; fullName: string };
  returnProcessedBy?: { id: string; fullName: string };
  renewals?: Renewal[];
}

export interface Reservation {
  id: string;
  userId: string;
  bookId: string;
  assignedCopyId?: string;
  queuePosition: number;
  status: 'PENDING' | 'QUEUED' | 'READY_FOR_COLLECTION' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';
  reservedAt: string;
  availableAt?: string;
  expiresAt?: string;
  fulfilledAt?: string;
  book: Book;
  user: User;
  assignedCopy?: {
    id: string;
    accessionNumber: string;
    shelfLocation: string;
  };
}

export interface Renewal {
  id: string;
  loanId: string;
  requestedById: string;
  reviewedById?: string;
  oldDueAt: string;
  newDueAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  loan?: Loan;
  requestedBy?: User;
  reviewedBy?: User;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'BORROWING' | 'LOAN' | 'RESERVATION' | 'ACCOUNT' | 'SYSTEM' | 'NEW_BOOK' | 'BOOK_AVAILABLE';
  title: string;
  message: string;
  channel: 'IN_APP' | 'EMAIL' | 'PUSH';
  deliveryStatus: 'DELIVERED' | 'SENT' | 'FAILED' | 'SIMULATED';
  readAt?: string;
  sentAt: string;
  createdAt: string;
}

export interface NotificationPreferences {
  id?: string;
  userId?: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  reminderEnabled: boolean;
  newBookAlerts: boolean;
  bookAvailableAlerts: boolean;
}

export interface BookAvailabilitySubscription {
  id: string;
  userId: string;
  bookId: string;
  status: 'ACTIVE' | 'NOTIFIED' | 'CANCELLED';
  notifiedAt?: string;
  createdAt: string;
  book?: Book;
}

export interface LibrarySettingItem {
  id: string;
  settingKey: string;
  settingValue: string;
  description?: string;
  updatedAt: string;
}

export interface AuditLogItem {
  id: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
  createdAt: string;
  actor?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  _count?: { books: number };
}

export interface Author {
  id: string;
  name: string;
  bio?: string;
  _count?: { books: number };
}

export interface SystemOverviewStats {
  users: {
    totalStudents: number;
    totalLibrarians: number;
    totalMembers: number;
  };
  inventory: {
    totalTitles: number;
    totalCopies: number;
    availableCopies: number;
    borrowedCopies: number;
    maintenanceCopies: number;
  };
  circulation: {
    pendingRequests: number;
    activeLoans: number;
    overdueLoans: number;
    activeReservations: number;
    completedReturns: number;
  };
}

export interface AnalyticsChartsData {
  mostBorrowed: Array<{ title: string; count: number }>;
  categoryDistribution: Array<{ name: string; count: number }>;
  monthlyData: Array<{ month: string; borrowed: number; returned: number }>;
  overdueBreakdown: {
    onTime: number;
    overdue1to7: number;
    overdue8to14: number;
    overdue15plus: number;
  };
}
