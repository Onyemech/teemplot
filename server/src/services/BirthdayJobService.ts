
import cron from 'node-cron';
import { logger } from '../utils/logger';
import { birthdayService } from './BirthdayService';

export class BirthdayJobService {
  private job: cron.ScheduledTask | null = null;

  public initialize(): void {
    // Default to 6:00 AM daily
    const schedule = process.env.BIRTHDAY_JOB_CRON || '0 6 * * *';

    void birthdayService.processDailyBirthdays().catch((error) => {
      logger.error({ error }, 'Birthday job initial run failed');
    });
    
    this.job = cron.schedule(schedule, async () => {
      logger.info('Running daily birthday job...');
      await birthdayService.processDailyBirthdays();
    });

    logger.info({ schedule }, 'Birthday job initialized');
  }

  public stop(): void {
    if (!this.job) return;
    this.job.stop();
    logger.info('Birthday job stopped');
  }
}

export const birthdayJobService = new BirthdayJobService();
