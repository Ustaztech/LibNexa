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
  categories: string[] | Array<{ id: string; name: string }>;
  shelfLocation?: string;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  reservedCopies: number;
  activeReservations?: number;
  copies?: BookCopy[];
  createdAt: string;
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
}

export interface Loan {
  id: string;
  userId: string;
  bookCopyId: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt?: string;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE';
  returnCondition?: string;
  returnNotes?: string;
  bookCopy: BookCopy & { book: Book };
  user: User;
}

export interface Reservation {
  id: string;
  userId: string;
  bookId: string;
  queuePosition: number;
  status: 'PENDING' | 'QUEUED' | 'READY_FOR_COLLECTION' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';
  reservedAt: string;
  availableAt?: string;
  expiresAt?: string;
  book: Book;
  user: User;
  assignedCopy?: {
    id: string;
    accessionNumber: string;
    shelfLocation: string;
  };
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  _count?: { books: number };
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'BORROWING' | 'LOAN' | 'RESERVATION' | 'ACCOUNT' | 'SYSTEM';
  title: string;
  message: string;
  channel: 'IN_APP' | 'EMAIL' | 'PUSH';
  deliveryStatus: string;
  readAt?: string;
  createdAt: string;
}
