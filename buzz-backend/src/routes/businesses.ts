import express from 'express';
import { getDatabase } from '../config/knex';
import { sendSuccess, sendError, sendPaginated, Errors } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { businessValidations, commonValidations } from '../middleware/validation';
import { standardLimiter } from '../middleware/rateLimit';
import { requireAuth, requireAdmin, requireBusiness } from '../middleware/auth';
import { BusinessStatus, ApplicationStatus } from '../types';
import { log } from '../utils/logger';
import { hashPassword } from '../utils/auth';

const router = express.Router();

/**
 * @route   GET /api/businesses
 * @desc    Get list of businesses
 * @access  Public
 */
router.get('/', standardLimiter, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const {
    category,
    status = BusinessStatus.APPROVED,
    sort = 'recent',
    lat,
    lng,
    page = 1,
    limit = 20,
  } = req.query;

  let query = db('businesses')
    .select([
      'businesses.id',
      'businesses.business_name',
      'businesses.category',
      'businesses.description',
      'businesses.address',
      'businesses.phone',
      'businesses.business_hours',
      'businesses.images',
      'businesses.tags',
      'businesses.avg_rating',
      'businesses.review_count',
      'businesses.created_at',
    ])
    .where('businesses.status', status);

  // Filter by category
  if (category) {
    query = query.where('businesses.category', category);
  }

  // TODO: Implement distance-based filtering when lat/lng provided
  if (lat && lng) {
    // Placeholder for geospatial queries
    // query = query.whereRaw('ST_DWithin(ST_Point(?, ?), ST_Point(longitude, latitude), 10000)', [lng, lat]);
  }

  // Apply sorting
  switch (sort) {
    case 'rating':
      query = query.orderBy('avg_rating', 'desc').orderBy('review_count', 'desc');
      break;
    case 'distance':
      // TODO: Implement distance sorting
      query = query.orderBy('created_at', 'desc');
      break;
    case 'recent':
    default:
      query = query.orderBy('created_at', 'desc');
      break;
  }

  // Get total count for pagination
  const countQuery = query.clone();
  const [{ count }] = await countQuery.clearSelect().count('* as count');
  const total = parseInt(count);

  // Apply pagination
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const businesses = await query.limit(parseInt(limit)).offset(offset);

  sendPaginated(res, businesses, total, parseInt(page), parseInt(limit));
}));

/**
 * @route   GET /api/businesses/:id
 * @desc    Get business by ID
 * @access  Public
 */
router.get('/:id', commonValidations.businessId(), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDatabase();

  const business = await db('businesses')
    .leftJoin('users', 'businesses.owner_id', 'users.id')
    .select([
      'businesses.*',
      'users.name as owner_name',
      'users.email as owner_email',
    ])
    .where('businesses.id', id)
    .first();

  if (!business) {
    return Errors.NOT_FOUND('Business').send(res, 404);
  }

  // Don't expose sensitive owner information to public
  if (!req.user || req.user.role !== 'admin') {
    delete business.owner_email;
  }

  sendSuccess(res, business);
}));

/**
 * @route   POST /api/business/apply
 * @desc    Apply for Buzz-Biz account
 * @access  Public
 */
router.post('/apply', businessValidations.apply, asyncHandler(async (req, res) => {
  const { email, password, businessInfo, documents } = req.body;
  const db = getDatabase();

  try {
    // Check if application already exists
    const existingApp = await db('business_applications')
      .where('email', email)
      .where('status', ApplicationStatus.PENDING)
      .first();

    if (existingApp) {
      return Errors.DUPLICATE_ENTRY('Pending application with this email').send(res, 409);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create application
    const [application] = await db('business_applications')
      .insert({
        email,
        password_hash: passwordHash,
        business_info: JSON.stringify(businessInfo),
        documents: documents ? JSON.stringify(documents) : null,
        status: ApplicationStatus.PENDING,
        expires_at: db.raw("NOW() + INTERVAL '30 days'"),
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning(['id', 'email', 'status', 'created_at']);

    log.business('application_submitted', application.id, 'system', {
      email: application.email,
      businessName: businessInfo.name,
      category: businessInfo.category,
    });

    sendSuccess(res, {
      applicationId: application.id,
      status: application.status,
      message: '가입 신청이 접수되었습니다. 관리자 승인 후 이메일로 안내드립니다.',
    }, 'Application submitted successfully', 201);

  } catch (error) {
    log.error('Business application error', error);
    throw error;
  }
}));

/**
 * @route   POST /api/business/register
 * @desc    Register business (after approval)
 * @access  Private (Business)
 */
router.post('/register', requireBusiness, businessValidations.register, asyncHandler(async (req, res) => {
  const {
    businessName,
    businessNumber,
    category,
    description,
    address,
    phone,
    businessHours,
    images,
  } = req.body;
  const ownerId = req.user!.userId;
  const db = getDatabase();

  try {
    // Check if user already has a business
    const existingBusiness = await db('businesses')
      .where('owner_id', ownerId)
      .first();

    if (existingBusiness) {
      return Errors.DUPLICATE_ENTRY('Business already registered for this user').send(res, 409);
    }

    // Create business
    const [business] = await db('businesses')
      .insert({
        owner_id: ownerId,
        business_name: businessName,
        business_number: businessNumber,
        category,
        description,
        address,
        phone,
        business_hours: businessHours ? JSON.stringify(businessHours) : null,
        images: images ? JSON.stringify(images) : null,
        status: BusinessStatus.PENDING,
        qr_scan_count: 0,
        avg_rating: 0,
        review_count: 0,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning(['id', 'business_name', 'status', 'created_at']);

    log.business('registration_submitted', business.id, ownerId, {
      businessName: business.business_name,
      category,
    });

    sendSuccess(res, {
      businessId: business.id,
      businessName: business.business_name,
      status: business.status,
      message: '매장 등록이 신청되었습니다. 관리자 승인을 기다려주세요.',
    }, 'Business registration submitted', 201);

  } catch (error) {
    log.error('Business registration error', error);
    throw error;
  }
}));

/**
 * @route   GET /api/admin/business-applications
 * @desc    Get business applications (Admin)
 * @access  Private (Admin)
 */
router.get('/admin/business-applications', requireAdmin, asyncHandler(async (req, res) => {
  const db = getDatabase();
  const {
    status,
    page = 1,
    limit = 20,
  } = req.query;

  let query = db('business_applications')
    .select([
      'id',
      'email',
      'business_info',
      'status',
      'reviewed_by',
      'reviewed_at',
      'rejection_reason',
      'created_at',
    ])
    .orderBy('created_at', 'desc');

  if (status) {
    query = query.where('status', status);
  }

  // Get total count
  const countQuery = query.clone();
  const [{ count }] = await countQuery.clearSelect().count('* as count');
  const total = parseInt(count);

  // Apply pagination
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const applications = await query.limit(parseInt(limit)).offset(offset);

  // Parse business_info JSON
  const formattedApplications = applications.map(app => ({
    ...app,
    businessInfo: typeof app.business_info === 'string' 
      ? JSON.parse(app.business_info) 
      : app.business_info,
    business_info: undefined,
  }));

  sendPaginated(res, formattedApplications, total, parseInt(page), parseInt(limit));
}));

/**
 * @route   POST /api/admin/business-applications/:id/approve
 * @desc    Approve business application (Admin)
 * @access  Private (Admin)
 */
router.post('/admin/business-applications/:id/approve', requireAdmin, businessValidations.approve, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approved, businessName, category } = req.body;
  const reviewerId = req.user!.userId;
  const db = getDatabase();

  try {
    await db.transaction(async (trx) => {
      // Get application
      const application = await trx('business_applications')
        .where('id', id)
        .where('status', ApplicationStatus.PENDING)
        .first();

      if (!application) {
        throw new Error('Application not found or already processed');
      }

      const businessInfo = typeof application.business_info === 'string'
        ? JSON.parse(application.business_info)
        : application.business_info;

      if (approved) {
        // Create user account
        const [user] = await trx('users')
          .insert({
            email: application.email,
            name: businessInfo.name || 'Business Owner',
            role: 'business',
            password_hash: application.password_hash,
            is_active: true,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          })
          .returning(['id', 'email']);

        // Create business
        const [business] = await trx('businesses')
          .insert({
            owner_id: user.id,
            business_name: businessName || businessInfo.name,
            business_number: businessInfo.registrationNumber,
            category: category || businessInfo.category,
            address: businessInfo.address,
            phone: businessInfo.phone,
            status: BusinessStatus.APPROVED,
            approved_at: trx.fn.now(),
            approved_by: reviewerId,
            qr_scan_count: 0,
            avg_rating: 0,
            review_count: 0,
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          })
          .returning(['id', 'business_name']);

        // Update application
        await trx('business_applications')
          .where('id', id)
          .update({
            status: ApplicationStatus.APPROVED,
            reviewed_by: reviewerId,
            reviewed_at: trx.fn.now(),
            approved_user_id: user.id,
            updated_at: trx.fn.now(),
          });

        log.business('application_approved', business.id, reviewerId, {
          applicantEmail: application.email,
          businessName: business.business_name,
          userId: user.id,
        });

        sendSuccess(res, {
          userId: user.id,
          businessId: business.id,
          email: user.email,
          message: '매장 가입이 승인되었습니다.',
        });
      } else {
        // Reject application
        await trx('business_applications')
          .where('id', id)
          .update({
            status: ApplicationStatus.REJECTED,
            reviewed_by: reviewerId,
            reviewed_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          });

        log.business('application_rejected', id, reviewerId, {
          applicantEmail: application.email,
        });

        sendSuccess(res, {
          message: '가입 신청이 반려되었습니다.',
        });
      }
    });

  } catch (error) {
    log.error('Business application approval error', error);
    throw error;
  }
}));

/**
 * @route   POST /api/admin/business-applications/:id/reject
 * @desc    Reject business application (Admin)
 * @access  Private (Admin)
 */
router.post('/admin/business-applications/:id/reject', requireAdmin, businessValidations.reject, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const reviewerId = req.user!.userId;
  const db = getDatabase();

  const application = await db('business_applications')
    .where('id', id)
    .where('status', ApplicationStatus.PENDING)
    .first();

  if (!application) {
    return Errors.NOT_FOUND('Application').send(res, 404);
  }

  await db('business_applications')
    .where('id', id)
    .update({
      status: ApplicationStatus.REJECTED,
      reviewed_by: reviewerId,
      reviewed_at: db.fn.now(),
      rejection_reason: reason,
      updated_at: db.fn.now(),
    });

  log.business('application_rejected', id, reviewerId, {
    applicantEmail: application.email,
    reason,
  });

  sendSuccess(res, {
    message: '가입 신청이 반려되었습니다.',
  });
}));

export default router;