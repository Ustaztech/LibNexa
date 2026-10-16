import bcrypt from 'bcryptjs';
import prisma from '../db/prisma';
import { AppError } from '../middleware/errorHandler';
import { recordAuditLog } from './audit.service';

export const getUsers = async (params: {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const { role, status, search, page = 1, limit = 20 } = params;
  const where: any = {};

  if (role && role !== 'ALL') where.role = role;
  if (status && status !== 'ALL') where.accountStatus = status;
  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { email: { contains: search } },
      { matricNumber: { contains: search } },
      { membershipNumber: { contains: search } },
      { department: { contains: search } },
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        matricNumber: true,
        membershipNumber: true,
        department: true,
        faculty: true,
        phone: true,
        role: true,
        accountStatus: true,
        emailVerifiedAt: true,
        createdAt: true,
        _count: {
          select: {
            loans: { where: { status: 'ACTIVE' } },
            borrowingRequests: { where: { status: 'PENDING' } },
            reservations: { where: { status: { in: ['PENDING', 'QUEUED'] } } },
          },
        },
      },
    }),
  ]);

  return {
    items: users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const createLibrarian = async (
  input: {
    fullName: string;
    email: string;
    password: string;
    membershipNumber?: string;
    phone?: string;
  },
  adminId: string
) => {
  const existingEmail = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase().trim() },
  });
  if (existingEmail) {
    throw new AppError('An account with this email address already exists.', 409, 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const membershipNum = input.membershipNumber?.trim().toUpperCase() || `LIB-STAFF-${Date.now().toString().slice(-4)}`;

  const librarian = await prisma.user.create({
    data: {
      fullName: input.fullName.trim(),
      email: input.email.toLowerCase().trim(),
      passwordHash,
      membershipNumber: membershipNum,
      phone: input.phone?.trim(),
      role: 'LIBRARIAN',
      accountStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
      mustChangePassword: true, // Requires password change on first login
      notificationPref: {
        create: { emailEnabled: true, pushEnabled: true, reminderEnabled: true },
      },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      membershipNumber: true,
      role: true,
      accountStatus: true,
      createdAt: true,
    },
  });

  await recordAuditLog({
    actorId: adminId,
    action: 'LIBRARIAN_CREATED',
    entityType: 'User',
    entityId: librarian.id,
    newValues: { email: librarian.email, fullName: librarian.fullName },
  });

  return librarian;
};

export const updateUserStatus = async (
  userId: string,
  data: { accountStatus?: string; role?: string },
  adminId: string
) => {
  // Prevent admin from disabling themselves
  if (userId === adminId && data.accountStatus && data.accountStatus !== 'ACTIVE') {
    throw new AppError('Administrator cannot deactivate their own active account.', 400, 'SELF_DEACTIVATION');
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: data.accountStatus,
      role: data.role,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      accountStatus: true,
    },
  });

  await recordAuditLog({
    actorId: adminId,
    action: 'USER_ACCOUNT_UPDATED',
    entityType: 'User',
    entityId: userId,
    oldValues: { role: existing.role, status: existing.accountStatus },
    newValues: { role: updated.role, status: updated.accountStatus },
  });

  return updated;
};

export const updateLibrarySettings = async (
  settings: Record<string, string>,
  adminId: string
) => {
  for (const [key, value] of Object.entries(settings)) {
    await prisma.librarySetting.upsert({
      where: { settingKey: key },
      update: {
        settingValue: value,
        updatedById: adminId,
      },
      create: {
        settingKey: key,
        settingValue: value,
        updatedById: adminId,
      },
    });
  }

  await recordAuditLog({
    actorId: adminId,
    action: 'LIBRARY_SETTINGS_UPDATED',
    entityType: 'LibrarySetting',
    newValues: settings,
  });

  return prisma.librarySetting.findMany({ orderBy: { settingKey: 'asc' } });
};

export const getAuditLogs = async (params: {
  action?: string;
  actorId?: string;
  page?: number;
  limit?: number;
}) => {
  const { action, actorId, page = 1, limit = 25 } = params;
  const where: any = {};
  if (action && action !== 'ALL') where.action = action;
  if (actorId) where.actorId = actorId;

  const skip = (Math.max(1, page) - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, fullName: true, email: true, role: true } },
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
