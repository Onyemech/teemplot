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
      // Use atomic UPSERT (ON CONFLICT) to handle race conditions and simplify logic
      // Note: IDatabase interface might not expose raw query, so we assume db.query or equivalent exists on the underlying instance
      // If strict repository pattern is used, we should add upsert method to IDatabase.
      // For now, we'll try to use the raw query method if available, or fall back to standard check-then-act but with improved error handling.
      
      const { query } = await import('../config/database'); // Import raw query executor for atomic operation

      const progressData = {
        user_id: userId,
        company_id: companyId,
        current_step: currentStep,
        completed_steps: JSON.stringify(completedSteps),
        form_data: JSON.stringify(formData),
        updated_at: new Date().toISOString()
      };

      const upsertQuery = `
        INSERT INTO onboarding_progress (id, user_id, company_id, current_step, completed_steps, form_data, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          company_id = EXCLUDED.company_id,
          current_step = EXCLUDED.current_step,
          completed_steps = EXCLUDED.completed_steps,
          form_data = EXCLUDED.form_data,
          updated_at = NOW();
      `;

      await query(upsertQuery, [
        randomUUID(),
        userId,
        companyId,
        currentStep,
        progressData.completed_steps,
        progressData.form_data
      ]);

      logger.info(`Onboarding progress saved for user ${userId}, step ${currentStep}`);
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
      
      const progress = await this.db.findOne('onboarding_progress', { user_id: userId });
      
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

          // Optimized N+1 query: Fetch company files with file details in a single JOIN query
          const { query } = await import('../config/database');
          const fileQuery = `
            SELECT cf.document_type, f.secure_url, f.original_filename, f.file_size
            FROM company_files cf
            JOIN files f ON cf.file_id = f.id
            WHERE cf.company_id = $1 AND cf.is_active = true
          `;
          
          const fileResult = await query(fileQuery, [progressCompanyId]);
          
          for (const row of fileResult.rows) {
            if (row.secure_url) {
              const fileData = {
                url: row.secure_url,
                filename: row.original_filename || 'Uploaded document',
                name: row.original_filename || 'Uploaded document',
                size: row.file_size || 0,
                uploaded: true
              };
              
              if (row.document_type === 'cac') {
                formData.cacDocument = fileData;
              } else if (row.document_type === 'proof_of_address') {
                formData.proofOfAddress = fileData;
              } else if (row.document_type === 'company_policy') {
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
      const { query } = await import('../config/database');
      
      // Atomic update using jsonb_set for PostgreSQL JSONB column or similar logic
      // Assuming completed_steps is stored as JSON text or JSONB
      // This query appends the new step if it doesn't exist in the array
      const sql = `
        UPDATE onboarding_progress
        SET completed_steps = (
          SELECT jsonb_agg(DISTINCT elem)
          FROM jsonb_array_elements(
            COALESCE(completed_steps::jsonb, '[]'::jsonb) || to_jsonb($3::int)
          ) AS elem
        ),
        updated_at = NOW()
        WHERE user_id = $1 AND company_id = $2
      `;

      await query(sql, [userId, companyId, step]);

      logger.info(`Step ${step} marked as completed for user ${userId}`);
    } catch (error: any) {
      logger.error(`Failed to mark step as completed: ${error?.message}`);
    }
  }
}

export const onboardingProgressService = new OnboardingProgressService();
