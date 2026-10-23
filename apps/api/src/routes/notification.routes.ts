import { Router } from 'express';
import { z } from 'zod';
import * as notifService from '../services/notification.service';
import { runDueRemindersJob } from '../services/reminderScheduler';
import { authenticate, AuthenticatedRequest, requireStaff } from '../middleware/auth';
import prisma from '../db/prisma';
import { config } from '../config/env';
import { verifySmtpConnection, sendNotificationEmail } from '../services/email.service';

const router = Router();

const prefSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  reminderEnabled: z.boolean().optional(),
  newBookAlerts: z.boolean().optional(),
  bookAvailableAlerts: z.boolean().optional(),
});

// GET /notifications
router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const notifications = await notifService.getUserNotifications(req.user!.id);
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, readAt: null },
    });
    res.json({ success: true, data: notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

// PATCH /notifications/:id/read
router.patch('/:id/read', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    await notifService.markNotificationAsRead(req.params.id, req.user!.id);
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
});

// PATCH /notifications/read-all
router.patch('/read-all', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    await notifService.markAllNotificationsAsRead(req.user!.id);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
});

// GET /notifications/preferences
router.get('/preferences', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    let pref = await prisma.notificationPreference.findUnique({
      where: { userId: req.user!.id },
    });
    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: {
          userId: req.user!.id,
          emailEnabled: true,
          pushEnabled: true,
          reminderEnabled: true,
          newBookAlerts: true,
          bookAvailableAlerts: true,
        },
      });
    }
    res.json({ success: true, data: pref });
  } catch (err) {
    next(err);
  }
});

// PATCH /notifications/preferences
router.patch('/preferences', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = prefSchema.parse(req.body);
    const pref = await prisma.notificationPreference.upsert({
      where: { userId: req.user!.id },
      update: validated,
      create: {
        userId: req.user!.id,
        emailEnabled: validated.emailEnabled ?? true,
        pushEnabled: validated.pushEnabled ?? true,
        reminderEnabled: validated.reminderEnabled ?? true,
        newBookAlerts: validated.newBookAlerts ?? true,
        bookAvailableAlerts: validated.bookAvailableAlerts ?? true,
      },
    });
    res.json({ success: true, data: pref });
  } catch (err) {
    next(err);
  }
});

// POST /notifications/trigger-reminders (Staff manual trigger)
router.post('/trigger-reminders', authenticate, requireStaff, async (req, res, next) => {
  try {
    const result = await runDueRemindersJob();
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// GET /notifications/smtp-status
router.get('/smtp-status', authenticate, async (req, res, next) => {
  try {
    const connectionTest = await verifySmtpConnection();
    res.json({
      success: true,
      data: {
        isConfigured: config.smtp.isConfigured,
        host: config.smtp.host || 'Not set',
        port: config.smtp.port,
        from: config.smtp.from,
        connectionTest,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /notifications/test-email
router.post('/test-email', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user || !user.email) {
      return res.status(400).json({
        success: false,
        message: 'No registered email address found on your account.',
      });
    }

    const testPayload = {
      to: user.email,
      recipientName: user.fullName,
      type: 'SYSTEM' as const,
      title: 'LIBNEXA Email Notification Test',
      message: 'This is a test notification confirming that automated email push is active and configured for your LIBNEXA account.',
      actionUrl: config.appBaseUrl,
      actionLabel: 'Go to Library Dashboard',
    };

    const emailResult = await sendNotificationEmail(testPayload);

    // Also record it in the notification database table
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: testPayload.title,
        message: testPayload.message,
        channel: 'EMAIL',
        deliveryStatus: emailResult.success
          ? (emailResult.simulated ? 'SIMULATED' : 'SENT')
          : 'FAILED',
        sentAt: new Date(),
      },
    });

    res.json({
      success: emailResult.success,
      message: emailResult.simulated
        ? `Test notification simulated (Dev mode). Target: ${user.email}`
        : `Test notification successfully dispatched to ${user.email}`,
      data: {
        recipient: user.email,
        simulated: emailResult.simulated,
        messageId: emailResult.messageId,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
