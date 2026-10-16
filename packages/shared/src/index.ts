/**
 * LIBNEXA NSUK Shared Domain Model & Types
 * Shared across RESTful Backend API, Web Frontend, and React Native / Expo Mobile Apps.
 */

// User Roles & Account Status
export type UserRole = 'STUDENT' | 'LIBRARIAN' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'INACTIVE';

// Physical Book Copy Status & Condition
export type CopyStatus = 'AVAILABLE' | 'RESERVED' | 'ON_LOAN' | 'UNDER_MAINTENANCE' | 'LOST' | 'WITHDRAWN';
export type CopyCondition = 'NEW' | 'GOOD' | 'FAIR' | 'DAMAGED';

// Circulation Lifecycles
export type BorrowRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COLLECTED' | 'EXPIRED' | 'CANCELLED';
export type LoanStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'LOST';
export type ReservationStatus = 'PENDING' | 'QUEUED' | 'NOTIFIED' | 'COLLECTED' | 'CANCELLED' | 'EXPIRED';
export type RenewalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// Notification Categories
export type NotificationType = 'BORROW_REQUEST' | 'LOAN' | 'RESERVATION' | 'OVERDUE' | 'GENERAL';

// Shared User Interface
export interface SharedUser {
  id: string;
  fullName: string;
  email: string;
  matricNumber?: string | null;
  membershipNumber?: string | null;
  department?: string | null;
  faculty?: string | null;
  phone?: string | null;
  role: UserRole;
  accountStatus: AccountStatus;
  emailVerifiedAt?: string | null;
  createdAt: string;
}

// Shared Book Interface
export interface SharedBook {
  id: string;
  title: string;
  isbn: string;
  description: string;
  publisher?: string | null;
  publicationYear?: number | null;
  edition?: string | null;
  language: string;
  coverImageUrl?: string | null;
  authors: string[];
  categories: string[];
  totalCopies: number;
  availableCopies: number;
}

// System Policy Default Configuration
export const DEFAULT_LIBRARY_POLICIES = {
  loan_duration_days: 14,
  overdue_fine_daily_rate: 100, // NGN (Nigerian Naira)
  max_books_per_student: 3,
  max_renewals_per_loan: 2,
  renewal_extension_days: 7,
  reservation_hold_days: 3,
  grace_period_days: 2,
} as const;

// NSUK Academic Structure (Faculties & Departments)
export const NSUK_FACULTIES = [
  {
    name: 'Faculty of Natural & Applied Sciences',
    code: 'FNAS',
    departments: [
      'Computer Science',
      'Mathematics',
      'Physics',
      'Chemistry',
      'Biochemistry',
      'Microbiology',
      'Zoology',
      'Plant Science & Biotechnology',
      'Geology & Mining',
      'Statistics',
    ],
  },
  {
    name: 'Faculty of Social Sciences',
    code: 'FSS',
    departments: [
      'Economics',
      'Political Science',
      'Sociology',
      'Mass Communication',
      'Psychology',
    ],
  },
  {
    name: 'Faculty of Administration',
    code: 'FOA',
    departments: [
      'Accounting',
      'Business Administration',
      'Public Administration',
      'Banking & Finance',
    ],
  },
  {
    name: 'Faculty of Arts',
    code: 'ARTS',
    departments: [
      'English & Literary Studies',
      'History & International Studies',
      'Theatre & Cultural Studies',
      'Religious Studies',
      'French',
      'Arabic',
      'Philosophy',
    ],
  },
  {
    name: 'Faculty of Law',
    code: 'LAW',
    departments: [
      'Public & International Law',
      'Private & Business Law',
      'Islamic Law',
    ],
  },
  {
    name: 'Faculty of Agriculture',
    code: 'AGRIC',
    departments: [
      'Agronomy',
      'Animal Science',
      'Agricultural Economics & Extension',
      'Fisheries & Aquaculture',
      'Home Science & Management',
    ],
  },
  {
    name: 'Faculty of Education',
    code: 'EDU',
    departments: [
      'Educational Foundations',
      'Curriculum & Instruction',
      'Science, Technology & Mathematics Education',
      'Guidance & Counselling',
    ],
  },
  {
    name: 'Faculty of Environmental Science',
    code: 'FES',
    departments: [
      'Architecture',
      'Estate Management',
      'Urban & Regional Planning',
      'Geography',
    ],
  },
  {
    name: 'College of Health & Medical Sciences',
    code: 'CHMS',
    departments: [
      'Human Anatomy',
      'Human Physiology',
      'Medical Biochemistry',
      'Community Medicine',
      'Nursing Science',
    ],
  },
] as const;

// Utility functions
export function calculateFine(dueDate: Date | string, returnDate?: Date | string | null, dailyRate: number = 100, gracePeriod: number = 2): number {
  const due = new Date(dueDate).getTime();
  const returned = returnDate ? new Date(returnDate).getTime() : Date.now();
  if (returned <= due) return 0;

  const diffDays = Math.floor((returned - due) / (24 * 60 * 60 * 1000));
  if (diffDays <= gracePeriod) return 0;

  return (diffDays - gracePeriod) * dailyRate;
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}
