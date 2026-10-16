import { Router } from 'express';
import { z } from 'zod';
import * as notifService from '../services/notification.service';
import { runDueRemindersJob } from '../services/reminderScheduler';
import { authenticate, AuthenticatedRequest, requireStaff } from '../middleware/auth';
import prisma from '../db/prisma';

const router = Router();

const prefSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  reminderEnabled: z.boolean().optional(),
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

export default router;
