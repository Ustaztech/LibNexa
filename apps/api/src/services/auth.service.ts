import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { recordAuditLog } from './audit.service';
import { sendNotification } from './notification.service';

export interface RegisterStudentInput {
  fullName: string;
  email: string;
  password: string;
  matricNumber: string;
  department?: string;
  faculty?: string;
  phone?: string;
}

export interface LoginInput {
  identifier: string; // email or matricNumber
  password: string;
}

export const generateTokens = (user: { id: string; email: string; role: string; fullName: string }) => {
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
    config.jwtSecret,
    { expiresIn: '2h' }
  );

  const refreshToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    config.jwtRefreshSecret,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

export const registerStudent = async (input: RegisterStudentInput) => {
  const existingEmail = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase().trim() },
  });
  if (existingEmail) {
    throw new AppError('An account with this email address already exists.', 409, 'EMAIL_EXISTS');
  }

  const existingMatric = await prisma.user.findUnique({
    where: { matricNumber: input.matricNumber.trim().toUpperCase() },
  });
  if (existingMatric) {
    throw new AppError('An account with this student matriculation number already exists.', 409, 'MATRIC_EXISTS');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName.trim(),
      email: input.email.toLowerCase().trim(),
      passwordHash,
      matricNumber: input.matricNumber.trim().toUpperCase(),
      department: input.department?.trim() || null,
      faculty: input.faculty?.trim() || null,
      phone: input.phone?.trim() || null,
      role: 'STUDENT',
      accountStatus: 'ACTIVE',
      emailVerifiedAt: new Date(), // Auto-verified for seamless workflow
      notificationPref: {
        create: {
          emailEnabled: true,
          pushEnabled: true,
          reminderEnabled: true,
        },
      },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      matricNumber: true,
      department: true,
      faculty: true,
      phone: true,
      role: true,
      accountStatus: true,
      createdAt: true,
    },
  });

  await recordAuditLog({
    actorId: user.id,
    action: 'STUDENT_REGISTERED',
    entityType: 'User',
    entityId: user.id,
    newValues: { email: user.email, matricNumber: user.matricNumber },
  });

  await sendNotification({
    userId: user.id,
    type: 'ACCOUNT',
    title: 'Welcome to LIBNEXA!',
    message: `Hello ${user.fullName}, your university library account is active. Explore our catalogue and borrow books seamlessly.`,
  });

  const tokens = generateTokens(user);
  return { user, ...tokens };
};

export const login = async (input: LoginInput, ipAddress?: string) => {
  const idLower = input.identifier.trim().toLowerCase();
  const idUpper = input.identifier.trim().toUpperCase();

  // Match either email or matricNumber
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: idLower },
        { matricNumber: idUpper },
      ],
    },
  });

  if (!user) {
    throw new AppError('Invalid credentials. Please verify your email or matric number and password.', 401, 'INVALID_CREDENTIALS');
  }

  if (user.accountStatus === 'SUSPENDED') {
    throw new AppError('Your account has been suspended by library administration.', 403, 'ACCOUNT_SUSPENDED');
  }

  if (user.accountStatus === 'INACTIVE') {
    throw new AppError('Your account is currently inactive.', 403, 'ACCOUNT_INACTIVE');
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials. Please check your password.', 401, 'INVALID_CREDENTIALS');
  }

  await recordAuditLog({
    actorId: user.id,
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: user.id,
    ipAddress,
  });

  const safeUser = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    matricNumber: user.matricNumber,
    membershipNumber: user.membershipNumber,
    department: user.department,
    faculty: user.faculty,
    phone: user.phone,
    role: user.role,
    accountStatus: user.accountStatus,
    mustChangePassword: user.mustChangePassword,
  };

  const tokens = generateTokens(safeUser);
  return { user: safeUser, ...tokens };
};

export const refreshToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, config.jwtRefreshSecret) as { id: string; email: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        accountStatus: true,
      },
    });

    if (!user || user.accountStatus !== 'ACTIVE') {
      throw new AppError('Account is not active or no longer exists.', 401, 'UNAUTHORIZED');
    }

    const tokens = generateTokens(user);
    return tokens;
  } catch {
    throw new AppError('Invalid or expired refresh token. Please sign in again.', 401, 'INVALID_REFRESH_TOKEN');
  }
};

export const changePassword = async (userId: string, oldPassword: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }

  const isOldValid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isOldValid) {
    throw new AppError('Current password provided is incorrect.', 400, 'INCORRECT_OLD_PASSWORD');
  }

  if (newPassword.length < 8) {
    throw new AppError('New password must be at least 8 characters long.', 400, 'WEAK_PASSWORD');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  });

  await recordAuditLog({
    actorId: userId,
    action: 'PASSWORD_CHANGED',
    entityType: 'User',
    entityId: userId,
  });

  return { message: 'Password changed successfully.' };
};
