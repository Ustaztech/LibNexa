import prisma from '../db/prisma';

export const DEFAULT_SETTINGS: Record<string, { value: string; description: string }> = {
  max_books_per_student: {
    value: '3',
    description: 'Maximum number of books a student can borrow concurrently',
  },
  standard_loan_duration_days: {
    value: '14',
    description: 'Standard duration (in days) for a borrowed book loan',
  },
  max_concurrent_requests: {
    value: '2',
    description: 'Maximum pending borrowing requests allowed per student',
  },
  collection_deadline_hours: {
    value: '48',
    description: 'Time window (in hours) to collect an approved book before request expires',
  },
  max_renewals_per_loan: {
    value: '2',
    description: 'Maximum times a loan can be renewed by a student',
  },
  renewal_extension_days: {
    value: '7',
    description: 'Additional days granted upon loan renewal approval',
  },
  reservation_collection_hours: {
    value: '48',
    description: 'Hours an available reserved book is held for the queued student',
  },
  reminder_schedule_days: {
    value: '3,1,0',
    description: 'Comma-separated days before/on due date to trigger reminder notifications',
  },
};

export const getSetting = async (key: string): Promise<string> => {
  const setting = await prisma.librarySetting.findUnique({
    where: { settingKey: key },
  });
  if (setting) return setting.settingValue;
  return DEFAULT_SETTINGS[key]?.value || '';
};

export const getSettingInt = async (key: string, fallback: number): Promise<number> => {
  const val = await getSetting(key);
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
};

export const ensureDefaultSettings = async (): Promise<void> => {
  for (const [key, meta] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await prisma.librarySetting.findUnique({
      where: { settingKey: key },
    });
    if (!existing) {
      await prisma.librarySetting.create({
        data: {
          settingKey: key,
          settingValue: meta.value,
          description: meta.description,
        },
      });
    }
  }
};
