import { Router } from 'express';
import { z } from 'zod';
import * as borrowService from '../services/borrow.service';
import { authenticate, AuthenticatedRequest, requireStaff } from '../middleware/auth';

const router = Router();

const createRequestSchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
});

const reviewRequestSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().optional(),
  assignedCopyId: z.string().optional(),
});

// POST /borrowing-requests (Student)
router.post('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = createRequestSchema.parse(req.body);
    const request = await borrowService.requestBorrow(req.user!.id, validated.bookId);
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
});

// GET /borrowing-requests (Staff sees all, Student sees own)
router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status, bookId, search, page, limit } = req.query;
    const isStaff = ['LIBRARIAN', 'ADMIN'].includes(req.user!.role);
    const userId = isStaff ? (req.query.userId as string) : req.user!.id;

    const result = await borrowService.getBorrowingRequests({
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

// PATCH /borrowing-requests/:id/review (Staff only)
router.patch('/:id/review', authenticate, requireStaff, async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = reviewRequestSchema.parse(req.body);
    const result = await borrowService.reviewBorrowingRequest({
      requestId: req.params.id,
      librarianId: req.user!.id,
      decision: validated.decision,
      rejectionReason: validated.rejectionReason,
      assignedCopyId: validated.assignedCopyId,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /borrowing-requests/:id/confirm-collection (Staff only)
router.post('/:id/confirm-collection', authenticate, requireStaff, async (req: AuthenticatedRequest, res, next) => {
  try {
    const loan = await borrowService.confirmCollection({
      requestId: req.params.id,
      librarianId: req.user!.id,
    });
    res.status(201).json({ success: true, data: loan });
  } catch (err) {
    next(err);
  }
});

export default router;
