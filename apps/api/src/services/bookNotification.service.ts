import prisma from '../db/prisma';
import { config } from '../config/env';
import { sendNotification } from './notification.service';
import { BookEmailDetails, AvailabilityEmailDetails } from './email.service';
import { getSettingInt } from './setting.service';
import { AppError } from '../middleware/errorHandler';

/**
 * Dispatches automated new-book email announcements to all eligible library members
 */
export const notifyUsersOfNewBook = async (bookId: string) => {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      authors: { include: { author: true } },
      categories: { include: { category: true } },
      copies: { take: 1 },
      publisher: true,
    },
  });

  if (!book) {
    console.warn(`[NEW BOOK NOTIFICATION] Book with ID ${bookId} not found.`);
    return { notifiedCount: 0, bookTitle: '' };
  }

  const authors = book.authors.map((a) => a.author.name);
  const categories = book.categories.map((c) => c.category.name);
  const primaryShelf = book.copies[0]?.shelfLocation || 'Main University Stacks';

  const bookDetails: BookEmailDetails = {
    title: book.title,
    isbn: book.isbn,
    authors,
    categories,
    shelfLocation: primaryShelf,
    edition: book.edition || undefined,
    publicationYear: book.publicationYear || undefined,
    description: book.description,
    coverImageUrl: book.coverImageUrl || undefined,
  };

  // Find all active library members whose notification preferences allow new book alerts
  const eligibleUsers = await prisma.user.findMany({
    where: {
      accountStatus: 'ACTIVE',
      email: { not: '' },
      OR: [
        { notificationPref: null },
        {
          notificationPref: {
            emailEnabled: true,
            newBookAlerts: true,
          },
        },
      ],
    },
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  });

  console.log(`[NEW BOOK NOTIFICATION] Found ${eligibleUsers.length} eligible members to notify for "${book.title}"`);

  let notifiedCount = 0;
  for (const user of eligibleUsers) {
    try {
      await sendNotification({
        userId: user.id,
        type: 'NEW_BOOK',
        title: `New Library Addition: "${book.title}"`,
        message: `A new book "${book.title}" by ${authors.join(', ') || 'Faculty Authors'} is now catalogued in the NSUK Library. Explore synopsis, locate shelf stacks, or submit an immediate borrowing request.`,
        actionUrl: `${config.appBaseUrl}`,
        actionLabel: 'View in Library Catalogue',
        bookDetails,
      });
      notifiedCount++;
    } catch (err: any) {
      console.error(`[NEW BOOK NOTIFICATION] Failed to dispatch alert to user ${user.id} (${user.email}):`, err.message);
    }
  }

  console.log(`[NEW BOOK NOTIFICATION] Dispatched ${notifiedCount} new book notifications for "${book.title}"`);
  return { notifiedCount, bookTitle: book.title };
};

/**
 * Automatically notifies waitlisted or subscribed users when copies of a book become available
 */
export const notifyUsersOfBookAvailable = async (bookId: string, copyId?: string) => {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      copies: true,
      authors: { include: { author: true } },
    },
  });

  if (!book) return { reservationsPromoted: 0, subscribersNotified: 0 };

  const availableCopies = book.copies.filter((c) => c.status === 'AVAILABLE');
  const targetCopy = copyId
    ? book.copies.find((c) => c.id === copyId)
    : availableCopies[0];

  let reservationsPromoted = 0;
  let assignedUserId: string | null = null;

  // 1. Check reservation waitlist queue first
  const nextReservation = await prisma.reservation.findFirst({
    where: {
      bookId,
      status: { in: ['PENDING', 'QUEUED'] },
    },
    orderBy: { queuePosition: 'asc' },
    include: { user: true },
  });

  if (nextReservation && targetCopy) {
    const holdHours = await getSettingInt('reservation_collection_hours', 48);
    const expiresAt = new Date(Date.now() + holdHours * 60 * 60 * 1000);
    const formattedExpires = expiresAt.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Promote reservation to READY_FOR_COLLECTION
    await prisma.reservation.update({
      where: { id: nextReservation.id },
      data: {
        status: 'READY_FOR_COLLECTION',
        assignedCopyId: targetCopy.id,
        availableAt: new Date(),
        expiresAt,
      },
    });

    // Mark copy RESERVED
    await prisma.bookCopy.update({
      where: { id: targetCopy.id },
      data: { status: 'RESERVED' },
    });

    // Re-adjust remaining reservation positions
    const remaining = await prisma.reservation.findMany({
      where: {
        bookId,
        status: { in: ['PENDING', 'QUEUED'] },
      },
      orderBy: { queuePosition: 'asc' },
    });

    for (let i = 0; i < remaining.length; i++) {
      await prisma.reservation.update({
        where: { id: remaining[i].id },
        data: { queuePosition: i + 1 },
      });
    }

    // Send high-priority pickup email to the waitlist holder
    await sendNotification({
      userId: nextReservation.userId,
      type: 'BOOK_AVAILABLE',
      title: `Reserved Book Ready for Collection: "${book.title}"`,
      message: `Great news! A physical copy of "${book.title}" has been assigned to your reservation. It is placed on the reservation hold shelf at the Circulation Desk. Please collect it before ${formattedExpires}.`,
      actionUrl: `${config.appBaseUrl}`,
      actionLabel: 'View My Reservations',
      availabilityDetails: {
        title: book.title,
        shelfLocation: targetCopy.shelfLocation,
        accessionNumber: targetCopy.accessionNumber,
        expiresAt: formattedExpires,
        isReservationPickup: true,
      },
    });

    reservationsPromoted = 1;
    assignedUserId = nextReservation.userId;
  }

  // 2. Check general availability subscribers (if there are remaining available copies or for future checkouts)
  const remainingAvailable = await prisma.bookCopy.count({
    where: { bookId, status: 'AVAILABLE' },
  });

  let subscribersNotified = 0;
  if (remainingAvailable > 0) {
    const subscriptions = await prisma.bookAvailabilitySubscription.findMany({
      where: {
        bookId,
        status: 'ACTIVE',
        userId: { not: assignedUserId || '' },
      },
      include: {
        user: { include: { notificationPref: true } },
      },
    });

    for (const sub of subscriptions) {
      try {
        await sendNotification({
          userId: sub.userId,
          type: 'BOOK_AVAILABLE',
          title: `Book Now Available: "${book.title}"`,
          message: `Good news! "${book.title}" is now back in stock with ${remainingAvailable} cop${remainingAvailable === 1 ? 'y' : 'ies'} available on shelf. Visit the library or submit your online borrow request before stock runs out!`,
          actionUrl: `${config.appBaseUrl}`,
          actionLabel: 'Borrow / View Book',
          availabilityDetails: {
            title: book.title,
            shelfLocation: targetCopy?.shelfLocation || 'Library Stacks',
            availableCopies: remainingAvailable,
            isReservationPickup: false,
          },
        });

        // Mark subscription NOTIFIED
        await prisma.bookAvailabilitySubscription.update({
          where: { id: sub.id },
          data: {
            status: 'NOTIFIED',
            notifiedAt: new Date(),
          },
        });

        subscribersNotified++;
      } catch (err: any) {
        console.error(`[BOOK AVAILABLE NOTIFICATION] Failed to notify subscriber ${sub.userId}:`, err.message);
      }
    }
  }

  return { reservationsPromoted, subscribersNotified };
};

/**
 * Allows a student to subscribe to automated email notifications for an unavailable book
 */
export const subscribeToBookAvailability = async (userId: string, bookId: string) => {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
  });

  if (!book) {
    throw new AppError('Book record not found.', 404, 'NOT_FOUND');
  }

  const subscription = await prisma.bookAvailabilitySubscription.upsert({
    where: {
      userId_bookId: { userId, bookId },
    },
    update: {
      status: 'ACTIVE',
      notifiedAt: null,
    },
    create: {
      userId,
      bookId,
      status: 'ACTIVE',
    },
  });

  // Dispatch confirmation
  await sendNotification({
    userId,
    type: 'SYSTEM',
    title: `Subscribed to Availability Alert: "${book.title}"`,
    message: `You are now subscribed to receive an automated email as soon as copies of "${book.title}" become available in the library.`,
    skipEmail: false,
  });

  return subscription;
};

/**
 * Unsubscribes a student from availability alerts for a book
 */
export const unsubscribeFromBookAvailability = async (userId: string, bookId: string) => {
  const existing = await prisma.bookAvailabilitySubscription.findUnique({
    where: { userId_bookId: { userId, bookId } },
  });

  if (!existing) {
    return { message: 'Not subscribed.' };
  }

  await prisma.bookAvailabilitySubscription.update({
    where: { id: existing.id },
    data: { status: 'CANCELLED' },
  });

  return { message: 'Successfully unsubscribed from book availability alerts.' };
};

/**
 * Retrieves subscription status of a user for a specific book
 */
export const getBookSubscriptionStatus = async (userId: string, bookId: string) => {
  const sub = await prisma.bookAvailabilitySubscription.findUnique({
    where: { userId_bookId: { userId, bookId } },
  });

  return {
    isSubscribed: sub?.status === 'ACTIVE',
    subscription: sub,
  };
};

/**
 * Retrieves all active book availability subscriptions for a user
 */
export const getUserBookSubscriptions = async (userId: string) => {
  return prisma.bookAvailabilitySubscription.findMany({
    where: { userId, status: 'ACTIVE' },
    include: {
      book: {
        select: {
          id: true,
          title: true,
          isbn: true,
          coverImageUrl: true,
          copies: {
            select: { status: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};
