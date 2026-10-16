import prisma from '../db/prisma';
import { AppError } from '../middleware/errorHandler';
import { recordAuditLog } from './audit.service';
import { sendNotification } from './notification.service';
import { getSettingInt } from './setting.service';

export const requestBorrow = async (userId: string, bookId: string) => {
  // 1. Fetch borrowing policies
  const maxBooks = await getSettingInt('max_books_per_student', 3);
  const maxRequests = await getSettingInt('max_concurrent_requests', 2);

  // 2. Check student active loans count
  const activeLoansCount = await prisma.loan.count({
    where: { userId, status: 'ACTIVE' },
  });

  if (activeLoansCount >= maxBooks) {
    throw new AppError(
      `You have reached the maximum allowed limit of ${maxBooks} active borrowed book(s). Please return an item first.`,
      400,
      'LOAN_LIMIT_REACHED'
    );
  }

  // 3. Check for overdue loans restriction
  const hasOverdueLoans = await prisma.loan.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      dueAt: { lt: new Date() },
    },
  });

  if (hasOverdueLoans) {
    throw new AppError(
      'You currently have an overdue loan. Please return overdue library materials before requesting new books.',
      400,
      'OVERDUE_RESTRICTION'
    );
  }

  // 4. Check student concurrent pending/approved requests
  const pendingRequestsCount = await prisma.borrowingRequest.count({
    where: {
      userId,
      status: { in: ['PENDING', 'APPROVED'] },
    },
  });

  if (pendingRequestsCount >= maxRequests) {
    throw new AppError(
      `You have ${pendingRequestsCount} pending borrowing request(s). The maximum allowed concurrent requests is ${maxRequests}.`,
      400,
      'MAX_REQUESTS_REACHED'
    );
  }

  // 5. Check if user already has an active loan or pending request for this specific book
  const existingBookLoan = await prisma.loan.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      bookCopy: { bookId },
    },
  });

  if (existingBookLoan) {
    throw new AppError('You already have an active loan for a copy of this book.', 400, 'ALREADY_BORROWED');
  }

  const existingRequest = await prisma.borrowingRequest.findFirst({
    where: {
      userId,
      bookId,
      status: { in: ['PENDING', 'APPROVED'] },
    },
  });

  if (existingRequest) {
    throw new AppError('You already have an active borrowing request for this book.', 400, 'DUPLICATE_REQUEST');
  }

  // 6. Verify book existence and check available physical copies
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      copies: { where: { status: 'AVAILABLE' } },
    },
  });

  if (!book) {
    throw new AppError('Book not found in library catalogue.', 404, 'NOT_FOUND');
  }

  if (book.copies.length === 0) {
    throw new AppError(
      'No physical copies of this book are currently available for borrowing. You can reserve this title to join the queue.',
      400,
      'NO_COPIES_AVAILABLE'
    );
  }

  // 7. Create Borrowing Request
  const request = await prisma.borrowingRequest.create({
    data: {
      userId,
      bookId,
      status: 'PENDING',
      requestedAt: new Date(),
    },
    include: {
      book: true,
      user: { select: { id: true, fullName: true, matricNumber: true } },
    },
  });

  await recordAuditLog({
    actorId: userId,
    action: 'BORROW_REQUEST_CREATED',
    entityType: 'BorrowingRequest',
    entityId: request.id,
    newValues: { bookTitle: book.title, bookId },
  });

  await sendNotification({
    userId,
    type: 'BORROWING',
    title: 'Borrowing Request Submitted',
    message: `Your request to borrow "${book.title}" has been submitted. A librarian will review your request shortly.`,
  });

  return request;
};

export const getBorrowingRequests = async (params: {
  status?: string;
  userId?: string;
  bookId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const { status, userId, bookId, search, page = 1, limit = 20 } = params;
  const where: any = {};

  if (status && status !== 'ALL') where.status = status;
  if (userId) where.userId = userId;
  if (bookId) where.bookId = bookId;
  if (search) {
    where.OR = [
      { book: { title: { contains: search } } },
      { book: { isbn: { contains: search } } },
      { user: { fullName: { contains: search } } },
      { user: { matricNumber: { contains: search } } },
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.borrowingRequest.count({ where }),
    prisma.borrowingRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { requestedAt: 'desc' },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            isbn: true,
            coverImageUrl: true,
            copies: {
              where: { status: 'AVAILABLE' },
              select: { id: true, accessionNumber: true, shelfLocation: true },
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
        reviewedBy: {
          select: { id: true, fullName: true },
        },
        loan: true,
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

export const reviewBorrowingRequest = async (params: {
  requestId: string;
  librarianId: string;
  decision: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
  assignedCopyId?: string;
}) => {
  const { requestId, librarianId, decision, rejectionReason, assignedCopyId } = params;

  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.borrowingRequest.findUnique({
      where: { id: requestId },
      include: {
        book: { include: { copies: true } },
        user: true,
      },
    });

    if (!request) {
      throw new AppError('Borrowing request not found.', 404, 'NOT_FOUND');
    }

    if (request.status !== 'PENDING') {
      throw new AppError(`Cannot review a request with status ${request.status}.`, 400, 'INVALID_STATUS');
    }

    if (decision === 'REJECT') {
      const updated = await tx.borrowingRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          reviewedById: librarianId,
          reviewedAt: new Date(),
          rejectionReason: rejectionReason?.trim() || 'Request declined by librarian.',
        },
        include: { book: true, user: true },
      });

      return { type: 'REJECTED', updated, request };
    }

    // APPROVE WORKFLOW
    let copyToAssign: any = null;
    if (assignedCopyId) {
      copyToAssign = await tx.bookCopy.findUnique({
        where: { id: assignedCopyId },
      });
      if (!copyToAssign || copyToAssign.status !== 'AVAILABLE') {
        throw new AppError('Specified copy is not currently available.', 400, 'COPY_UNAVAILABLE');
      }
    } else {
      copyToAssign = await tx.bookCopy.findFirst({
        where: {
          bookId: request.bookId,
          status: 'AVAILABLE',
        },
      });
      if (!copyToAssign) {
        throw new AppError('No physical copies of this book are available to fulfill this approval.', 400, 'NO_AVAILABLE_COPY');
      }
    }

    // Reserve copy for collection
    await tx.bookCopy.update({
      where: { id: copyToAssign.id },
      data: { status: 'RESERVED' },
    });

    const deadlineHours = await getSettingInt('collection_deadline_hours', 48);
    const collectionDeadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);

    const updated = await tx.borrowingRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        assignedCopyId: copyToAssign.id,
        reviewedById: librarianId,
        reviewedAt: new Date(),
        collectionDeadline,
      },
      include: { book: true, user: true },
    });

    return { type: 'APPROVED', updated, request, copyToAssign, collectionDeadline };
  }, { maxWait: 15000, timeout: 30000 });

  // Post-transaction notifications and audit logs (Safe from DB lock contention)
  if (result.type === 'REJECTED') {
    await recordAuditLog({
      actorId: librarianId,
      action: 'BORROW_REQUEST_REJECTED',
      entityType: 'BorrowingRequest',
      entityId: requestId,
      newValues: { reason: result.updated.rejectionReason },
    });

    await sendNotification({
      userId: result.request.userId,
      type: 'BORROWING',
      title: 'Borrow Request Declined',
      message: `Your request to borrow "${result.request.book.title}" was declined. Reason: ${result.updated.rejectionReason}`,
    });
  } else if (result.type === 'APPROVED') {
    await recordAuditLog({
      actorId: librarianId,
      action: 'BORROW_REQUEST_APPROVED',
      entityType: 'BorrowingRequest',
      entityId: requestId,
      newValues: { assignedCopy: result.copyToAssign.accessionNumber, collectionDeadline: result.collectionDeadline },
    });

    const formattedDeadline = result.collectionDeadline!.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    await sendNotification({
      userId: result.request.userId,
      type: 'BORROWING',
      title: 'Borrow Request Approved! Ready for Collection',
      message: `Your request for "${result.request.book.title}" (Copy: ${result.copyToAssign.accessionNumber}) has been approved. Please collect it at the library circulation desk by ${formattedDeadline}.`,
    });
  }

  return result.updated;
};

export const confirmCollection = async (params: {
  requestId: string;
  librarianId: string;
}) => {
  const { requestId, librarianId } = params;

  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.borrowingRequest.findUnique({
      where: { id: requestId },
      include: {
        book: true,
        user: true,
      },
    });

    if (!request) {
      throw new AppError('Borrowing request not found.', 404, 'NOT_FOUND');
    }

    if (request.status !== 'APPROVED') {
      throw new AppError(`Cannot confirm collection for request with status: ${request.status}. It must be APPROVED.`, 400, 'INVALID_STATUS');
    }

    if (!request.assignedCopyId) {
      throw new AppError('No physical copy was assigned to this request.', 400, 'NO_ASSIGNED_COPY');
    }

    const copy = await tx.bookCopy.findUnique({
      where: { id: request.assignedCopyId },
    });

    if (!copy) {
      throw new AppError('Assigned physical copy record not found.', 404, 'COPY_NOT_FOUND');
    }

    // Standard loan duration in days
    const durationDays = await getSettingInt('standard_loan_duration_days', 14);
    const borrowedAt = new Date();
    const dueAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    // 1. Mark request as COLLECTED
    await tx.borrowingRequest.update({
      where: { id: requestId },
      data: { status: 'COLLECTED' },
    });

    // 2. Mark copy status as ON_LOAN
    await tx.bookCopy.update({
      where: { id: copy.id },
      data: { status: 'ON_LOAN' },
    });

    // 3. Create active Loan record
    const loan = await tx.loan.create({
      data: {
        borrowingRequestId: requestId,
        userId: request.userId,
        bookCopyId: copy.id,
        borrowedAt,
        dueAt,
        status: 'ACTIVE',
        processedById: librarianId,
      },
      include: {
        bookCopy: { include: { book: true } },
        user: true,
        processedBy: { select: { id: true, fullName: true } },
      },
    });

    return { loan, request, copy, dueAt };
  }, { maxWait: 15000, timeout: 30000 });

  // Post-transaction notifications and audit logs
  await recordAuditLog({
    actorId: librarianId,
    action: 'BOOK_COLLECTION_CONFIRMED',
    entityType: 'Loan',
    entityId: result.loan.id,
    newValues: {
      copyAccession: result.copy.accessionNumber,
      borrower: result.request.user.fullName,
      dueAt: result.dueAt,
    },
  });

  const formattedDue = result.dueAt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  await sendNotification({
    userId: result.request.userId,
    type: 'LOAN',
    title: 'Book Collection Confirmed — Active Loan',
    message: `You have successfully collected "${result.request.book.title}" (Copy: ${result.copy.accessionNumber}). Please return or renew this book on or before ${formattedDue}.`,
  });

  return result.loan;
};

