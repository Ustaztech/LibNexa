import prisma from '../db/prisma';
import { AppError } from '../middleware/errorHandler';
import { recordAuditLog } from './audit.service';
import { sendNotification } from './notification.service';
import { getSettingInt } from './setting.service';

export const requestLoanRenewal = async (loanId: string, userId: string, reason?: string) => {
  const result = await prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({
      where: { id: loanId },
      include: {
        bookCopy: { include: { book: true } },
        renewals: true,
      },
    });

    if (!loan) {
      throw new AppError('Active loan not found.', 404, 'NOT_FOUND');
    }

    if (loan.userId !== userId) {
      throw new AppError('You are not authorized to renew this loan.', 403, 'FORBIDDEN');
    }

    if (loan.status !== 'ACTIVE') {
      throw new AppError(`Cannot renew a loan with status ${loan.status}.`, 400, 'LOAN_NOT_ACTIVE');
    }

    // 1. Check max renewals limit
    const maxRenewals = await getSettingInt('max_renewals_per_loan', 2);
    const approvedRenewalsCount = loan.renewals.filter(r => r.status === 'APPROVED').length;
    if (approvedRenewalsCount >= maxRenewals) {
      throw new AppError(
        `This loan has already been renewed ${approvedRenewalsCount} time(s). The maximum allowed renewal limit is ${maxRenewals}.`,
        400,
        'MAX_RENEWALS_REACHED'
      );
    }

    // Check if there is already a pending renewal for this loan
    const pendingRenewal = loan.renewals.find(r => r.status === 'PENDING');
    if (pendingRenewal) {
      throw new AppError('You already have a pending renewal request under review for this loan.', 400, 'DUPLICATE_RENEWAL');
    }

    // 2. Check outstanding reservations for this book title
    const hasReservations = await tx.reservation.count({
      where: {
        bookId: loan.bookCopy.bookId,
        status: { in: ['PENDING', 'QUEUED'] },
      },
    });

    if (hasReservations > 0) {
      throw new AppError(
        'Loan cannot be renewed because other students have reserved this title and are waiting in the queue. Please return the book by the current due date.',
        400,
        'TITLE_RESERVED_BY_OTHERS'
      );
    }

    const extensionDays = await getSettingInt('renewal_extension_days', 7);
    const oldDueAt = loan.dueAt;
    const newDueAt = new Date(oldDueAt.getTime() + extensionDays * 24 * 60 * 60 * 1000);

    const renewal = await tx.renewal.create({
      data: {
        loanId,
        requestedById: userId,
        oldDueAt,
        newDueAt,
        status: 'PENDING',
        reason: reason?.trim(),
      },
      include: {
        loan: {
          include: {
            bookCopy: { include: { book: true } },
          },
        },
      },
    });

    return { renewal, loan, newDueAt };
  }, { maxWait: 15000, timeout: 30000 });

  await recordAuditLog({
    actorId: userId,
    action: 'RENEWAL_REQUESTED',
    entityType: 'Renewal',
    entityId: result.renewal.id,
    newValues: { bookTitle: result.loan.bookCopy.book.title, proposedDueAt: result.newDueAt },
  });

  await sendNotification({
    userId,
    type: 'LOAN',
    title: 'Renewal Request Submitted',
    message: `Your loan extension request for "${result.loan.bookCopy.book.title}" has been submitted for librarian review.`,
  });

  return result.renewal;
};

export const reviewRenewal = async (params: {
  renewalId: string;
  librarianId: string;
  decision: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}) => {
  const { renewalId, librarianId, decision, rejectionReason } = params;

  const result = await prisma.$transaction(async (tx) => {
    const renewal = await tx.renewal.findUnique({
      where: { id: renewalId },
      include: {
        loan: {
          include: {
            bookCopy: { include: { book: true } },
            user: true,
          },
        },
      },
    });

    if (!renewal) {
      throw new AppError('Renewal request not found.', 404, 'NOT_FOUND');
    }

    if (renewal.status !== 'PENDING') {
      throw new AppError(`Cannot review a renewal with status ${renewal.status}.`, 400, 'INVALID_STATUS');
    }

    const now = new Date();

    if (decision === 'REJECT') {
      const updated = await tx.renewal.update({
        where: { id: renewalId },
        data: {
          status: 'REJECTED',
          reviewedById: librarianId,
          reviewedAt: now,
          rejectionReason: rejectionReason?.trim() || 'Renewal declined by librarian.',
        },
      });

      return { type: 'REJECTED', updated, renewal };
    }

    // APPROVE
    // Update loan due date
    await tx.loan.update({
      where: { id: renewal.loanId },
      data: {
        dueAt: renewal.newDueAt,
      },
    });

    const updated = await tx.renewal.update({
      where: { id: renewalId },
      data: {
        status: 'APPROVED',
        reviewedById: librarianId,
        reviewedAt: now,
      },
    });

    return { type: 'APPROVED', updated, renewal };
  }, { maxWait: 15000, timeout: 30000 });

  if (result.type === 'REJECTED') {
    await recordAuditLog({
      actorId: librarianId,
      action: 'RENEWAL_REJECTED',
      entityType: 'Renewal',
      entityId: renewalId,
      newValues: { reason: result.updated.rejectionReason },
    });

    await sendNotification({
      userId: result.renewal.loan.userId,
      type: 'LOAN',
      title: 'Loan Renewal Declined',
      message: `Your renewal request for "${result.renewal.loan.bookCopy.book.title}" was declined. Reason: ${result.updated.rejectionReason}`,
    });
  } else if (result.type === 'APPROVED') {
    await recordAuditLog({
      actorId: librarianId,
      action: 'RENEWAL_APPROVED',
      entityType: 'Renewal',
      entityId: renewalId,
      newValues: { oldDue: result.renewal.oldDueAt, newDue: result.renewal.newDueAt },
    });

    const formattedDue = result.renewal.newDueAt.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    await sendNotification({
      userId: result.renewal.loan.userId,
      type: 'LOAN',
      title: 'Loan Renewal Approved!',
      message: `Your loan extension for "${result.renewal.loan.bookCopy.book.title}" was approved. Your new return deadline is ${formattedDue}.`,
    });
  }

  return result.updated;
};

export const getRenewals = async (params: {
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const { userId, status, page = 1, limit = 20 } = params;
  const where: any = {};
  if (userId) where.requestedById = userId;
  if (status && status !== 'ALL') where.status = status;

  const skip = (Math.max(1, page) - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.renewal.count({ where }),
    prisma.renewal.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        loan: {
          include: {
            bookCopy: { include: { book: true } },
            user: { select: { id: true, fullName: true, matricNumber: true } },
          },
        },
        requestedBy: { select: { id: true, fullName: true, matricNumber: true } },
        reviewedBy: { select: { id: true, fullName: true } },
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
