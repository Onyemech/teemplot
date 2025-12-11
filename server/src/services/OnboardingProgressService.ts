import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { IDatabase } from '../infrastructure/database/IDatabase';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

export interface OnboardingProgress {
  userId: string;
  companyId: string;
  currentStep: number;
  completedSteps: number[];
  formData: Record<string, any>;
  lastSavedAt: string;
}

export class OnboardingProgressService {
  private db: IDatabase;

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
  }

  /**
   * Save user's onboarding progress
   */
  async saveProgress(data: {
    userId: string;
    companyId: string;
    currentStep: number;
    completedSteps?: number[];
    formData?: Record<string, any>;
  }): Promise<void> {
    const { userId, companyId, currentStep, completedSteps = [], formData = {} } = data;

    try {
      // Check if progress already exists
      const existing = await this.db.findOne('onboarding_progress', { user_id: userId });

      const progressData = {
        user_id: userId,
        company_id: companyId,
        current_step: currentStep,
        completed_steps: JSON.stringify(completedSteps),
        form_data: JSON.stringify(formData),
      };

      if (existing) {
        await this.db.update('onboarding_progress', progressData, { user_id: userId });
        logger.info(`Onboarding progress updated for user ${userId}, step ${currentStep}`);
      } else {
        await this.db.insert('onboarding_progress', {
          id: randomUUID(),
          ...progressData,
          created_at: new Date().toISOString(),
        });
        logger.info(`Onboarding progress created for user ${userId}, step ${currentStep}`);
      }
    } catch (error: any) {
      logger.error(`Failed to save onboarding progress: ${error?.message}`);
      throw new Error('Failed to save progress');
    }
  }

  /**
   * Get user's onboarding progress with file URLs from database (OPTIMIZED)
   */
  async getProgress(userId: string): Promise<OnboardingProgress | null> {
    try {
      logger.info(`Fetching onboarding progress for user: ${userId}`);
      
      // OPTIMIZATION: Single query to get all data at once
      const { query } = await import('../config/database');
      const result = await query(`
        SELECT 
          op.*,
          c.logo_url as company_logo,
          -- Get file data in a single query using JSON aggregation
          COALESCE(
            json_object_agg(
              cf.document_type, 
              json_build_object(
                'url', f.secure_url,
                'filename', f.original_filename,
                'name', f.original_filename,
                'size', f.file_size,
                'uploaded', true
              )
            ) FILTER (WHERE cf.document_type IS NOT NULL),
            '{}'::json
          ) as files_data
        FROM onboarding_progress op
        LEFT JOIN companies c ON op.company_id = c.id
        LEFT JOIN company_files cf ON op.company_id = cf.company_id AND cf.is_active = true
        LEFT JOIN files f ON cf.file_id = f.id AND f.status = 'uploaded'
        WHERE op.user_id = $1
        GROUP BY op.id, op.user_id, op.company_id, op.current_step, 
                 op.completed_steps, op.form_data, op.created_at, op.updated_at, c.logo_url
        LIMIT 1
      `, [userId]);
      
      const progress = result.rows[0];

      if (!progress) {
        logger.warn(`No onboarding progress found for user: ${userId}`);
        return null;
      }
      
      logger.info(`Found onboarding progress for user: ${userId}, step: ${progress.current_step}`);

      // Parse form data
      let formData: Record<string, any>;
      if (typeof progress.form_data === 'string') {
        formData = JSON.parse(progress.form_data || '{}');
      } else if (typeof progress.form_data === 'object') {
        formData = progress.form_data || {};
      } else {
        formData = {};
      }
      
      // Add company logo if available
      if (progress.company_logo) {
        formData.companyLogo = progress.company_logo;
      }

      // Add file data from the optimized query
      const filesData = progress.files_data || {};
      if (filesData.cac) {
        formData.cacDocument = filesData.cac;
      }
      if (filesData.proof_of_address) {
        formData.proofOfAddress = filesData.proof_of_address;
      }
      if (filesData.company_policy) {
        formData.companyPolicies = filesData.company_policy;
      }

      // Parse completed steps
      let completedSteps: number[];
      if (typeof progress.completed_steps === 'string') {
        completedSteps = JSON.parse(progress.completed_steps || '[]');
      } else if (Array.isArray(progress.completed_steps)) {
        completedSteps = progress.completed_steps;
      } else {
        completedSteps = [];
      }

      return {
        userId: progress.user_id,
        companyId: progress.company_id,
        currentStep: progress.current_step,
        completedSteps,
        formData,
        lastSavedAt: progress.updated_at,
      };
    } catch (error: any) {
      logger.error(`Failed to get onboarding progress: ${error?.message}`);
      return null;
    }
  }

  async deleteProgress(userId: string): Promise<void> {
    try {
      await this.db.delete('onboarding_progress', { user_id: userId });
      logger.info(`Onboarding progress deleted for user ${userId}`);
    } catch (error: any) {
      logger.error(`Failed to delete onboarding progress: ${error?.message}`);
    }
  }

  async markStepCompleted(userId: string, step: number): Promise<void> {
    try {
      const progress = await this.getProgress(userId);
      
      if (!progress) {
        logger.warn(`No progress found for user ${userId}`);
        return;
      }

      const completedSteps = progress.completedSteps;
      if (!completedSteps.includes(step)) {
        completedSteps.push(step);
        completedSteps.sort((a, b) => a - b);
      }

      await this.db.update(
        'onboarding_progress',
        { completed_steps: JSON.stringify(completedSteps) },
        { user_id: userId }
      );

      logger.info(`Step ${step} marked as completed for user ${userId}`);
    } catch (error: any) {
      logger.error(`Failed to mark step as completed: ${error?.message}`);
    }
  }
}

export const onboardingProgressService = new OnboardingProgressService();
