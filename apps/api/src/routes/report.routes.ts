import { Router } from 'express';
import * as reportService from '../services/report.service';
import { authenticate, requireStaff } from '../middleware/auth';

const router = Router();

// GET /reports/overview (Staff)
router.get('/overview', authenticate, requireStaff, async (req, res, next) => {
  try {
    const stats = await reportService.getSystemOverviewStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// GET /reports/analytics (Staff)
router.get('/analytics', authenticate, requireStaff, async (req, res, next) => {
  try {
    const charts = await reportService.getAnalyticsChartsData();
    res.json({ success: true, data: charts });
  } catch (err) {
    next(err);
  }
});

// GET /reports/export (Staff)
router.get('/export', authenticate, requireStaff, async (req, res, next) => {
  try {
    const type = (req.query.type as string) || 'INVENTORY';
    const report = await reportService.exportReportData(type);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

export default router;
