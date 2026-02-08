import { pool } from '../config/database';
import { logger } from '../utils/logger';
import cron from 'node-cron';
import { notificationService } from './NotificationService';

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

export class AutoAttendanceService {
  private clockInJob: cron.ScheduledTask | null = null;
  private clockOutJob: cron.ScheduledTask | null = null;

  
  public initialize(): void {
    if (!process.env.ENABLE_AUTO_CLOCKIN && !process.env.ENABLE_AUTO_CLOCKOUT) {
      logger.info('Auto attendance is disabled');
      return;
    }

    if (process.env.ENABLE_AUTO_CLOCKIN === 'true') {
      this.clockInJob = cron.schedule('* * * * *', async () => {
        await this.processAutoClockIn();
      });
      logger.info('Auto clock-in service initialized');
    }

    // Run clock-out check every minute
    if (process.env.ENABLE_AUTO_CLOCKOUT === 'true') {
      this.clockOutJob = cron.schedule('* * * * *', async () => {
        await this.processAutoClockOut();
      });
      logger.info('Auto clock-out service initialized');
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
  }

  /**
   * Process automatic clock-in for all eligible companies
   */
  public async processAutoClockIn(): Promise<{ clockedIn: number; companiesProcessed: number }> {
    try {
      const companies = await this.getEligibleCompanies('clockin');
      
      let totalClockedIn = 0;
      for (const company of companies) {
        const clockedIn = await this.clockInEmployees(company);
        totalClockedIn += clockedIn;
      }
      
      return { clockedIn: totalClockedIn, companiesProcessed: companies.length };
    } catch (error) {
      logger.error({ error }, 'Error processing auto clock-in');
      return { clockedIn: 0, companiesProcessed: 0 };
    }
  }

  /**
   * Process automatic clock-out for all eligible companies
   */
  public async processAutoClockOut(): Promise<{ clockedOut: number; companiesProcessed: number }> {
    try {
      const companies = await this.getEligibleCompanies('clockout');
      
      let totalClockedOut = 0;
      for (const company of companies) {
        const clockedOut = await this.clockOutEmployees(company);
        totalClockedOut += clockedOut;
      }
      
      return { clockedOut: totalClockedOut, companiesProcessed: companies.length };
    } catch (error) {
      logger.error({ error }, 'Error processing auto clock-out');
      return { clockedOut: 0, companiesProcessed: 0 };
    }
  }


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

  private async clockInEmployees(company: CompanyWorkConfig): Promise<number> {
    try {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { 
        weekday: 'long',
        timeZone: company.timezone 
      }).toLowerCase();
      
      // Check if today is a working day
      if (!company.working_days[currentDay]) {
        return 0;
      }

      // Check if current time is within grace period of work start time
      const currentTime = now.toLocaleTimeString('en-US', {
        hour12: false,
        timeZone: company.timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const workStartTime = company.work_start_time;
      const gracePeriodEnd = this.addMinutes(workStartTime, company.grace_period_minutes);

      if (currentTime >= workStartTime && currentTime <= gracePeriodEnd) {
        // Get employees who haven't clocked in today and have recent location
        const employeesQuery = `
          WITH recent_location AS (
            SELECT DISTINCT ON (ul.user_id)
              ul.user_id,
              ul.is_inside_geofence,
              ul.permission_state,
              ul.created_at
            FROM user_locations ul
            WHERE ul.company_id = $1
              AND ul.created_at >= NOW() - INTERVAL '2 minutes'
            ORDER BY ul.user_id, ul.created_at DESC
          )
          SELECT u.id, u.company_id, rl.is_inside_geofence, rl.permission_state
          FROM users u
          LEFT JOIN attendance_records ar ON 
            u.id = ar.user_id 
            AND DATE(ar.clock_in_time AT TIME ZONE $2) = CURRENT_DATE
          LEFT JOIN recent_location rl ON rl.user_id = u.id
          WHERE u.company_id = $1
            AND u.is_active = true
            AND u.deleted_at IS NULL
            AND ar.id IS NULL
        `;

        const employees = await pool.query(employeesQuery, [company.id, company.timezone]);

        let autoCount = 0;
        for (const employee of employees.rows) {
          const permissionGranted = employee.permission_state === 'granted';
          const insideFence = employee.is_inside_geofence === true;

          // Enforce geofence if required
          if (company.require_geofence_for_clockin) {
            if (!permissionGranted || !insideFence) continue;
          } else {
            // If geofence not required, still respect permission for privacy
            if (!permissionGranted) continue;
          }

          await this.createClockInRecord(employee.id, company.id, true);
          autoCount++;
        }

        if (autoCount > 0) {
          logger.info(`Auto clocked-in ${autoCount} employees for company ${company.id}`);
        }
        
        return autoCount;
      }
      
      // If not within grace period, return 0
      return 0;
    } catch (error) {
      logger.error({ err: error, companyId: company.id }, `Error clocking in employees for company ${company.id}`);
      return 0;
    }
  }

  /**
   * Clock out employees for a company
   */
  private async clockOutEmployees(company: CompanyWorkConfig): Promise<number> {
    try {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { 
        weekday: 'long',
        timeZone: company.timezone 
      }).toLowerCase();
      
      // Check if today is a working day
      if (!company.working_days[currentDay]) {
        return 0;
      }

      // Check if current time is at or past work end time
      const currentTime = now.toLocaleTimeString('en-US', {
        hour12: false,
        timeZone: company.timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      if (currentTime >= company.work_end_time) {
        // Get employees who are clocked in but haven't clocked out, and have left geofence recently
        const employeesQuery = `
          WITH recent_location AS (
            SELECT DISTINCT ON (ul.user_id)
              ul.user_id,
              ul.is_inside_geofence,
              ul.permission_state,
              ul.created_at
            FROM user_locations ul
            WHERE ul.company_id = $1
              AND ul.created_at >= NOW() - INTERVAL '5 minutes'
            ORDER BY ul.user_id, ul.created_at DESC
          )
          SELECT ar.id, ar.user_id, ar.company_id, rl.is_inside_geofence, rl.permission_state, rl.created_at AS rl_created_at
          FROM attendance_records ar
          LEFT JOIN recent_location rl ON rl.user_id = ar.user_id
          WHERE ar.company_id = $1
            AND DATE(ar.clock_in_time AT TIME ZONE $2) = CURRENT_DATE
            AND ar.clock_out_time IS NULL
        `;

        const employees = await pool.query(employeesQuery, [company.id, company.timezone]);

        let autoCount = 0;
        for (const record of employees.rows) {
          const permissionGranted = record.permission_state === 'granted';
          const insideFence = record.is_inside_geofence === true;
          const lastLocAt: Date | null = record.rl_created_at ? new Date(record.rl_created_at) : null;

          // Early departure alert before official end time
          const currentTime = now.toLocaleTimeString('en-US', {
            hour12: false,
            timeZone: company.timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          if (currentTime < company.work_end_time) {
            if (permissionGranted && !insideFence && company.notify_early_departure) {
              await notificationService.sendPushNotification({
                userId: record.user_id,
                title: 'You left early?',
                body: 'You appear outside the office before shift end. If you are on a break or errand, ignore.',
                data: {
                  type: 'attendance',
                  action: 'early_departure_check',
                }
              });
              await pool.query(
                `UPDATE attendance_records 
                 SET early_departure_notified = true, updated_at = NOW()
                 WHERE id = $1 AND early_departure_notified IS NOT TRUE`,
                [record.id]
              );
            }
            continue;
          }

          // Only auto clock-out when permission is granted, user is outside geofence, and has been outside for >= 30 minutes
          if (!permissionGranted) continue;
          if (insideFence) continue;
          if (!lastLocAt) continue;
          const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
          if (lastLocAt > thirtyMinutesAgo) continue;

          await this.updateClockOutRecord(record.id, true);
          autoCount++;

          await notificationService.sendPushNotification({
            userId: record.user_id,
            title: 'Auto Clock-out',
            body: 'You were clocked out automatically after leaving the office.',
            data: {
              type: 'attendance',
              action: 'auto_clockout',
            }
          });
        }

        if (autoCount > 0) {
          logger.info(`Auto clocked-out ${autoCount} employees for company ${company.id}`);
        }
        
        return autoCount;

        // Forgotten clock-out reminder around +60 minutes past end time
        const endPlus60 = this.addMinutes(company.work_end_time, 60);
        const endPlus65 = this.addMinutes(company.work_end_time, 65);
        const currentStr = now.toLocaleTimeString('en-US', {
          hour12: false,
          timeZone: company.timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        if (currentStr >= endPlus60 && currentStr <= endPlus65) {
          const openRes = await pool.query(`
            SELECT ar.id, ar.user_id 
            FROM attendance_records ar 
            WHERE ar.company_id = $1
              AND DATE(ar.clock_in_time AT TIME ZONE $2) = CURRENT_DATE
              AND ar.clock_out_time IS NULL
          `, [company.id, company.timezone]);
          for (const rec of openRes.rows) {
            await notificationService.sendPushNotification({
              userId: rec.user_id,
              title: 'Reminder: Clock Out',
              body: 'Your shift has ended. Please remember to clock out.',
              data: {
                type: 'attendance',
                action: 'reminder_clockout',
              }
            });
          }
        }
      }
      
      // If not past work end time, return 0
      return 0;
    } catch (error) {
      logger.error({ err: error, companyId: company.id }, `Error clocking out employees for company ${company.id}`);
      return 0;
    }
  }

  /**
   * Create a clock-in record
   */
  private async createClockInRecord(
    userId: string, 
    companyId: string, 
    isAuto: boolean
  ): Promise<void> {
    const query = `
      INSERT INTO attendance_records (
        company_id,
        user_id,
        clock_in_time,
        status,
        notes
      ) VALUES ($1, $2, NOW(), 'present', $3)
    `;

    const notes = isAuto ? 'Auto clock-in' : null;
    await pool.query(query, [companyId, userId, notes]);
  }

  /**
   * Update clock-out record
   */
  private async updateClockOutRecord(recordId: string, isAuto: boolean): Promise<void> {
    const query = `
      UPDATE attendance_records
      SET 
        clock_out_time = NOW(),
        notes = CASE 
          WHEN notes IS NULL THEN $2
          ELSE notes || ' | Auto clock-out'
        END,
        updated_at = NOW()
      WHERE id = $1
    `;

    const notes = isAuto ? 'Auto clock-out' : null;
    await pool.query(query, [recordId, notes]);
  }

  /**
   * Helper to add minutes to a time string
   */
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

  /**
   * Manual trigger for testing
   */
  public async triggerAutoClockIn(companyId: string): Promise<void> {
    const query = `
      SELECT 
        id, 
        timezone, 
        working_days, 
        work_start_time, 
        work_end_time,
        auto_clockin_enabled,
        auto_clockout_enabled,
        grace_period_minutes
      FROM companies
      WHERE id = $1
        AND is_active = true
        AND deleted_at IS NULL
    `;
    
    const result = await pool.query(query, [companyId]);
    
    if (result.rows.length > 0) {
      await this.clockInEmployees(result.rows[0]);
    }
  }

  /**
   * Manual trigger for testing
   */
  public async triggerAutoClockOut(companyId: string): Promise<void> {
    const query = `
      SELECT 
        id, 
        timezone, 
        working_days, 
        work_start_time, 
        work_end_time,
        auto_clockin_enabled,
        auto_clockout_enabled,
        grace_period_minutes
      FROM companies
      WHERE id = $1
        AND is_active = true
        AND deleted_at IS NULL
    `;
    
    const result = await pool.query(query, [companyId]);
    
    if (result.rows.length > 0) {
      await this.clockOutEmployees(result.rows[0]);
    }
  }
}

export const autoAttendanceService = new AutoAttendanceService();

