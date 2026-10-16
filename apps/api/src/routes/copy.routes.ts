import { Router } from 'express';
import { z } from 'zod';
import * as copyService from '../services/copy.service';
import { authenticate, AuthenticatedRequest, requireStaff } from '../middleware/auth';

const router = Router();

const createCopySchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
  accessionNumber: z.string().min(3, 'Accession number is required'),
  barcode: z.string().optional(),
  shelfLocation: z.string().min(1, 'Shelf location is required'),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'DAMAGED']).optional(),
  status: z.enum(['AVAILABLE', 'UNDER_MAINTENANCE', 'WITHDRAWN']).optional(),
});

// GET /copies
router.get('/', authenticate, requireStaff, async (req, res, next) => {
  try {
    const { bookId, status, condition, search } = req.query;
    const copies = await copyService.getCopies({
      bookId: bookId as string,
      status: status as string,
      condition: condition as string,
      search: search as string,
    });
    res.json({ success: true, data: copies });
  } catch (err) {
    next(err);
  }
});

// POST /copies
router.post('/', authenticate, requireStaff, async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = createCopySchema.parse(req.body);
    const copy = await copyService.createCopy(validated, req.user!.id);
    res.status(201).json({ success: true, data: copy });
  } catch (err) {
    next(err);
  }
});

// PATCH /copies/:id
router.patch('/:id', authenticate, requireStaff, async (req: AuthenticatedRequest, res, next) => {
  try {
    const copy = await copyService.updateCopy(req.params.id, req.body, req.user!.id);
    res.json({ success: true, data: copy });
  } catch (err) {
    next(err);
  }
});

// DELETE /copies/:id
router.delete('/:id', authenticate, requireStaff, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await copyService.deleteCopy(req.params.id, req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
