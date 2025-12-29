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
   * Get user's onboarding progress with file URLs from database
   */
  async getProgress(userId: string, companyId?: string): Promise<OnboardingProgress | null> {
    try {
      logger.info(`Fetching onboarding progress for user: ${userId}${companyId ? `, company: ${companyId}` : ''}`);
      
      const { query } = await import('../config/database');
      const queryStr = companyId 
        ? 'SELECT * FROM onboarding_progress WHERE user_id = $1 AND company_id = $2 LIMIT 1'
        : 'SELECT * FROM onboarding_progress WHERE user_id = $1 LIMIT 1';
      const params = companyId ? [userId, companyId] : [userId];
      
      const result = await query(queryStr, params);
      
      const progress = result.rows[0];

      if (!progress) {
        logger.warn(`No onboarding progress found for user: ${userId}`);
        return null;
      }
      
      logger.info(`Found onboarding progress for user: ${userId}, step: ${progress.current_step}`);

      let formData: Record<string, any>;
      if (typeof progress.form_data === 'string') {
        formData = JSON.parse(progress.form_data || '{}');
      } else if (typeof progress.form_data === 'object') {
        formData = progress.form_data || {};
      } else {
        formData = {};
      }
      
      const progressCompanyId = progress.company_id;

      if (progressCompanyId && progressCompanyId !== 'pending') {
        try {
          const company = await this.db.findOne('companies', { id: progressCompanyId });
          if (company && company.logo_url) {
            formData.companyLogo = company.logo_url;
          }

          const companyFiles = await this.db.find('company_files', { 
            company_id: progressCompanyId,
            is_active: true 
          });

          for (const cf of companyFiles) {
            const file = await this.db.findOne('files', { id: cf.file_id });
            if (file && file.secure_url) {
              const fileData = {
                url: file.secure_url,
                filename: file.original_filename || 'Uploaded document',
                name: file.original_filename || 'Uploaded document',
                size: file.file_size || 0,
                uploaded: true
              };
              
              if (cf.document_type === 'cac') {
                formData.cacDocument = fileData;
              } else if (cf.document_type === 'proof_of_address') {
                formData.proofOfAddress = fileData;
              } else if (cf.document_type === 'company_policy') {
                formData.companyPolicies = fileData;
              }
            }
          }
        } catch (fileError: any) {
          logger.warn(`Failed to fetch file URLs for user ${userId}: ${fileError?.message}`);
        }
      }

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

  async markStepCompleted(userId: string, companyId: string, step: number): Promise<void> {
    try {
      const progress = await this.getProgress(userId, companyId);
      
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
        { user_id: userId, company_id: companyId }
      );

      logger.info(`Step ${step} marked as completed for user ${userId}`);
    } catch (error: any) {
      logger.error(`Failed to mark step as completed: ${error?.message}`);
    }
  }
}

export const onboardingProgressService = new OnboardingProgressService();
