import prisma from '../db/prisma';
import { AppError } from '../middleware/errorHandler';
import { recordAuditLog } from './audit.service';
import { sendNotification } from './notification.service';
import { getSettingInt } from './setting.service';

export const createReservation = async (userId: string, bookId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    const book = await tx.book.findUnique({
      where: { id: bookId },
      include: {
        copies: true,
      },
    });

    if (!book) {
      throw new AppError('Book not found.', 404, 'NOT_FOUND');
    }

    // Check if copies are actually available
    const availableCopies = book.copies.filter(c => c.status === 'AVAILABLE');
    if (availableCopies.length > 0) {
      throw new AppError(
        'Copies of this book are currently available for immediate borrowing. Please submit a borrowing request instead.',
        400,
        'COPIES_AVAILABLE_FOR_BORROW'
      );
    }

    // Check if user already has active reservation
    const existingRes = await tx.reservation.findFirst({
      where: {
        userId,
        bookId,
        status: { in: ['PENDING', 'QUEUED', 'READY_FOR_COLLECTION'] },
      },
    });

    if (existingRes) {
      throw new AppError('You already have an active reservation in the queue for this book.', 400, 'DUPLICATE_RESERVATION');
    }

    // Check if user already has an active loan of this book
    const existingLoan = await tx.loan.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        bookCopy: { bookId },
      },
    });

    if (existingLoan) {
      throw new AppError('You currently have an active loan for this book.', 400, 'ALREADY_BORROWED');
    }

    // Calculate queue position
    const activeReservationsCount = await tx.reservation.count({
      where: {
        bookId,
        status: { in: ['PENDING', 'QUEUED', 'READY_FOR_COLLECTION'] },
      },
    });

    const queuePosition = activeReservationsCount + 1;

    const reservation = await tx.reservation.create({
      data: {
        userId,
        bookId,
        queuePosition,
        status: 'QUEUED',
        reservedAt: new Date(),
      },
      include: {
        book: true,
        user: { select: { id: true, fullName: true, matricNumber: true } },
      },
    });

    return { reservation, book, queuePosition };
  }, { maxWait: 15000, timeout: 30000 });

  await recordAuditLog({
    actorId: userId,
    action: 'BOOK_RESERVED',
    entityType: 'Reservation',
    entityId: result.reservation.id,
    newValues: { bookTitle: result.book.title, queuePosition: result.queuePosition },
  });

  await sendNotification({
    userId,
    type: 'RESERVATION',
    title: 'Reservation Confirmed',
    message: `You have successfully reserved "${result.book.title}". Your current queue position is #${result.queuePosition}. We will notify you when a copy becomes available.`,
  });

  return result.reservation;
};

export const cancelReservation = async (reservationId: string, userId: string, isStaff = false) => {
  const result = await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id: reservationId },
      include: { book: true },
    });

    if (!reservation) {
      throw new AppError('Reservation not found.', 404, 'NOT_FOUND');
    }

    if (!isStaff && reservation.userId !== userId) {
      throw new AppError('You are not authorized to cancel this reservation.', 403, 'FORBIDDEN');
    }

    if (!['PENDING', 'QUEUED', 'READY_FOR_COLLECTION'].includes(reservation.status)) {
      throw new AppError(`Cannot cancel reservation with status ${reservation.status}.`, 400, 'INVALID_STATUS');
    }

    const assignedCopyId = reservation.assignedCopyId;
    const bookId = reservation.bookId;

    // Mark reservation CANCELLED
    await tx.reservation.update({
      where: { id: reservationId },
      data: { status: 'CANCELLED' },
    });

    let promotedNext: any = null;

    // If a physical copy was held for this student, reassign to next in line or release to AVAILABLE
    if (assignedCopyId) {
      const nextReservation = await tx.reservation.findFirst({
        where: {
          bookId,
          status: { in: ['PENDING', 'QUEUED'] },
        },
        orderBy: { queuePosition: 'asc' },
      });

      if (nextReservation) {
        const holdHours = await getSettingInt('reservation_collection_hours', 48);
        const expiresAt = new Date(Date.now() + holdHours * 60 * 60 * 1000);

        promotedNext = await tx.reservation.update({
          where: { id: nextReservation.id },
          data: {
            status: 'READY_FOR_COLLECTION',
            assignedCopyId,
            availableAt: new Date(),
            expiresAt,
          },
        });
      } else {
        await tx.bookCopy.update({
          where: { id: assignedCopyId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    // Re-adjust queue positions for other queued users
    const remaining = await tx.reservation.findMany({
      where: {
        bookId,
        status: { in: ['PENDING', 'QUEUED'] },
      },
      orderBy: { queuePosition: 'asc' },
    });

    for (let i = 0; i < remaining.length; i++) {
      await tx.reservation.update({
        where: { id: remaining[i].id },
        data: { queuePosition: i + 1 },
      });
    }

    return { reservation, promotedNext };
  }, { maxWait: 15000, timeout: 30000 });

  if (result.promotedNext) {
    await sendNotification({
      userId: result.promotedNext.userId,
      type: 'RESERVATION',
      title: 'Reserved Book Ready for Collection!',
      message: `A copy of "${result.reservation.book.title}" is now ready for your reservation collection.`,
    });
  }

  await recordAuditLog({
    actorId: userId,
    action: 'RESERVATION_CANCELLED',
    entityType: 'Reservation',
    entityId: reservationId,
  });

  return { message: 'Reservation cancelled successfully.' };
};

export const getReservations = async (params: {
  userId?: string;
  bookId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const { userId, bookId, status, search, page = 1, limit = 20 } = params;
  const where: any = {};

  if (userId) where.userId = userId;
  if (bookId) where.bookId = bookId;
  if (status && status !== 'ALL') where.status = status;
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
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ bookId: 'asc' }, { queuePosition: 'asc' }],
      include: {
        book: {
          select: {
            id: true,
            title: true,
            isbn: true,
            coverImageUrl: true,
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
        assignedCopy: {
          select: {
            id: true,
            accessionNumber: true,
            shelfLocation: true,
          },
        },
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
