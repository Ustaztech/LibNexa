import { Router } from 'express';
import authRoutes from './auth.routes';
import bookRoutes from './book.routes';
import copyRoutes from './copy.routes';
import borrowRoutes from './borrow.routes';
import returnRoutes from './return.routes';
import resRoutes from './reservation.routes';
import renewalRoutes from './renewal.routes';
import notifRoutes from './notification.routes';
import reportRoutes from './report.routes';
import adminRoutes from './admin.routes';
import { config } from '../config/env';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'LIBNEXA Digital Library API',
    institution: 'Nasarawa State University, Keffi (NSUK)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    smtpConfigured: config.smtp.isConfigured,
    firebaseConfigured: config.firebase.isConfigured,
  });
});

// Mount /api/v1 subroutes
router.use('/auth', authRoutes);
router.use('/books', bookRoutes);
router.use('/copies', copyRoutes);
router.use('/borrowing-requests', borrowRoutes);
router.use('/loans', returnRoutes);
router.use('/reservations', resRoutes);
router.use('/renewals', renewalRoutes);
router.use('/notifications', notifRoutes);
router.use('/reports', reportRoutes);
router.use('/admin', adminRoutes);

export default router;
