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
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        // Update existing progress
        await this.db.update(
          'onboarding_progress',
          progressData,
          { user_id: userId }
        );
        logger.info(`Onboarding progress updated for user ${userId}, step ${currentStep}`);
      } else {
        // Create new progress record
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
   * Get user's onboarding progress
   */
  async getProgress(userId: string): Promise<OnboardingProgress | null> {
    try {
      const progress = await this.db.findOne('onboarding_progress', { user_id: userId });

      if (!progress) {
        return null;
      }

      return {
        userId: progress.user_id,
        companyId: progress.company_id,
        currentStep: progress.current_step,
        completedSteps: JSON.parse(progress.completed_steps || '[]'),
        formData: JSON.parse(progress.form_data || '{}'),
        lastSavedAt: progress.updated_at,
      };
    } catch (error: any) {
      logger.error(`Failed to get onboarding progress: ${error?.message}`);
      return null;
    }
  }

  /**
   * Delete user's onboarding progress (after completion)
   */
  async deleteProgress(userId: string): Promise<void> {
    try {
      await this.db.delete('onboarding_progress', { user_id: userId });
      logger.info(`Onboarding progress deleted for user ${userId}`);
    } catch (error: any) {
      logger.error(`Failed to delete onboarding progress: ${error?.message}`);
    }
  }

  /**
   * Mark step as completed
   */
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
        {
          completed_steps: JSON.stringify(completedSteps),
          last_saved_at: new Date().toISOString(),
        },
        { user_id: userId }
      );

      logger.info(`Step ${step} marked as completed for user ${userId}`);
    } catch (error: any) {
      logger.error(`Failed to mark step as completed: ${error?.message}`);
    }
  }
}

export const onboardingProgressService = new OnboardingProgressService();
