import { Request, Response } from 'express';
import { getDatabase } from '../config/knex';
import { sendSuccess, sendError, Errors, sendPaginated } from '../utils/response';
import { BusinessStatus } from '../types';
import { log } from '../utils/logger';

export class StoreController {
  /**
   * Get store list with filters
   */
  async getStores(req: Request, res: Response): Promise<void> {
    const {
      category,
      latitude,
      longitude,
      radius = 5000, // 5km default
      sortBy = 'distance',
      page = 1,
      limit = 20,
      search
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const db = getDatabase();
    
    try {
      let query = db('businesses as b')
        .select(
          'b.id',
          'b.business_name',
          'b.category',
          'b.description',
          'b.address',
          'b.phone',
          'b.business_hours',
          'b.images',
          'b.tags',
          'b.avg_rating',
          'b.review_count',
          'b.latitude',
          'b.longitude',
          'b.created_at'
        )
        .where('b.status', BusinessStatus.APPROVED);
      
      // Apply filters
      if (category) {
        query = query.where('b.category', category);
      }
      
      if (search) {
        query = query.where((builder) => {
          builder
            .where('b.business_name', 'like', `%${search}%`)
            .orWhere('b.description', 'like', `%${search}%`)
            .orWhere('b.address', 'like', `%${search}%`);
        });
      }
      
      // Add distance calculation if coordinates provided
      if (latitude && longitude) {
        const lat = parseFloat(latitude as string);
        const lng = parseFloat(longitude as string);
        const radiusKm = parseInt(radius as string) / 1000;
        
        query = query
          .select(db.raw(`
            (6371 * acos(cos(radians(?)) * cos(radians(b.latitude)) * 
            cos(radians(b.longitude) - radians(?)) + 
            sin(radians(?)) * sin(radians(b.latitude)))) as distance
          `, [lat, lng, lat]))
          .having('distance', '<=', radiusKm);
      }
      
      // Apply sorting
      switch (sortBy) {
        case 'distance':
          if (latitude && longitude) {
            query = query.orderBy('distance', 'asc');
          } else {
            query = query.orderBy('b.created_at', 'desc');
          }
          break;
        case 'rating':
          query = query.orderBy('b.avg_rating', 'desc');
          break;
        case 'reviews':
          query = query.orderBy('b.review_count', 'desc');
          break;
        case 'name':
          query = query.orderBy('b.business_name', 'asc');
          break;
        default:
          query = query.orderBy('b.created_at', 'desc');
      }
      
      // Get stores with pagination
      const stores = await query
        .limit(parseInt(limit as string))
        .offset(offset);
      
      // Get total count for pagination
      let countQuery = db('businesses')
        .where('status', BusinessStatus.APPROVED);
      
      if (category) {
        countQuery = countQuery.where('category', category);
      }
      
      if (search) {
        countQuery = countQuery.where((builder) => {
          builder
            .where('business_name', 'like', `%${search}%`)
            .orWhere('description', 'like', `%${search}%`)
            .orWhere('address', 'like', `%${search}%`);
        });
      }
      
      const totalCount = await countQuery.count('* as count').first();
      const total = parseInt(totalCount?.count || '0');
      
      sendPaginated(res, stores, total, parseInt(page as string), parseInt(limit as string), 'Stores retrieved successfully');
      
    } catch (error) {
      log.error('Get stores error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get store details by ID
   */
  async getStoreById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const db = getDatabase();
    
    try {
      // Get store details
      const store = await db('businesses')
        .select(
          'id',
          'business_name',
          'category',
          'description',
          'address',
          'address_detail',
          'phone',
          'business_hours',
          'images',
          'tags',
          'avg_rating',
          'review_count',
          'qr_scan_count',
          'latitude',
          'longitude',
          'created_at'
        )
        .where('id', id)
        .where('status', BusinessStatus.APPROVED)
        .first();
      
      if (!store) {
        return Errors.NOT_FOUND('Store').send(res, 404);
      }
      
      // Get recent reviews (last 5)
      const reviews = await db('store_reviews as sr')
        .join('users as u', 'sr.user_id', 'u.id')
        .select(
          'sr.id',
          'sr.rating',
          'sr.review',
          'sr.images',
          'sr.created_at',
          'u.name as user_name',
          'u.avatar_url as user_avatar'
        )
        .where('sr.business_id', id)
        .orderBy('sr.created_at', 'desc')
        .limit(5);
      
      // Get rating distribution
      const ratingDistribution = await db('store_reviews')
        .select('rating', db.raw('COUNT(*) as count'))
        .where('business_id', id)
        .groupBy('rating')
        .orderBy('rating', 'desc');
      
      const responseData = {
        ...store,
        reviews: {
          recent: reviews,
          distribution: ratingDistribution,
          total: store.review_count,
          average: store.avg_rating,
        },
      };
      
      sendSuccess(res, responseData, 'Store details retrieved successfully');
      
    } catch (error) {
      log.error('Get store details error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Search stores
   */
  async searchStores(req: Request, res: Response): Promise<void> {
    const { q: query, category, latitude, longitude, page = 1, limit = 10 } = req.query;
    
    if (!query) {
      return sendError(res, 'VALIDATION_003', 'Search query is required', null, 400);
    }
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const db = getDatabase();
    
    try {
      let searchQuery = db('businesses as b')
        .select(
          'b.id',
          'b.business_name',
          'b.category',
          'b.description',
          'b.address',
          'b.avg_rating',
          'b.review_count',
          'b.images',
          'b.latitude',
          'b.longitude'
        )
        .where('b.status', BusinessStatus.APPROVED)
        .where((builder) => {
          builder
            .where('b.business_name', 'like', `%${query}%`)
            .orWhere('b.description', 'like', `%${query}%`)
            .orWhere('b.address', 'like', `%${query}%`)
            .orWhereRaw("JSON_SEARCH(b.tags, 'one', ?) IS NOT NULL", [`%${query}%`]);
        });
      
      // Apply category filter
      if (category) {
        searchQuery = searchQuery.where('b.category', category);
      }
      
      // Add distance calculation if coordinates provided
      if (latitude && longitude) {
        const lat = parseFloat(latitude as string);
        const lng = parseFloat(longitude as string);
        
        searchQuery = searchQuery
          .select(db.raw(`
            (6371 * acos(cos(radians(?)) * cos(radians(b.latitude)) * 
            cos(radians(b.longitude) - radians(?)) + 
            sin(radians(?)) * sin(radians(b.latitude)))) as distance
          `, [lat, lng, lat]))
          .orderBy('distance', 'asc');
      } else {
        searchQuery = searchQuery.orderBy('b.avg_rating', 'desc');
      }
      
      // Get results with pagination
      const stores = await searchQuery
        .limit(parseInt(limit as string))
        .offset(offset);
      
      // Get total count
      let countQuery = db('businesses')
        .where('status', BusinessStatus.APPROVED)
        .where((builder) => {
          builder
            .where('business_name', 'like', `%${query}%`)
            .orWhere('description', 'like', `%${query}%`)
            .orWhere('address', 'like', `%${query}%`)
            .orWhereRaw("JSON_SEARCH(tags, 'one', ?) IS NOT NULL", [`%${query}%`]);
        });
      
      if (category) {
        countQuery = countQuery.where('category', category);
      }
      
      const totalCount = await countQuery.count('* as count').first();
      const total = parseInt(totalCount?.count || '0');
      
      sendPaginated(res, stores, total, parseInt(page as string), parseInt(limit as string), 'Search results retrieved successfully');
      
    } catch (error) {
      log.error('Search stores error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Get store categories
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    const db = getDatabase();
    
    try {
      // Get categories with store counts
      const categories = await db('businesses')
        .select('category', db.raw('COUNT(*) as count'))
        .where('status', BusinessStatus.APPROVED)
        .groupBy('category')
        .orderBy('count', 'desc');
      
      // Add category metadata
      const categoryData = categories.map(cat => ({
        id: cat.category,
        name: this.getCategoryDisplayName(cat.category),
        count: parseInt(cat.count),
        icon: this.getCategoryIcon(cat.category),
      }));
      
      sendSuccess(res, categoryData, 'Categories retrieved successfully');
      
    } catch (error) {
      log.error('Get categories error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Add store review
   */
  async addReview(req: Request, res: Response): Promise<void> {
    const { id: businessId } = req.params;
    const { rating, review, images } = req.body;
    const userId = req.user!.userId;
    const db = getDatabase();
    
    try {
      // Check if store exists
      const business = await db('businesses')
        .where('id', businessId)
        .where('status', BusinessStatus.APPROVED)
        .first();
      
      if (!business) {
        return Errors.NOT_FOUND('Store').send(res, 404);
      }
      
      // Check if user already reviewed this store
      const existingReview = await db('store_reviews')
        .where('user_id', userId)
        .where('business_id', businessId)
        .first();
      
      if (existingReview) {
        return sendError(res, 'REVIEW_001', 'You have already reviewed this store', null, 409);
      }
      
      await db.transaction(async (trx) => {
        // Insert review
        const [newReview] = await trx('store_reviews')
          .insert({
            user_id: userId,
            business_id: businessId,
            rating,
            review,
            images: images || [],
            created_at: trx.fn.now(),
          })
          .returning('*');
        
        // Update business rating and review count
        const reviewStats = await trx('store_reviews')
          .where('business_id', businessId)
          .select(
            trx.raw('AVG(rating) as avg_rating'),
            trx.raw('COUNT(*) as review_count')
          )
          .first();
        
        await trx('businesses')
          .where('id', businessId)
          .update({
            avg_rating: parseFloat(reviewStats.avg_rating).toFixed(2),
            review_count: reviewStats.review_count,
            updated_at: trx.fn.now(),
          });
        
        // Award mileage for review (if configured)
        const reviewBonus = 50; // 50 mileage points for review
        
        await trx('mileage_transactions')
          .insert({
            user_id: userId,
            business_id: businessId,
            type: 'earn',
            amount: reviewBonus,
            balance_before: 0, // Will be updated by trigger
            balance_after: 0,  // Will be updated by trigger
            description: '스토어 리뷰 작성',
            reference_type: 'review',
            reference_id: newReview.id,
            created_at: trx.fn.now(),
          });
        
        // Update mileage account
        await trx('mileage_accounts')
          .where('user_id', userId)
          .update({
            balance: trx.raw('balance + ?', [reviewBonus]),
            total_earned: trx.raw('total_earned + ?', [reviewBonus]),
            updated_at: trx.fn.now(),
          });
      });
      
      log.info('Store review added', {
        userId,
        businessId,
        rating,
      });
      
      sendSuccess(res, {
        message: '리뷰가 등록되었습니다. 50 마일리지가 적립되었습니다.',
        mileageEarned: 50,
      }, 'Review added successfully', 201);
      
    } catch (error) {
      log.error('Add review error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
  
  /**
   * Helper method to get category display name
   */
  private getCategoryDisplayName(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'cafe': '카페',
      'restaurant': '맛집',
      'shop': '쇼핑',
    };
    
    return categoryMap[category] || category;
  }
  
  /**
   * Helper method to get category icon
   */
  private getCategoryIcon(category: string): string {
    const iconMap: { [key: string]: string } = {
      'cafe': '☕',
      'restaurant': '🍽️',
      'shop': '🛍️',
    };
    
    return iconMap[category] || '🏪';
  }
}

export default new StoreController();