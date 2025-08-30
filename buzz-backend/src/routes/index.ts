import express from 'express';

// Import all route modules
import authRoutes from './auth';
import userRoutes from './user.routes';
import businessRoutes from './business.routes';
import storeRoutes from './store.routes';
import referralRoutes from './referral.routes';
import couponRoutes from './coupon.routes';
import mileageRoutes from './mileage.routes';
import settlementRoutes from './settlement.routes';
import reviewRoutes from './review.routes';
import adminRoutes from './admin.routes';
import healthRoutes from './health';

const router = express.Router();

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/business', businessRoutes);
router.use('/stores', storeRoutes);
router.use('/referral', referralRoutes);
router.use('/coupons', couponRoutes);
router.use('/mileage', mileageRoutes);
router.use('/settlements', settlementRoutes);
router.use('/reviews', reviewRoutes);
router.use('/admin', adminRoutes);
router.use('/health', healthRoutes);

export default router;