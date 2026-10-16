import { Router } from 'express';
import { z } from 'zod';
import * as renewalService from '../services/renewal.service';
import { authenticate, AuthenticatedRequest, requireStaff } from '../middleware/auth';

const router = Router();

const requestRenewalSchema = z.object({
  loanId: z.string().min(1, 'Loan ID is required'),
  reason: z.string().optional(),
});

const reviewRenewalSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().optional(),
});

// POST /renewals (Student)
router.post('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = requestRenewalSchema.parse(req.body);
    const renewal = await renewalService.requestLoanRenewal(
      validated.loanId,
      req.user!.id,
      validated.reason
    );
    res.status(201).json({ success: true, data: renewal });
  } catch (err) {
    next(err);
  }
});

// GET /renewals
router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const isStaff = ['LIBRARIAN', 'ADMIN'].includes(req.user!.role);
    const userId = isStaff ? undefined : req.user!.id;

    const result = await renewalService.getRenewals({
      userId,
      status: status as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.json({ success: true, data: result.items, ...result });
  } catch (err) {
    next(err);
  }
});

// PATCH /renewals/:id/review (Staff only)
router.patch('/:id/review', authenticate, requireStaff, async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = reviewRenewalSchema.parse(req.body);
    const result = await renewalService.reviewRenewal({
      renewalId: req.params.id,
      librarianId: req.user!.id,
      decision: validated.decision,
      rejectionReason: validated.rejectionReason,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
