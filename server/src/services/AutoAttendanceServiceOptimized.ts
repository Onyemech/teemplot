import { pool } from '../config/database';
import { logger } from '../utils/logger';
import cron from 'node-cron';
import { notificationService } from './NotificationService';
import { enhancedAttendanceService } from './EnhancedAttendanceService';

interface CompanyWorkConfig {
  id: string;
  timezone: string;
  working_days: Record<string, boolean>;
  work_start_time: string;
  work_end_time: string;
  auto_clockin_enabled: boolean;
  auto_clockout_enabled: boolean;
  grace_period_minutes: number;
  office_latitude: number | null;
  office_longitude: number | null;
  geofence_radius_meters: number;
  require_geofence_for_clockin: boolean;
  notify_early_departure: boolean;
  early_departure_threshold_minutes: number;
}

interface AutoAttendanceJob {
  id: number;
  company_id: string;
  job_type: 'clockin' | 'clockout';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduled_at: Date;
  started_at?: Date;
  completed_at?: Date;
  processed_count: number;
  error_count: number;
  error_message?: string;
}

export class AutoAttendanceService {
  private clockInJob: cron.ScheduledTask | null = null;
  private clockOutJob: cron.ScheduledTask | null = null;
  private jobProcessor: cron.ScheduledTask | null = null;
  private readonly MAX_EMPLOYEES_PER_BATCH = 50;
  private readonly JOB_PROCESSING_INTERVAL = '*/5 * * * *'; // Every 5 minutes

  public initialize(): void {
    if (!process.env.ENABLE_AUTO_CLOCKIN && !process.env.ENABLE_AUTO_CLOCKOUT) {
      logger.info('Auto attendance is disabled');
      return;
    }

    // Initialize job processor for rate-limited processing
    this.jobProcessor = cron.schedule(this.JOB_PROCESSING_INTERVAL, async () => {
      await this.processPendingJobs();
    });
    logger.info('Auto attendance job processor initialized');

    if (process.env.ENABLE_AUTO_CLOCKIN === 'true') {
      this.clockInJob = cron.schedule('*/5 * * * *', async () => {
        await this.scheduleClockInJobs();
      });
      logger.info('Auto clock-in scheduler initialized');
    }

    if (process.env.ENABLE_AUTO_CLOCKOUT === 'true') {
      this.clockOutJob = cron.schedule('*/5 * * * *', async () => {
        await this.scheduleClockOutJobs();
      });
      logger.info('Auto clock-out scheduler initialized');
    }
  }

  /**
   * Stop all cron jobs
   */
  public stop(): void {
    if (this.clockInJob) {
      this.clockInJob.stop();
      logger.info('Auto clock-in service stopped');
    }
    if (this.clockOutJob) {
      this.clockOutJob.stop();
      logger.info('Auto clock-out service stopped');
    }
    if (this.jobProcessor) {
      this.jobProcessor.stop();
      logger.info('Auto attendance job processor stopped');
    }
  }

  /**
   * Schedule clock-in jobs for eligible companies
   */
  private async scheduleClockInJobs(): Promise<void> {
    try {
      const companies = await this.getEligibleCompanies('clockin');
      
      for (const company of companies) {
        const now = new Date();
        const currentTime = this.getCurrentTimeInTimezone(company.timezone);
        const workStartTime = company.work_start_time;
        const gracePeriodEnd = this.addMinutes(workStartTime, company.grace_period_minutes);

        // Check if within grace period
        if (currentTime >= workStartTime && currentTime <= gracePeriodEnd) {
          // Check if job already exists for today
          const existingJob = await this.getExistingJob(company.id, 'clockin');
          if (!existingJob) {
            await this.createJob(company.id, 'clockin');
            logger.info({ companyId: company.id }, 'Scheduled clock-in job');
          }
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error scheduling clock-in jobs');
    }
  }

  /**
   * Schedule clock-out jobs for eligible companies
   */
  private async scheduleClockOutJobs(): Promise<void> {
    try {
      const companies = await this.getEligibleCompanies('clockout');
      
      for (const company of companies) {
        const currentTime = this.getCurrentTimeInTimezone(company.timezone);
        const workEndTime = company.work_end_time;
        const bufferEnd = this.addMinutes(workEndTime, 60); // 60 minutes buffer

        // Check if within buffer period (work end + 60 minutes)
        if (currentTime >= workEndTime && currentTime <= bufferEnd) {
          // Check if job already exists for today
          const existingJob = await this.getExistingJob(company.id, 'clockout');
          if (!existingJob) {
            await this.createJob(company.id, 'clockout');
            logger.info({ companyId: company.id }, 'Scheduled clock-out job');
          }
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error scheduling clock-out jobs');
    }
  }

  /**
   * Process pending auto-attendance jobs with rate limiting
   */
  private async processPendingJobs(): Promise<void> {
    try {
      const pendingJobs = await this.getPendingJobs(this.MAX_EMPLOYEES_PER_BATCH);
      
      for (const job of pendingJobs) {
        await this.processJob(job);
      }
    } catch (error) {
      logger.error({ error }, 'Error processing pending jobs');
    }
  }

  /**
   * Process individual job with proper error handling
   */
  private async processJob(job: AutoAttendanceJob): Promise<void> {
    let processedCount = 0;
    let errorCount = 0;

    try {
      // Mark job as processing
      await this.updateJobStatus(job.id, 'processing');

      const company = await this.getCompanyConfig(job.company_id);
      if (!company) {
        throw new Error('Company not found');
      }

      if (job.job_type === 'clockin') {
        const result = await this.processClockInBatch(company, job.id);
        processedCount = result.processed;
        errorCount = result.errors;
      } else if (job.job_type === 'clockout') {
        const result = await this.processClockOutBatch(company, job.id);
        processedCount = result.processed;
        errorCount = result.errors;
      }

      // Mark job as completed
      await this.completeJob(job.id, processedCount, errorCount);
      
      logger.info({
        jobId: job.id,
        companyId: job.company_id,
        jobType: job.job_type,
        processed: processedCount,
        errors: errorCount
      }, 'Job completed successfully');

    } catch (error) {
      logger.error({ 
        error, 
        jobId: job.id,
        companyId: job.company_id,
        jobType: job.job_type 
      }, 'Job failed');
      
      await this.failJob(job.id, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Process clock-in batch with rate limiting and error handling
   */
  private async processClockInBatch(company: CompanyWorkConfig, jobId: number): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    try {
      const employees = await this.getEligibleEmployeesForClockIn(company);
      
      for (const employee of employees) {
        try {
          // Check if already clocked in
          const existingAttendance = await this.getExistingAttendance(employee.user_id, company.id);
          if (existingAttendance) {
            continue;
          }

          // Validate geofence if required
          if (company.require_geofence_for_clockin) {
            const isValidLocation = await this.validateEmployeeLocation(employee.user_id, company);
            if (!isValidLocation) {
              continue;
            }
          }

          // Perform clock-in
          await enhancedAttendanceService.checkIn({
            userId: employee.user_id,
            companyId: company.id,
            method: 'auto',
            location: employee.last_location ? {
              latitude: employee.last_location.latitude,
              longitude: employee.last_location.longitude
            } : undefined
          });

          processed++;
          
          // Rate limiting - small delay between operations
          await this.delay(100);
          
        } catch (error) {
          errors++;
          logger.error({ 
            error, 
            userId: employee.user_id,
            companyId: company.id,
            jobId 
          }, 'Failed to auto clock-in employee');
        }
      }
    } catch (error) {
      logger.error({ error, companyId: company.id, jobId }, 'Error processing clock-in batch');
    }

    return { processed, errors };
  }

  /**
   * Process clock-out batch with rate limiting and error handling
   */
  private async processClockOutBatch(company: CompanyWorkConfig, jobId: number): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    try {
      const employees = await this.getEligibleEmployeesForClockOut(company);
      
      for (const employee of employees) {
        try {
          // Get current attendance
          const attendance = await this.getExistingAttendance(employee.user_id, company.id);
          if (!attendance || attendance.clock_out_time) {
            continue;
          }

          // Validate location and timing
          const shouldClockOut = await this.shouldAutoClockOut(employee, company);
          if (!shouldClockOut) {
            continue;
          }

          // Perform clock-out
          await enhancedAttendanceService.checkOut({
            userId: employee.user_id,
            companyId: company.id,
            attendanceId: attendance.id,
            method: 'auto',
            location: employee.last_location ? {
              latitude: employee.last_location.latitude,
              longitude: employee.last_location.longitude
            } : undefined
          });

          processed++;
          
          // Rate limiting - small delay between operations
          await this.delay(100);
          
        } catch (error) {
          errors++;
          logger.error({ 
            error, 
            userId: employee.user_id,
            companyId: company.id,
            jobId 
          }, 'Failed to auto clock-out employee');
        }
      }
    } catch (error) {
      logger.error({ error, companyId: company.id, jobId }, 'Error processing clock-out batch');
    }

    return { processed, errors };
  }

  /**
   * Get eligible companies for auto-attendance
   */
  private async getEligibleCompanies(type: 'clockin' | 'clockout'): Promise<CompanyWorkConfig[]> {
    const enabledField = type === 'clockin' ? 'auto_clockin_enabled' : 'auto_clockout_enabled';
    
    const query = `
      SELECT 
        id, 
        timezone, 
        working_days, 
        work_start_time, 
        work_end_time,
        auto_clockin_enabled,
        auto_clockout_enabled,
        grace_period_minutes,
        office_latitude,
        office_longitude,
        geofence_radius_meters,
        require_geofence_for_clockin,
        notify_early_departure,
        early_departure_threshold_minutes
      FROM companies
      WHERE ${enabledField} = true
        AND is_active = true
        AND deleted_at IS NULL
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get eligible employees for clock-in
   */
  private async getEligibleEmployeesForClockIn(company: CompanyWorkConfig): Promise<any[]> {
    const query = `
      WITH recent_location AS (
        SELECT DISTINCT ON (ul.user_id)
          ul.user_id,
          ul.is_inside_geofence,
          ul.permission_state,
          ul.latitude,
          ul.longitude,
          ul.created_at
        FROM user_locations ul
        WHERE ul.company_id = $1
          AND ul.created_at >= NOW() - INTERVAL '5 minutes'
        ORDER BY ul.user_id, ul.created_at DESC
      )
      SELECT u.id as user_id, u.first_name, u.last_name, rl.is_inside_geofence, 
             rl.permission_state, 
             CASE WHEN rl.latitude IS NOT NULL AND rl.longitude IS NOT NULL 
                  THEN json_build_object('latitude', rl.latitude, 'longitude', rl.longitude) 
                  ELSE NULL END as last_location
      FROM users u
      LEFT JOIN attendance_records ar ON 
        u.id = ar.user_id 
        AND DATE(ar.clock_in_time AT TIME ZONE $2) = CURRENT_DATE
      LEFT JOIN recent_location rl ON rl.user_id = u.id
      WHERE u.company_id = $1
        AND u.is_active = true
        AND u.deleted_at IS NULL
        AND ar.id IS NULL
        AND rl.permission_state = 'granted'
      LIMIT $3
    `;

    const result = await pool.query(query, [company.id, company.timezone, this.MAX_EMPLOYEES_PER_BATCH]);
    return result.rows;
  }

  /**
   * Get eligible employees for clock-out
   */
  private async getEligibleEmployeesForClockOut(company: CompanyWorkConfig): Promise<any[]> {
    const query = `
      WITH recent_location AS (
        SELECT DISTINCT ON (ul.user_id)
          ul.user_id,
          ul.is_inside_geofence,
          ul.permission_state,
          ul.latitude,
          ul.longitude,
          ul.created_at
        FROM user_locations ul
        WHERE ul.company_id = $1
          AND ul.created_at >= NOW() - INTERVAL '10 minutes'
        ORDER BY ul.user_id, ul.created_at DESC
      )
      SELECT ar.id as attendance_id, ar.user_id, ar.clock_in_time, 
             u.first_name, u.last_name, 
             rl.is_inside_geofence, rl.permission_state, rl.created_at as last_location_time,
             CASE WHEN rl.latitude IS NOT NULL AND rl.longitude IS NOT NULL 
                  THEN json_build_object('latitude', rl.latitude, 'longitude', rl.longitude) 
                  ELSE NULL END as last_location
      FROM attendance_records ar
      JOIN users u ON u.id = ar.user_id
      LEFT JOIN recent_location rl ON rl.user_id = ar.user_id
      WHERE ar.company_id = $1
        AND DATE(ar.clock_in_time AT TIME ZONE $2) = CURRENT_DATE
        AND ar.clock_out_time IS NULL
        AND u.is_active = true
        AND u.deleted_at IS NULL
        AND rl.permission_state = 'granted'
      LIMIT $3
    `;

    const result = await pool.query(query, [company.id, company.timezone, this.MAX_EMPLOYEES_PER_BATCH]);
    return result.rows;
  }

  /**
   * Helper methods for job management
   */
  private async getExistingJob(companyId: string, jobType: 'clockin' | 'clockout'): Promise<AutoAttendanceJob | null> {
    const query = `
      SELECT * FROM auto_attendance_jobs 
      WHERE company_id = $1 AND job_type = $2 
      AND DATE(scheduled_at) = CURRENT_DATE
      ORDER BY scheduled_at DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(query, [companyId, jobType]);
    return result.rows[0] || null;
  }

  private async createJob(companyId: string, jobType: 'clockin' | 'clockout'): Promise<void> {
    const query = `
      INSERT INTO auto_attendance_jobs (company_id, job_type, scheduled_at)
      VALUES ($1, $2, NOW())
    `;
    
    await pool.query(query, [companyId, jobType]);
  }

  private async getPendingJobs(limit: number): Promise<AutoAttendanceJob[]> {
    const query = `
      SELECT * FROM auto_attendance_jobs 
      WHERE status = 'pending'
      ORDER BY scheduled_at ASC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  private async updateJobStatus(jobId: number, status: 'processing' | 'completed' | 'failed'): Promise<void> {
    const query = `
      UPDATE auto_attendance_jobs 
      SET status = $1, 
          ${status === 'processing' ? 'started_at = NOW()' : ''}
          ${status === 'completed' ? 'completed_at = NOW()' : ''}
          ${status === 'failed' ? 'completed_at = NOW()' : ''}
      WHERE id = $2
    `;
    
    await pool.query(query, [status, jobId]);
  }

  private async completeJob(jobId: number, processedCount: number, errorCount: number): Promise<void> {
    const query = `
      UPDATE auto_attendance_jobs 
      SET status = 'completed',
          completed_at = NOW(),
          processed_count = $1,
          error_count = $2
      WHERE id = $3
    `;
    
    await pool.query(query, [processedCount, errorCount, jobId]);
  }

  private async failJob(jobId: number, errorMessage: string): Promise<void> {
    const query = `
      UPDATE auto_attendance_jobs 
      SET status = 'failed',
          completed_at = NOW(),
          error_message = $1
      WHERE id = $2
    `;
    
    await pool.query(query, [errorMessage, jobId]);
  }

  /**
   * Helper methods for validation and utilities
   */
  private getCurrentTimeInTimezone(timezone: string): string {
    return new Date().toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private addMinutes(timeString: string, minutes: number): string {
    const [hours, mins, secs] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes, secs || 0);
    
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async getCompanyConfig(companyId: string): Promise<CompanyWorkConfig | null> {
    const query = `
      SELECT 
        id, timezone, working_days, work_start_time, work_end_time,
        auto_clockin_enabled, auto_clockout_enabled, grace_period_minutes,
        office_latitude, office_longitude, geofence_radius_meters,
        require_geofence_for_clockin, notify_early_departure,
        early_departure_threshold_minutes
      FROM companies
      WHERE id = $1 AND is_active = true AND deleted_at IS NULL
    `;
    
    const result = await pool.query(query, [companyId]);
    return result.rows[0] || null;
  }

  private async getExistingAttendance(userId: string, companyId: string): Promise<any | null> {
    const query = `
      SELECT * FROM attendance_records 
      WHERE user_id = $1 AND company_id = $2 
      AND clock_in_time::DATE = CURRENT_DATE 
      ORDER BY clock_in_time DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userId, companyId]);
    return result.rows[0] || null;
  }

  private async validateEmployeeLocation(userId: string, company: CompanyWorkConfig): Promise<boolean> {
    const query = `
      SELECT is_inside_geofence, permission_state
      FROM user_locations 
      WHERE user_id = $1 AND company_id = $2 
      AND created_at >= NOW() - INTERVAL '5 minutes'
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userId, company.id]);
    const location = result.rows[0];
    
    return location?.permission_state === 'granted' && location?.is_inside_geofence === true;
  }

  private async shouldAutoClockOut(employee: any, company: CompanyWorkConfig): Promise<boolean> {
    // Must be outside geofence for at least 30 minutes
    if (!employee.last_location_time) return false;
    
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    return new Date(employee.last_location_time) <= thirtyMinutesAgo && 
           employee.is_inside_geofence === false;
  }
}

export const autoAttendanceService = new AutoAttendanceService();