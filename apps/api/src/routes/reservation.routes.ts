import { Router } from 'express';
import { z } from 'zod';
import * as resService from '../services/reservation.service';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const createResSchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
});

// POST /reservations
router.post('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = createResSchema.parse(req.body);
    const reservation = await resService.createReservation(req.user!.id, validated.bookId);
    res.status(201).json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
});

// GET /reservations
router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status, bookId, search, page, limit } = req.query;
    const isStaff = ['LIBRARIAN', 'ADMIN'].includes(req.user!.role);
    const userId = isStaff ? (req.query.userId as string) : req.user!.id;

    const result = await resService.getReservations({
      status: status as string,
      userId,
      bookId: bookId as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.json({ success: true, data: result.items, ...result });
  } catch (err) {
    next(err);
  }
});

// POST /reservations/:id/cancel
router.post('/:id/cancel', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const isStaff = ['LIBRARIAN', 'ADMIN'].includes(req.user!.role);
    const result = await resService.cancelReservation(req.params.id, req.user!.id, isStaff);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
