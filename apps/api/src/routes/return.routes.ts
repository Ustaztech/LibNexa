import { Router } from 'express';
import { z } from 'zod';
import * as returnService from '../services/return.service';
import { authenticate, AuthenticatedRequest, requireStaff } from '../middleware/auth';

const router = Router();

const returnSchema = z.object({
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'DAMAGED']).optional(),
  notes: z.string().optional(),
});

// GET /loans
router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status, bookId, search, isOverdue, page, limit } = req.query;
    const isStaff = ['LIBRARIAN', 'ADMIN'].includes(req.user!.role);
    const userId = isStaff ? (req.query.userId as string) : req.user!.id;

    const result = await returnService.getLoans({
      status: status as string,
      userId,
      bookId: bookId as string,
      search: search as string,
      isOverdue: isOverdue === 'true',
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.json({ success: true, data: result.items, ...result });
  } catch (err) {
    next(err);
  }
});

// POST /loans/:id/return (Staff only)
router.post('/:id/return', authenticate, requireStaff, async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = returnSchema.parse(req.body);
    const result = await returnService.processBookReturn({
      loanId: req.params.id,
      librarianId: req.user!.id,
      condition: validated.condition,
      notes: validated.notes,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
