import { query } from '../config/database';
import { logger } from '../utils/logger';

export class UserService {
  /**
   * Update last location verified timestamp
   */
  async updateLocationVerification(userId: string): Promise<void> {
    try {
      await query(
        'UPDATE users SET last_location_verified_at = NOW() WHERE id = $1',
        [userId]
      );
    } catch (error: any) {
      logger.error({ error, userId }, 'Failed to update location verification');
      throw error;
    }
  }

  /**
   * Check if location verification is required (older than 7 days)
   */
  async isLocationVerificationRequired(userId: string, companyId: string): Promise<boolean> {
    try {
      const result = await query(
        'SELECT last_location_verified_at FROM users WHERE id = $1 AND company_id = $2',
        [userId, companyId]
      );

      if (result.rows.length === 0) return false;

      const lastVerified = result.rows[0].last_location_verified_at;
      if (!lastVerified) return true;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      return new Date(lastVerified) < sevenDaysAgo;
    } catch (error: any) {
      logger.error({ error, userId }, 'Failed to check location verification status');
      return false;
    }
  }
}

export const userService = new UserService();
