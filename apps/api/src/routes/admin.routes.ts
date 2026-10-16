import { Router } from 'express';
import { z } from 'zod';
import * as adminService from '../services/admin.service';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/auth';
import prisma from '../db/prisma';

const router = Router();

// Apply requireAdmin to all routes in this file
router.use(authenticate, requireAdmin);

const createLibrarianSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  membershipNumber: z.string().optional(),
  phone: z.string().optional(),
});

const updateUserStatusSchema = z.object({
  accountStatus: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']).optional(),
  role: z.enum(['STUDENT', 'LIBRARIAN', 'ADMIN']).optional(),
});

// GET /admin/users
router.get('/users', async (req, res, next) => {
  try {
    const { role, status, search, page, limit } = req.query;
    const result = await adminService.getUsers({
      role: role as string,
      status: status as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });
    res.json({ success: true, data: result.items, ...result });
  } catch (err) {
    next(err);
  }
});

// POST /admin/librarians
router.post('/librarians', async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = createLibrarianSchema.parse(req.body);
    const librarian = await adminService.createLibrarian(validated, req.user!.id);
    res.status(201).json({ success: true, data: librarian });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/users/:id/status
router.patch('/users/:id/status', async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = updateUserStatusSchema.parse(req.body);
    const updated = await adminService.updateUserStatus(req.params.id, validated, req.user!.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// GET /admin/settings
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await prisma.librarySetting.findMany({
      orderBy: { settingKey: 'asc' },
    });
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/settings
router.patch('/settings', async (req: AuthenticatedRequest, res, next) => {
  try {
    const updated = await adminService.updateLibrarySettings(req.body, req.user!.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// GET /admin/audit-logs
router.get('/audit-logs', async (req, res, next) => {
  try {
    const { action, actorId, page, limit } = req.query;
    const result = await adminService.getAuditLogs({
      action: action as string,
      actorId: actorId as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 25,
    });
    res.json({ success: true, data: result.items, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
