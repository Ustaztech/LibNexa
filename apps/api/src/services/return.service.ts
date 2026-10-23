import prisma from '../db/prisma';
import { AppError } from '../middleware/errorHandler';
import { recordAuditLog } from './audit.service';
import { sendNotification } from './notification.service';
import { getSettingInt } from './setting.service';
import { notifyUsersOfBookAvailable } from './bookNotification.service';

export interface ProcessReturnInput {
  loanId: string;
  librarianId: string;
  condition?: 'NEW' | 'GOOD' | 'FAIR' | 'DAMAGED';
  notes?: string;
}

export const processBookReturn = async (input: ProcessReturnInput) => {
  const { loanId, librarianId, condition = 'GOOD', notes } = input;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Locate active loan
    const loan = await tx.loan.findUnique({
      where: { id: loanId },
      include: {
        bookCopy: { include: { book: true } },
        user: true,
      },
    });

    if (!loan) {
      throw new AppError('Loan record not found.', 404, 'NOT_FOUND');
    }

    if (loan.status === 'RETURNED') {
      throw new AppError('This book has already been marked as returned.', 400, 'ALREADY_RETURNED');
    }

    const now = new Date();
    const isOverdue = now > loan.dueAt;

    // 2. Mark Loan as RETURNED
    const updatedLoan = await tx.loan.update({
      where: { id: loanId },
      data: {
        status: 'RETURNED',
        returnedAt: now,
        returnCondition: condition,
        returnNotes: notes?.trim(),
        returnProcessedById: librarianId,
      },
      include: {
        bookCopy: { include: { book: true } },
        user: true,
      },
    });

    const bookId = loan.bookCopy.bookId;
    const copyId = loan.bookCopyId;

    // 3. Process Reservation Queue for this book (Section 11 & 12)
    const nextReservation = await tx.reservation.findFirst({
      where: {
        bookId,
        status: { in: ['PENDING', 'QUEUED'] },
      },
      orderBy: { queuePosition: 'asc' },
      include: { user: true },
    });

    let promotedReservation: any = null;

    if (nextReservation && condition !== 'DAMAGED') {
      const holdHours = await getSettingInt('reservation_collection_hours', 48);
      const expiresAt = new Date(Date.now() + holdHours * 60 * 60 * 1000);

      promotedReservation = await tx.reservation.update({
        where: { id: nextReservation.id },
        data: {
          status: 'READY_FOR_COLLECTION',
          assignedCopyId: copyId,
          availableAt: now,
          expiresAt,
        },
        include: { user: true },
      });

      // Update copy status to RESERVED
      await tx.bookCopy.update({
        where: { id: copyId },
        data: {
          status: 'RESERVED',
          condition,
        },
      });
    } else {
      // No reservation waiting; return to general stock or maintenance
      const newCopyStatus = condition === 'DAMAGED' ? 'UNDER_MAINTENANCE' : 'AVAILABLE';
      await tx.bookCopy.update({
        where: { id: copyId },
        data: {
          status: newCopyStatus,
          condition,
        },
      });
    }

    return { updatedLoan, loan, isOverdue, promotedReservation };
  }, { maxWait: 15000, timeout: 30000 });

  // Post-transaction notifications and audit logs
  if (result.promotedReservation) {
    const formattedExpires = result.promotedReservation.expiresAt.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    await sendNotification({
      userId: result.promotedReservation.userId,
      type: 'BOOK_AVAILABLE',
      title: 'Reserved Book Ready for Collection!',
      message: `A copy of "${result.loan.bookCopy.book.title}" is now available for your reservation. Please visit the library circulation desk by ${formattedExpires} to collect it.`,
      availabilityDetails: {
        title: result.loan.bookCopy.book.title,
        shelfLocation: result.loan.bookCopy.shelfLocation,
        accessionNumber: result.loan.bookCopy.accessionNumber,
        expiresAt: formattedExpires,
        isReservationPickup: true,
      },
    });
  } else if (condition !== 'DAMAGED') {
    // If returned to general stock as AVAILABLE, notify general subscribers
    notifyUsersOfBookAvailable(result.loan.bookCopy.bookId, result.loan.bookCopyId).catch((err: any) => {
      console.error('[AUTO EMAIL NOTIFICATION] Failed to notify availability on book return:', err.message);
    });
  }

  await recordAuditLog({
    actorId: librarianId,
    action: 'BOOK_RETURN_CONFIRMED',
    entityType: 'Loan',
    entityId: loanId,
    newValues: {
      accession: result.loan.bookCopy.accessionNumber,
      condition,
      wasOverdue: result.isOverdue,
    },
  });

  await sendNotification({
    userId: result.loan.userId,
    type: 'LOAN',
    title: 'Book Return Confirmed',
    message: `Your return of "${result.loan.bookCopy.book.title}" (Copy: ${result.loan.bookCopy.accessionNumber}) has been verified and confirmed by library staff. Thank you.`,
  });

  return result.updatedLoan;
};

export const getLoans = async (params: {
  status?: string;
  userId?: string;
  bookId?: string;
  search?: string;
  isOverdue?: boolean;
  page?: number;
  limit?: number;
}) => {
  const { status, userId, bookId, search, isOverdue, page = 1, limit = 20 } = params;
  const where: any = {};

  if (status && status !== 'ALL') where.status = status;
  if (userId) where.userId = userId;
  if (bookId) where.bookCopy = { bookId };
  if (isOverdue) {
    where.status = 'ACTIVE';
    where.dueAt = { lt: new Date() };
  }

  if (search) {
    where.OR = [
      { bookCopy: { book: { title: { contains: search } } } },
      { bookCopy: { accessionNumber: { contains: search } } },
      { user: { fullName: { contains: search } } },
      { user: { matricNumber: { contains: search } } },
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.loan.count({ where }),
    prisma.loan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { borrowedAt: 'desc' },
      include: {
        bookCopy: {
          include: {
            book: {
              select: {
                id: true,
                title: true,
                isbn: true,
                coverImageUrl: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            matricNumber: true,
            department: true,
            faculty: true,
            phone: true,
          },
        },
        processedBy: { select: { id: true, fullName: true } },
        returnProcessedBy: { select: { id: true, fullName: true } },
        renewals: { orderBy: { createdAt: 'desc' } },
      },
    }),
  ]);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
