import { Request, Response } from 'express';
import { getDatabase } from '../../config/knex';
import { sendSuccess, sendError, Errors } from '../../utils/response';
import { log } from '../../utils/logger';

export interface RewardPolicy {
  id: string;
  type: 'referral_recommender' | 'referral_referee' | 'review' | 'store_visit' | 'qr_first_use' | 'repeat_purchase' | 'signup';
  name: string;
  description: string;
  reward: {
    type: 'point' | 'cash' | 'coupon' | 'discount';
    amount: number;
    currency?: string;
    unit?: string;
  };
  conditions: {
    minAmount?: number;
    maxRewards?: number;
    validPeriod?: string;
    targetAudience?: string[];
    photoRequired?: boolean;
    minOrderAmount?: number;
  };
  status: 'active' | 'inactive';
  priority: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  modifiedBy?: string;
}

export class ReferralPolicyController {
  /**
   * Get all reward policies
   */
  async getPolicies(req: Request, res: Response): Promise<void> {
    const db = getDatabase();
    
    try {
      const policies = await db('reward_policies')
        .select('*')
        .orderBy('priority', 'asc');
      
      sendSuccess(res, policies, 'Reward policies retrieved successfully');
    } catch (error) {
      log.error('Get reward policies error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }

  /**
   * Get active policies by type
   */
  async getPolicyByType(req: Request, res: Response): Promise<void> {
    const { type } = req.params;
    const db = getDatabase();
    
    try {
      const policy = await db('reward_policies')
        .select('*')
        .where('type', type)
        .where('status', 'active')
        .first();
      
      if (!policy) {
        return Errors.NOT_FOUND('Policy').send(res, 404);
      }
      
      sendSuccess(res, policy, 'Policy retrieved successfully');
    } catch (error) {
      log.error('Get policy by type error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }

  /**
   * Create new reward policy
   */
  async createPolicy(req: Request, res: Response): Promise<void> {
    const policyData = req.body;
    const adminId = req.user!.userId;
    const db = getDatabase();
    
    try {
      // Check for duplicate type
      const existingPolicy = await db('reward_policies')
        .select('id')
        .where('type', policyData.type)
        .where('status', 'active')
        .first();
      
      if (existingPolicy) {
        return sendError(res, 'POLICY_001', 'Active policy of this type already exists', null, 409);
      }
      
      const newPolicy = {
        id: `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...policyData,
        status: policyData.status || 'active',
        createdAt: db.fn.now(),
        updatedAt: db.fn.now(),
        createdBy: adminId
      };
      
      await db('reward_policies').insert(newPolicy);
      
      // Log policy creation
      await db('policy_change_logs').insert({
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        policyId: newPolicy.id,
        changedBy: adminId,
        changedAt: db.fn.now(),
        action: 'create',
        changes: JSON.stringify({ created: newPolicy }),
        reason: policyData.reason || 'Policy created'
      });
      
      sendSuccess(res, newPolicy, 'Policy created successfully');
      
    } catch (error) {
      log.error('Create policy error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }

  /**
   * Update reward policy
   */
  async updatePolicy(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const updates = req.body;
    const adminId = req.user!.userId;
    const db = getDatabase();
    
    try {
      const existingPolicy = await db('reward_policies')
        .select('*')
        .where('id', id)
        .first();
      
      if (!existingPolicy) {
        return Errors.NOT_FOUND('Policy').send(res, 404);
      }
      
      const updatedPolicy = {
        ...updates,
        updatedAt: db.fn.now(),
        modifiedBy: adminId
      };
      
      await db('reward_policies')
        .where('id', id)
        .update(updatedPolicy);
      
      // Log policy changes
      const changes = Object.keys(updates).map(key => ({
        field: key,
        oldValue: existingPolicy[key],
        newValue: updates[key]
      })).filter(change => JSON.stringify(change.oldValue) !== JSON.stringify(change.newValue));
      
      if (changes.length > 0) {
        await db('policy_change_logs').insert({
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          policyId: id,
          changedBy: adminId,
          changedAt: db.fn.now(),
          action: 'update',
          changes: JSON.stringify(changes),
          reason: updates.reason || 'Policy updated'
        });
      }
      
      const finalPolicy = { ...existingPolicy, ...updatedPolicy };
      sendSuccess(res, finalPolicy, 'Policy updated successfully');
      
    } catch (error) {
      log.error('Update policy error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }

  /**
   * Delete/Deactivate policy
   */
  async deletePolicy(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { permanent = false } = req.body;
    const adminId = req.user!.userId;
    const db = getDatabase();
    
    try {
      const policy = await db('reward_policies')
        .select('*')
        .where('id', id)
        .first();
      
      if (!policy) {
        return Errors.NOT_FOUND('Policy').send(res, 404);
      }
      
      if (permanent) {
        await db('reward_policies').where('id', id).del();
      } else {
        await db('reward_policies')
          .where('id', id)
          .update({ 
            status: 'inactive',
            updatedAt: db.fn.now(),
            modifiedBy: adminId
          });
      }
      
      // Log policy deletion
      await db('policy_change_logs').insert({
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        policyId: id,
        changedBy: adminId,
        changedAt: db.fn.now(),
        action: permanent ? 'delete' : 'deactivate',
        changes: JSON.stringify({ action: permanent ? 'permanent_delete' : 'deactivate' }),
        reason: req.body.reason || 'Policy removed'
      });
      
      sendSuccess(res, null, `Policy ${permanent ? 'deleted' : 'deactivated'} successfully`);
      
    } catch (error) {
      log.error('Delete policy error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }

  /**
   * Get policy change history
   */
  async getPolicyHistory(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const db = getDatabase();
    
    try {
      const [history, total] = await Promise.all([
        db('policy_change_logs')
          .select('*')
          .where('policyId', id)
          .orderBy('changedAt', 'desc')
          .limit(limit)
          .offset(offset),
        db('policy_change_logs')
          .count('* as count')
          .where('policyId', id)
          .first()
      ]);
      
      const responseData = {
        history,
        pagination: {
          page,
          limit,
          total: parseInt(total?.count || '0'),
          totalPages: Math.ceil(parseInt(total?.count || '0') / limit)
        }
      };
      
      sendSuccess(res, responseData, 'Policy history retrieved successfully');
      
    } catch (error) {
      log.error('Get policy history error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }

  /**
   * Get reward amount for calculation
   */
  async getRewardAmount(req: Request, res: Response): Promise<void> {
    const { type } = req.params;
    const { context } = req.body; // orderAmount, rewardCount, hasPhoto, etc.
    const db = getDatabase();
    
    try {
      const policy = await db('reward_policies')
        .select('*')
        .where('type', type)
        .where('status', 'active')
        .first();
      
      if (!policy) {
        return sendSuccess(res, { amount: 0, eligible: false }, 'No active policy found');
      }
      
      // Check eligibility based on conditions
      let eligible = true;
      const conditions = typeof policy.conditions === 'string' 
        ? JSON.parse(policy.conditions) 
        : policy.conditions;
      const reward = typeof policy.reward === 'string'
        ? JSON.parse(policy.reward)
        : policy.reward;
      
      // Minimum order amount check
      if (conditions.minOrderAmount && context?.orderAmount < conditions.minOrderAmount) {
        eligible = false;
      }
      
      // Maximum rewards check
      if (conditions.maxRewards && context?.rewardCount >= conditions.maxRewards) {
        eligible = false;
      }
      
      // Photo required check (for reviews)
      if (conditions.photoRequired && !context?.hasPhoto) {
        eligible = false;
      }
      
      sendSuccess(res, {
        amount: eligible ? reward.amount : 0,
        eligible,
        policy: {
          id: policy.id,
          name: policy.name,
          type: policy.type,
          reward,
          conditions
        }
      }, 'Reward calculation completed');
      
    } catch (error) {
      log.error('Calculate reward error', error);
      return Errors.INTERNAL_ERROR(error.message).send(res, 500);
    }
  }
}

export default new ReferralPolicyController();