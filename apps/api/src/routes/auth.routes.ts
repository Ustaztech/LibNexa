import { Router } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../db/prisma';

const router = Router();

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  matricNumber: z.string().min(4, 'Matriculation number is required'),
  department: z.string().optional(),
  faculty: z.string().optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or Matriculation number is required'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// POST /auth/register
router.post('/register', authRateLimiter(15), async (req, res, next) => {
  try {
    const validated = registerSchema.parse(req.body);
    const result = await authService.registerStudent(validated);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
router.post('/login', authRateLimiter(20), async (req, res, next) => {
  try {
    const validated = loginSchema.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress;
    const result = await authService.login(validated, ip);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, error: { message: 'Refresh token is required' } });
      return;
    }
    const tokens = await authService.refreshToken(refreshToken);
    res.json({ success: true, data: tokens });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
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
        mustChangePassword: true,
        createdAt: true,
        notificationPref: true,
      },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// POST /auth/change-password
router.post('/change-password', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = changePasswordSchema.parse(req.body);
    const result = await authService.changePassword(
      req.user!.id,
      validated.oldPassword,
      validated.newPassword
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
