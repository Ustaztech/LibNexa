import prisma from '../db/prisma';
import { config } from '../config/env';
import { sendNotificationEmail, EmailResult, BookEmailDetails, AvailabilityEmailDetails } from './email.service';

export interface SendNotificationParams {
  userId: string;
  type: 'BORROWING' | 'LOAN' | 'RESERVATION' | 'ACCOUNT' | 'SYSTEM' | 'NEW_BOOK' | 'BOOK_AVAILABLE';
  title: string;
  message: string;
  channel?: 'IN_APP' | 'EMAIL' | 'PUSH';
  skipEmail?: boolean;
  actionUrl?: string;
  actionLabel?: string;
  bookDetails?: BookEmailDetails;
  availabilityDetails?: AvailabilityEmailDetails;
}

export const sendNotification = async (params: SendNotificationParams) => {
  const {
    userId,
    type,
    title,
    message,
    channel = 'IN_APP',
    skipEmail = false,
    actionUrl,
    actionLabel,
    bookDetails,
    availabilityDetails,
  } = params;

  // Retrieve user with notification preferences
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { notificationPref: true },
  });

  const pref = user?.notificationPref;

  // Check if channel is specifically disabled in user preferences
  if (pref) {
    if (channel === 'EMAIL' && !pref.emailEnabled) return null;
    if (channel === 'PUSH' && !pref.pushEnabled) return null;
    if (type === 'NEW_BOOK' && (!pref.emailEnabled || pref.newBookAlerts === false)) return null;
    if (type === 'BOOK_AVAILABLE' && (!pref.emailEnabled || pref.bookAvailableAlerts === false)) return null;
  }

  let deliveryStatus = 'DELIVERED';
  let emailResult: EmailResult | null = null;

  // If the explicit channel is EMAIL, attempt delivery immediately
  if (channel === 'EMAIL') {
    if (user?.email) {
      emailResult = await sendNotificationEmail({
        to: user.email,
        recipientName: user.fullName,
        type,
        title,
        message,
        actionUrl: actionUrl || `${config.appBaseUrl}`,
        actionLabel,
        bookDetails,
        availabilityDetails,
      });
      deliveryStatus = emailResult.success
        ? (emailResult.simulated ? 'SIMULATED' : 'SENT')
        : 'FAILED';
    } else {
      deliveryStatus = 'FAILED';
    }
  } else if (channel === 'PUSH') {
    deliveryStatus = config.firebase.isConfigured ? 'SENT' : 'SIMULATED';
  }

  // Create notification record in database
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      channel,
      deliveryStatus,
      sentAt: new Date(),
    },
  });

  // AUTOMATIC EMAIL PUSH:
  // When an IN_APP notification is dispatched, automatically push to email if:
  // 1. User has an email address
  // 2. Email notifications are enabled in user preferences (default: true)
  // 3. For LOAN due reminders, reminder notifications are enabled in user preferences (default: true)
  // 4. For NEW_BOOK notifications, newBookAlerts is enabled (default: true)
  // 5. For BOOK_AVAILABLE notifications, bookAvailableAlerts is enabled (default: true)
  // 6. skipEmail is not set to true
  if (channel === 'IN_APP' && !skipEmail && user?.email) {
    const isEmailEnabled = pref ? pref.emailEnabled : true;
    const isReminderEnabled = pref ? pref.reminderEnabled : true;
    const isNewBookEnabled = pref ? pref.newBookAlerts !== false : true;
    const isBookAvailableEnabled = pref ? pref.bookAvailableAlerts !== false : true;

    let isEligible = isEmailEnabled;
    if (type === 'LOAN') isEligible = isEligible && isReminderEnabled;
    if (type === 'NEW_BOOK') isEligible = isEligible && isNewBookEnabled;
    if (type === 'BOOK_AVAILABLE') isEligible = isEligible && isBookAvailableEnabled;

    if (isEligible) {
      sendNotificationEmail({
        to: user.email,
        recipientName: user.fullName,
        type,
        title,
        message,
        actionUrl: actionUrl || `${config.appBaseUrl}`,
        actionLabel,
        bookDetails,
        availabilityDetails,
      }).catch((err: any) => {
        console.error(`[AUTOMATIC EMAIL PUSH ERROR] Failed to push email to ${user.email}:`, err.message);
      });
    }
  }

  return notification;
};

export const markNotificationAsRead = async (notificationId: string, userId: string) => {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
};

export const markAllNotificationsAsRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
};

export const getUserNotifications = async (userId: string, limit = 50) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
};
