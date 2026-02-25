import { FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';
import { auditService } from '../services/AuditService';
import {
  type Feature,
  type SubscriptionPlan,
  determineCompanyPlan,
  getEnabledFeaturesForPlan,
  getTrialDaysLeft
} from '../config/featureGating';


export function checkPlanFeature(feature: Feature) {
  return requireFeature(feature);
}

export function requireFeature(feature: Feature) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;

      if (!user || !user.companyId) {
        return reply.code(401).send({
          success: false,
          message: 'Authentication required'
        });
      }

      const db = DatabaseFactory.getPrimaryDatabase();
      const company = await db.findOne('companies', { id: user.companyId });

      if (!company) {
        return reply.code(404).send({
          success: false,
          message: 'Company not found'
        });
      }

      // Check if trial has expired
      if (company.subscription_status === 'trial' && company.trial_end_date) {
        const trialEnd = new Date(company.trial_end_date);
        if (trialEnd < new Date()) {
          await db.update('companies', {
            subscription_status: 'expired'
          }, { id: company.id });

          // Refresh company status in memory for this request
          company.subscription_status = 'expired';
        }
      }

      const currentPlan: SubscriptionPlan = determineCompanyPlan(company);

      // 1. Check Feature Availability (Gold vs Silver)
      // This MUST happen regardless of subscription status.
      // If a Silver user tries to access a Gold feature, they should be blocked even if expired.
      const enabledFeatures = getEnabledFeaturesForPlan(currentPlan);
      const hasAccess = enabledFeatures.includes(feature);

      if (!hasAccess) {
        void auditService.logAction({
          companyId: company.id,
          userId: user.userId,
          action: 'feature_access_denied',
          entityType: 'feature',
          entityId: feature,
          metadata: {
            plan: currentPlan,
            path: (request as any)?.routerPath || request.url,
            method: request.method
          }
        });
        return reply.code(403).send({
          success: false,
          message: `This feature is not available on your current plan. Upgrade to Gold to access ${feature}.`,
          code: 'FEATURE_NOT_AVAILABLE',
          requiredPlan: 'gold'
        });
      }

      // 2. Check Subscription Status (Active vs Expired)
      if (!['active', 'trial'].includes(company.subscription_status)) {
        // READ-ONLY MODE: Allow GET requests for data access
        if (request.method === 'GET') {
          // Log that we are allowing read-only access
          // logger.info({ companyId: company.id, feature }, 'Read-only access granted for expired subscription');
          return; // Proceed
        }

        // Block WRITE operations
        void auditService.logAction({
          companyId: company.id,
          userId: user.userId,
          action: 'feature_access_denied',
          entityType: 'feature',
          entityId: feature,
          metadata: {
            reason: 'subscription_inactive',
            subscriptionStatus: company.subscription_status,
            path: (request as any)?.routerPath || request.url,
            method: request.method
          }
        });

        const message = company.subscription_status === 'expired'
          ? 'Your subscription has expired. You can view your data, but cannot perform actions. Please renew to restore full access.'
          : 'Your subscription is not active. Please update your payment method.';

        return reply.code(403).send({
          success: false,
          message,
          code: 'SUBSCRIPTION_INACTIVE',
          isReadOnly: true
        });
      }

      // Feature access granted (Active Subscription) - do not spam audit logs on each request
      logger.info({ companyId: company.id, feature, plan: currentPlan }, 'Feature access granted');
    } catch (error: any) {
      logger.error({ err: error }, 'Feature access check failed');
      return reply.code(500).send({
        success: false,
        message: 'Failed to verify feature access'
      });
    }
  };
}


export async function checkEmployeeLimit(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = request.user as any;

    if (!user || !user.companyId) {
      return reply.code(401).send({
        success: false,
        message: 'Authentication required'
      });
    }

    const { employeeInvitationService } = await import('../services/EmployeeInvitationService');
    const limits = await employeeInvitationService.verifyPlanLimits(user.companyId);

    if (!limits.canAddMore) {
      return reply.code(403).send({
        success: false,
        message: `You have reached your employee limit (${limits.declaredLimit}). Upgrade to add more employees.`,
        code: 'EMPLOYEE_LIMIT_REACHED',
        currentCount: limits.currentCount,
        limit: limits.declaredLimit,
        upgradeInfo: limits.upgradeInfo
      });
    }

    logger.info({ companyId: user.companyId, currentCount: limits.currentCount, limit: limits.declaredLimit }, 'Employee limit check passed');
  } catch (error: any) {
    logger.error({ err: error }, 'Employee limit check failed');
    return reply.code(500).send({
      success: false,
      message: 'Failed to verify employee limit'
    });
  }
}


export async function getSubscriptionInfo(companyId: string) {
  const db = DatabaseFactory.getPrimaryDatabase();
  const company = await db.findOne('companies', { id: companyId });

  if (!company) {
    throw new Error('Company not found');
  }

  const currentPlan: SubscriptionPlan = determineCompanyPlan(company);
  const trialDaysLeft: number | null = getTrialDaysLeft(company);

  return {
    plan: currentPlan,
    status: company.subscription_status,
    trialDaysLeft,
    features: getEnabledFeaturesForPlan(currentPlan),
    employeeLimit: parseInt(company.employee_count) || 1,
    subscriptionPlan: company.subscription_plan
  };
}
