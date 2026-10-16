import prisma from '../db/prisma';
import { config } from '../config/env';

export interface SendNotificationParams {
  userId: string;
  type: 'BORROWING' | 'LOAN' | 'RESERVATION' | 'ACCOUNT' | 'SYSTEM';
  title: string;
  message: string;
  channel?: 'IN_APP' | 'EMAIL' | 'PUSH';
}

export const sendNotification = async (params: SendNotificationParams) => {
  const { userId, type, title, message, channel = 'IN_APP' } = params;

  // Retrieve user preferences
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  // Check if channel is enabled in user preferences
  if (pref) {
    if (channel === 'EMAIL' && !pref.emailEnabled) return null;
    if (channel === 'PUSH' && !pref.pushEnabled) return null;
  }

  let deliveryStatus = 'DELIVERED';
  if (channel === 'EMAIL') {
    deliveryStatus = config.smtp.isConfigured ? 'SENT' : 'SIMULATED';
  } else if (channel === 'PUSH') {
    deliveryStatus = config.firebase.isConfigured ? 'SENT' : 'SIMULATED';
  }

  // Create notification record
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
