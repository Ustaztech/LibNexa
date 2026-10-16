import cron from 'node-cron';
import prisma from '../db/prisma';
import { sendNotification } from './notification.service';
import { getSetting } from './setting.service';

export const runDueRemindersJob = async (): Promise<{ remindersSent: number }> => {
  console.log('[REMINDER JOB] Running automated due-date reminder check...');
  const scheduleSetting = await getSetting('reminder_schedule_days');
  const reminderDays = scheduleSetting
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n));

  const now = new Date();
  let remindersSent = 0;

  // Active loans
  const activeLoans = await prisma.loan.findMany({
    where: { status: 'ACTIVE' },
    include: {
      bookCopy: { include: { book: true } },
      user: true,
    },
  });

  for (const loan of activeLoans) {
    const dueDate = new Date(loan.dueAt);
    // Difference in whole days
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Check if diffDays matches any reminder interval (or is negative -> overdue)
    let title = '';
    let message = '';
    let triggerType = '';

    if (diffDays === 3 && reminderDays.includes(3)) {
      triggerType = 'DUE_IN_3_DAYS';
      title = 'Reminder: Book Due in 3 Days';
      message = `Your borrowed book "${loan.bookCopy.book.title}" (Copy: ${loan.bookCopy.accessionNumber}) is due in 3 days.`;
    } else if (diffDays === 1 && reminderDays.includes(1)) {
      triggerType = 'DUE_TOMORROW';
      title = 'Urgent Reminder: Book Due Tomorrow';
      message = `Your borrowed book "${loan.bookCopy.book.title}" is due tomorrow. Please return or submit a renewal request.`;
    } else if (diffDays === 0 && reminderDays.includes(0)) {
      triggerType = 'DUE_TODAY';
      title = 'Action Required: Book Due Today';
      message = `Your borrowed book "${loan.bookCopy.book.title}" is due today. Please return it to the circulation desk.`;
    } else if (diffDays < 0) {
      triggerType = `OVERDUE_${Math.abs(diffDays)}_DAYS`;
      title = 'Warning: Book Is Overdue!';
      message = `"${loan.bookCopy.book.title}" is now ${Math.abs(diffDays)} day(s) overdue. Please return it immediately to avoid penalties.`;
    }

    if (triggerType) {
      // Idempotency: check if notification with this triggerType was already created in last 24 hours
      const recentNotif = await prisma.notification.findFirst({
        where: {
          userId: loan.userId,
          title,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (!recentNotif) {
        await sendNotification({
          userId: loan.userId,
          type: 'LOAN',
          title,
          message,
          channel: 'IN_APP',
        });
        remindersSent++;
      }
    }
  }

  console.log(`[REMINDER JOB] Completed. Dispatched ${remindersSent} reminder notification(s).`);
  return { remindersSent };
};

export const startReminderScheduler = () => {
  // Run once daily at 08:00 AM in production
  // And run on startup in development
  cron.schedule('0 8 * * *', () => {
    runDueRemindersJob().catch(err => console.error('[REMINDER CRON ERROR]', err));
  });

  console.log('[SCHEDULER] Daily due-date reminder job scheduled.');
};
