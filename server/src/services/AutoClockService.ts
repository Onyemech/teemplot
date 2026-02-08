import { DatabaseFactory, IDatabase } from '../infrastructure/database/DatabaseFactory';
import { logger } from '../utils/logger';
import { notificationService } from './NotificationService';

export class AutoClockService {
  private db: IDatabase;

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
  }

  async processAutoClockIn(): Promise<number> {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      if (currentHour < 6 || currentHour >= 20) {
        logger.info('Auto clock-in skipped - outside work hours (6AM-8PM)');
        return 0;
      }

      const companies = await this.getCompaniesWithAutoClockIn();
      let totalClockedIn = 0;

      for (const company of companies) {
        const clockedIn = await this.clockInEmployeesForCompany(company, now);
        totalClockedIn += clockedIn;
      }

      logger.info({ totalClockedIn }, 'Auto clock-in completed');
      return totalClockedIn;

    } catch (error) {
      logger.error({ error }, 'Error processing auto clock-in');
      return 0;
    }
  }

  async processAutoClockOut(): Promise<number> {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      if (currentHour < 6 || currentHour >= 20) {
        logger.info('Auto clock-out skipped - outside work hours (6AM-8PM)');
        return 0;
      }

      const companies = await this.getCompaniesWithAutoClockOut();
      let totalClockedOut = 0;

      for (const company of companies) {
        const clockedOut = await this.clockOutEmployeesForCompany(company, now);
        totalClockedOut += clockedOut;
      }

      logger.info({ totalClockedOut }, 'Auto clock-out completed');
      return totalClockedOut;

    } catch (error) {
      logger.error({ error }, 'Error processing auto clock-out');
      return 0;
    }
  }