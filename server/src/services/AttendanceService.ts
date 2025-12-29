import { pool, transaction } from '../config/database';
import { logger } from '../utils/logger';
import { calculateDistance, isWithinGeofence, Coordinates } from '../utils/geolocation';
import { notificationService } from './NotificationService';

export interface ClockInData {
  userId: string;
  companyId: string;
  location?: Coordinates;
  accuracy?: number;
}

export interface ClockOutData {
  userId: string;
  companyId: string;
  location?: Coordinates;
  accuracy?: number;
}

export class AttendanceService {
  /**
   * Clock in with geofence validation
   */
  async clockIn(data: ClockInData): Promise<any> {
    return transaction(async (client) => {
      // Get company configuration
      const companyQuery = `
        SELECT 
          id,
          office_latitude,
          office_longitude,
          geofence_radius_meters,
          require_geofence_for_clockin,
          timezone,
          work_start_time,
          grace_period_minutes
        FROM companies
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const companyResult = await client.query(companyQuery, [data.companyId]);

      if (companyResult.rows.length === 0) {
        throw new Error('Company not found');
      }

      const company = companyResult.rows[0];

      // Check if user already clocked in today
      const existingQuery = `
        SELECT id
        FROM attendance_records
        WHERE user_id = $1
          AND company_id = $2
          AND DATE(clock_in_time AT TIME ZONE $3) = CURRENT_DATE
          AND clock_out_time IS NULL
      `;

      const existingResult = await client.query(existingQuery, [
        data.userId,
        data.companyId,
        company.timezone,
      ]);

      if (existingResult.rows.length > 0) {
        throw new Error('Already clocked in today');
      }

      // Validate geofence if required
      let isWithinFence = true;
      let distance: number | null = null;

      if (
        company.require_geofence_for_clockin &&
        company.office_latitude &&
        company.office_longitude &&
        data.location
      ) {
        const officeLocation: Coordinates = {
          latitude: parseFloat(company.office_latitude),
          longitude: parseFloat(company.office_longitude),
        };

        distance = calculateDistance(data.location, officeLocation);
        isWithinFence = isWithinGeofence(
          data.location,
          officeLocation,
          company.geofence_radius_meters
        );

        if (!isWithinFence) {
          // Get user info for notification
        const userQuery = `
          SELECT first_name, last_name
          FROM users
          WHERE id = $1 AND company_id = $2
        `;
        const userResult = await client.query(userQuery, [data.userId, data.companyId]);
        const user = userResult.rows[0];

          // Notify admins about geofence violation
          await notificationService.notifyGeofenceViolation({
            companyId: data.companyId,
            userId: data.userId,
            userName: `${user.first_name} ${user.last_name}`,
            distance,
            allowedRadius: company.geofence_radius_meters,
          });

          throw new Error(
            `You must be within ${company.geofence_radius_meters}m of the office to clock in. You are ${Math.round(distance)}m away.`
          );
        }
      }

      // Determine if late
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', {
        hour12: false,
        timeZone: company.timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const graceTime = this.addMinutes(
        company.work_start_time,
        company.grace_period_minutes
      );

      const status = currentTime > graceTime ? 'late' : 'present';

      // Create attendance record
      const insertQuery = `
        INSERT INTO attendance_records (
          company_id,
          user_id,
          clock_in_time,
          clock_in_location,
          clock_in_distance_meters,
          is_within_geofence,
          status
        ) VALUES ($1, $2, NOW(), $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        data.companyId,
        data.userId,
        data.location ? JSON.stringify(data.location) : null,
        distance,
        isWithinFence,
        status,
      ]);

      logger.info({
        userId: data.userId,
        status,
        isWithinFence,
        distance,
      }, 'User clocked in');

      return result.rows[0];
    });
  }

  /**
   * Clock out with early departure detection
   */
  async clockOut(data: ClockOutData): Promise<any> {
    return transaction(async (client) => {
      // Get company configuration
      const companyQuery = `
        SELECT 
          id,
          office_latitude,
          office_longitude,
          geofence_radius_meters,
          timezone,
          work_end_time,
          notify_early_departure,
          early_departure_threshold_minutes
        FROM companies
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const companyResult = await client.query(companyQuery, [data.companyId]);

      if (companyResult.rows.length === 0) {
        throw new Error('Company not found');
      }

      const company = companyResult.rows[0];

      // Get today's attendance record
      const recordQuery = `
        SELECT id, clock_in_time, user_id
        FROM attendance_records
        WHERE user_id = $1
          AND company_id = $2
          AND DATE(clock_in_time AT TIME ZONE $3) = CURRENT_DATE
          AND clock_out_time IS NULL
      `;

      const recordResult = await client.query(recordQuery, [
        data.userId,
        data.companyId,
        company.timezone,
      ]);

      if (recordResult.rows.length === 0) {
        throw new Error('No active clock-in record found for today');
      }

      const record = recordResult.rows[0];

      // Calculate distance from office if location provided
      let distance: number | null = null;

      if (
        company.office_latitude &&
        company.office_longitude &&
        data.location
      ) {
        const officeLocation: Coordinates = {
          latitude: parseFloat(company.office_latitude),
          longitude: parseFloat(company.office_longitude),
        };

        distance = calculateDistance(data.location, officeLocation);
      }

      // Check for early departure
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', {
        hour12: false,
        timeZone: company.timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const thresholdTime = this.subtractMinutes(
        company.work_end_time,
        company.early_departure_threshold_minutes
      );

      const isEarlyDeparture = currentTime < thresholdTime;
      const minutesEarly = isEarlyDeparture
        ? this.calculateMinutesDifference(currentTime, company.work_end_time)
        : 0;

      // Update attendance record
      const updateQuery = `
        UPDATE attendance_records
        SET 
          clock_out_time = NOW(),
          clock_out_location = $2,
          clock_out_distance_meters = $3,
          is_early_departure = $4,
          status = CASE 
            WHEN $4 = true THEN 'early_departure'
            ELSE status
          END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        record.id,
        data.location ? JSON.stringify(data.location) : null,
        distance,
        isEarlyDeparture,
      ]);

      // Notify admins if early departure and notifications enabled
      if (isEarlyDeparture && company.notify_early_departure) {
        const userQuery = `
          SELECT first_name, last_name
          FROM users
          WHERE id = $1
        `;
        const userResult = await client.query(userQuery, [data.userId]);
        const user = userResult.rows[0];

        await notificationService.notifyEarlyDeparture({
          companyId: data.companyId,
          userId: data.userId,
          userName: `${user.first_name} ${user.last_name}`,
          departureTime: now,
          scheduledEndTime: company.work_end_time,
          minutesEarly,
          location: data.location,
        });

        // Mark as notified
        await client.query(
          'UPDATE attendance_records SET early_departure_notified = true WHERE id = $1',
          [record.id]
        );
      }

      logger.info({
        userId: data.userId,
        isEarlyDeparture,
        minutesEarly,
        distance,
      }, 'User clocked out');

      return result.rows[0];
    });
  }

  /**
   * Get user's attendance status for today
   */
  async getTodayStatus(userId: string, companyId: string): Promise<any> {
    const query = `
      SELECT 
        ar.*,
        c.timezone,
        c.work_start_time,
        c.work_end_time
      FROM attendance_records ar
      JOIN companies c ON ar.company_id = c.id
      WHERE ar.user_id = $1
        AND ar.company_id = $2
        AND DATE(ar.clock_in_time AT TIME ZONE c.timezone) = CURRENT_DATE
      ORDER BY ar.clock_in_time DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [userId, companyId]);
    return result.rows[0] || null;
  }

  /**
   * Get attendance history for a user
   */
  async getUserAttendanceHistory(
    userId: string,
    companyId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    let query = `
      SELECT 
        ar.*,
        c.timezone
      FROM attendance_records ar
      JOIN companies c ON ar.company_id = c.id
      WHERE ar.user_id = $1
        AND ar.company_id = $2
    `;

    const params: any[] = [userId, companyId];

    if (startDate) {
      params.push(startDate);
      query += ` AND ar.clock_in_time >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND ar.clock_in_time <= $${params.length}`;
    }

    query += ' ORDER BY ar.clock_in_time DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get company attendance for a specific date
   */
  async getCompanyAttendance(companyId: string, date: string): Promise<any[]> {
    const query = `
      SELECT 
        ar.*,
        u.first_name,
        u.last_name
      FROM attendance_records ar
      JOIN users u ON ar.user_id = u.id
      JOIN companies c ON ar.company_id = c.id
      WHERE ar.company_id = $1
        AND DATE(ar.clock_in_time AT TIME ZONE c.timezone) = $2
      ORDER BY ar.clock_in_time DESC
    `;

    const result = await pool.query(query, [companyId, date]);
    return result.rows;
  }

  /**
   * Helper: Add minutes to time string
   */
  private addMinutes(timeString: string, minutes: number): string {
    const [hours, mins, secs] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes, secs || 0);

    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  /**
   * Helper: Subtract minutes from time string
   */
  private subtractMinutes(timeString: string, minutes: number): string {
    return this.addMinutes(timeString, -minutes);
  }

  /**
   * Helper: Calculate minutes difference between two time strings
   */
  private calculateMinutesDifference(time1: string, time2: string): number {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);

    const minutes1 = h1 * 60 + m1;
    const minutes2 = h2 * 60 + m2;

    return Math.abs(minutes2 - minutes1);
  }
}

export const attendanceService = new AttendanceService();

