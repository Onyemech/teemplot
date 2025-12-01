import { query } from '../config/database';
import { logger } from '../utils/logger';
import { notificationService } from './NotificationService';

interface CheckInRequest {
  userId: string;
  companyId: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  method: 'manual' | 'auto';
}

interface CheckOutRequest {
  userId: string;
  companyId: string;
  attendanceId: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  method: 'manual' | 'auto';
  departureReason?: string;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  companyId: string;
  clockInTime: Date;
  clockOutTime?: Date;
  isEarlyDeparture: boolean;
  isLateArrival: boolean;
  minutesEarly: number;
  minutesLate: number;
  departureReason?: string;
  checkInMethod: string;
  checkOutMethod?: string;
  status: string;
}

class EnhancedAttendanceService {
  /**
   * Check in employee with geofence validation
   */
  async checkIn(request: CheckInRequest): Promise<AttendanceRecord> {
    try {
      const { userId, companyId, location, method } = request;

      // Get company settings
      const companyResult = await query(
        `SELECT auto_clockin_enabled, require_geofence_for_clockin, 
                office_latitude, office_longitude, geofence_radius_meters,
                timezone, work_start_time, grace_period_minutes
         FROM companies WHERE id = $1`,
        [companyId]
      );

      if (companyResult.rows.length === 0) {
        throw new Error('Company not found');
      }

      const company = companyResult.rows[0];
      let isWithinGeofence = true;
      let distanceMeters: number | null = null;

      // Check geofence if location provided
      if (location && company.office_latitude && company.office_longitude) {
        const geofenceResult = await query(
          'SELECT * FROM check_geofence($1, $2, $3)',
          [companyId, location.latitude, location.longitude]
        );

        if (geofenceResult.rows.length > 0) {
          isWithinGeofence = geofenceResult.rows[0].is_within;
          distanceMeters = geofenceResult.rows[0].distance_meters;
        }

        // Enforce geofence for manual check-ins if required
        if (method === 'manual' && company.require_geofence_for_clockin && !isWithinGeofence) {
          throw new Error(
            `You must be within ${company.geofence_radius_meters}m of the office to check in. ` +
            `Current distance: ${distanceMeters !== null ? Math.round(distanceMeters) : 'unknown'}m`
          );
        }
      }

      // Check if already checked in today
      const existingResult = await query(
        `SELECT id FROM attendance_records 
         WHERE user_id = $1 
           AND clock_in_time::DATE = CURRENT_DATE 
           AND clock_out_time IS NULL`,
        [userId]
      );

      if (existingResult.rows.length > 0) {
        throw new Error('Already checked in today');
      }

      // Create attendance record
      const attendanceResult = await query(
        `INSERT INTO attendance_records (
          company_id, user_id, clock_in_time, 
          clock_in_location, clock_in_distance_meters,
          is_within_geofence, check_in_method
        ) VALUES ($1, $2, NOW(), $3, $4, $5, $6)
        RETURNING *`,
        [
          companyId,
          userId,
          location ? JSON.stringify(location) : null,
          distanceMeters,
          isWithinGeofence,
          method
        ]
      );

      const attendance = attendanceResult.rows[0];

      // Notify admin if late arrival
      if (attendance.is_late_arrival && attendance.minutes_late > 0) {
        await this.notifyAdminLateArrival(companyId, userId, attendance);
      }

      logger.info({
        userId,
        companyId,
        method,
        isLateArrival: attendance.is_late_arrival,
        minutesLate: attendance.minutes_late,
        isWithinGeofence
      }, 'Employee checked in');

      return this.mapAttendanceRecord(attendance);
    } catch (error: any) {
      logger.error({ error, userId: request.userId }, 'Check-in failed');
      throw error;
    }
  }

  /**
   * Check out employee with early departure detection
   */
  async checkOut(request: CheckOutRequest): Promise<AttendanceRecord> {
    try {
      const { userId, companyId, attendanceId, location, method, departureReason } = request;

      // Get attendance record
      const attendanceResult = await query(
        'SELECT * FROM attendance_records WHERE id = $1 AND user_id = $2',
        [attendanceId, userId]
      );

      if (attendanceResult.rows.length === 0) {
        throw new Error('Attendance record not found');
      }

      const attendance = attendanceResult.rows[0];

      if (attendance.clock_out_time) {
        throw new Error('Already checked out');
      }

      // Get company settings
      const companyResult = await query(
        `SELECT notify_early_departure, early_departure_threshold_minutes,
                office_latitude, office_longitude, timezone
         FROM companies WHERE id = $1`,
        [companyId]
      );

      const company = companyResult.rows[0];
      let distanceMeters: number | null = null;

      // Check geofence if location provided
      if (location && company.office_latitude && company.office_longitude) {
        const geofenceResult = await query(
          'SELECT * FROM check_geofence($1, $2, $3)',
          [companyId, location.latitude, location.longitude]
        );

        if (geofenceResult.rows.length > 0) {
          distanceMeters = geofenceResult.rows[0].distance_meters;
        }
      }

      // Update attendance record
      const updateResult = await query(
        `UPDATE attendance_records 
         SET clock_out_time = NOW(),
             clock_out_location = $1,
             clock_out_distance_meters = $2,
             check_out_method = $3,
             departure_reason = $4
         WHERE id = $5
         RETURNING *`,
        [
          location ? JSON.stringify(location) : null,
          distanceMeters,
          method,
          departureReason,
          attendanceId
        ]
      );

      const updatedAttendance = updateResult.rows[0];

      // Notify admin if early departure
      if (updatedAttendance.is_early_departure && company.notify_early_departure) {
        await this.notifyAdminEarlyDeparture(
          companyId,
          userId,
          updatedAttendance,
          departureReason
        );
      }

      logger.info({
        userId,
        companyId,
        method,
        isEarlyDeparture: updatedAttendance.is_early_departure,
        minutesEarly: updatedAttendance.minutes_early,
        hasDepartureReason: !!departureReason
      }, 'Employee checked out');

      return this.mapAttendanceRecord(updatedAttendance);
    } catch (error: any) {
      logger.error({ error, userId: request.userId }, 'Check-out failed');
      throw error;
    }
  }

  /**
   * Get current attendance status for user
   */
  async getCurrentAttendance(userId: string): Promise<AttendanceRecord | null> {
    try {
      const result = await query(
        `SELECT * FROM attendance_records 
         WHERE user_id = $1 
           AND clock_in_time::DATE = CURRENT_DATE 
         ORDER BY clock_in_time DESC 
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapAttendanceRecord(result.rows[0]);
    } catch (error: any) {
      logger.error({ error, userId }, 'Failed to get current attendance');
      throw error;
    }
  }

  /**
   * Auto check-in employees within geofence
   */
  async processAutoCheckIn(companyId: string): Promise<number> {
    try {
      // Get employees eligible for auto check-in
      const employeesResult = await query(
        'SELECT * FROM get_employees_for_auto_checkin($1)',
        [companyId]
      );

      let checkedInCount = 0;

      for (const employee of employeesResult.rows) {
        try {
          // In a real implementation, you would check if employee's device
          // is within geofence using their last known location
          // For now, we'll skip the actual check-in
          // This would be triggered by a mobile app sending location updates

          logger.info({
            userId: employee.user_id,
            companyId
          }, 'Employee eligible for auto check-in');

          checkedInCount++;
        } catch (error: any) {
          logger.error({
            error,
            userId: employee.user_id
          }, 'Auto check-in failed for employee');
        }
      }

      return checkedInCount;
    } catch (error: any) {
      logger.error({ error, companyId }, 'Auto check-in process failed');
      return 0;
    }
  }

  /**
   * Auto check-out employees who left office
   */
  async processAutoCheckOut(companyId: string): Promise<number> {
    try {
      // Get company settings
      const companyResult = await query(
        `SELECT auto_clockout_enabled, timezone, work_end_time
         FROM companies WHERE id = $1`,
        [companyId]
      );

      if (companyResult.rows.length === 0 || !companyResult.rows[0].auto_clockout_enabled) {
        return 0;
      }

      // Get employees who are checked in but haven't checked out
      const attendanceResult = await query(
        `SELECT ar.*, u.email, u.first_name, u.last_name
         FROM attendance_records ar
         JOIN users u ON ar.user_id = u.id
         WHERE ar.company_id = $1
           AND ar.clock_in_time::DATE = CURRENT_DATE
           AND ar.clock_out_time IS NULL
           AND u.is_active = true`,
        [companyId]
      );

      let checkedOutCount = 0;

      for (const attendance of attendanceResult.rows) {
        try {
          // In a real implementation, check if employee left geofence
          // This would be triggered by mobile app location updates
          // showing employee is no longer within office radius

          logger.info({
            userId: attendance.user_id,
            companyId
          }, 'Employee eligible for auto check-out');

          checkedOutCount++;
        } catch (error: any) {
          logger.error({
            error,
            userId: attendance.user_id
          }, 'Auto check-out failed for employee');
        }
      }

      return checkedOutCount;
    } catch (error: any) {
      logger.error({ error, companyId }, 'Auto check-out process failed');
      return 0;
    }
  }

  /**
   * Notify admin/owner about late arrival
   */
  private async notifyAdminLateArrival(
    companyId: string,
    userId: string,
    attendance: any
  ): Promise<void> {
    try {
      // Get employee details
      const userResult = await query(
        'SELECT first_name, last_name, email FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) return;

      const user = userResult.rows[0];

      // Get admin/owner users
      const adminsResult = await query(
        `SELECT id, email, first_name FROM users 
         WHERE company_id = $1 
           AND role IN ('owner', 'admin') 
           AND is_active = true`,
        [companyId]
      );

      // Send notifications to all admins
      for (const admin of adminsResult.rows) {
        await notificationService.sendPushNotification({
          userId: admin.id,
          title: 'Late Arrival',
          body: `${user.first_name} ${user.last_name} arrived ${attendance.minutes_late} minutes late`,
          data: {
            companyId,
            type: 'warning',
            employeeId: userId,
            employeeName: `${user.first_name} ${user.last_name}`,
            minutesLate: attendance.minutes_late,
            clockInTime: attendance.clock_in_time
          }
        });

        // Send email notification
        await notificationService.sendEmail({
          to: admin.email,
          subject: `Late Arrival: ${user.first_name} ${user.last_name}`,
          html: `
            <h2>Late Arrival Notification</h2>
            <p><strong>${user.first_name} ${user.last_name}</strong> arrived late today.</p>
            <ul>
              <li><strong>Minutes Late:</strong> ${attendance.minutes_late}</li>
              <li><strong>Check-in Time:</strong> ${new Date(attendance.clock_in_time).toLocaleString()}</li>
            </ul>
          `
        });
      }

      // Mark as notified
      await query(
        'UPDATE attendance_records SET admin_notified_late = true WHERE id = $1',
        [attendance.id]
      );

      logger.info({
        userId,
        companyId,
        minutesLate: attendance.minutes_late
      }, 'Admin notified of late arrival');
    } catch (error: any) {
      logger.error({ error, userId, companyId }, 'Failed to notify admin of late arrival');
    }
  }

  /**
   * Notify admin/owner about early departure
   */
  private async notifyAdminEarlyDeparture(
    companyId: string,
    userId: string,
    attendance: any,
    departureReason?: string
  ): Promise<void> {
    try {
      // Get employee details
      const userResult = await query(
        'SELECT first_name, last_name, email FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) return;

      const user = userResult.rows[0];

      // Get admin/owner users
      const adminsResult = await query(
        `SELECT id, email, first_name FROM users 
         WHERE company_id = $1 
           AND role IN ('owner', 'admin') 
           AND is_active = true`,
        [companyId]
      );

      // Send notifications to all admins
      for (const admin of adminsResult.rows) {
        await notificationService.sendPushNotification({
          userId: admin.id,
          title: 'Early Departure',
          body: `${user.first_name} ${user.last_name} left ${attendance.minutes_early} minutes early${departureReason ? `: ${departureReason}` : ''}`,
          data: {
            companyId,
            type: 'early_departure',
            employeeId: userId,
            employeeName: `${user.first_name} ${user.last_name}`,
            minutesEarly: attendance.minutes_early,
            clockOutTime: attendance.clock_out_time,
            departureReason: departureReason || null
          }
        });

        // Send email notification
        await notificationService.sendEmail({
          to: admin.email,
          subject: `Early Departure: ${user.first_name} ${user.last_name}`,
          html: `
            <h2>Early Departure Notification</h2>
            <p><strong>${user.first_name} ${user.last_name}</strong> left work early today.</p>
            <ul>
              <li><strong>Minutes Early:</strong> ${attendance.minutes_early}</li>
              <li><strong>Check-out Time:</strong> ${new Date(attendance.clock_out_time).toLocaleString()}</li>
              ${departureReason ? `<li><strong>Reason:</strong> ${departureReason}</li>` : ''}
            </ul>
          `
        });
      }

      // Mark as notified
      await query(
        'UPDATE attendance_records SET early_departure_notified = true WHERE id = $1',
        [attendance.id]
      );

      logger.info({
        userId,
        companyId,
        minutesEarly: attendance.minutes_early,
        hasDepartureReason: !!departureReason
      }, 'Admin notified of early departure');
    } catch (error: any) {
      logger.error({ error, userId, companyId }, 'Failed to notify admin of early departure');
    }
  }

  /**
   * Map database record to AttendanceRecord
   */
  private mapAttendanceRecord(row: any): AttendanceRecord {
    return {
      id: row.id,
      userId: row.user_id,
      companyId: row.company_id,
      clockInTime: row.clock_in_time,
      clockOutTime: row.clock_out_time,
      isEarlyDeparture: row.is_early_departure || false,
      isLateArrival: row.is_late_arrival || false,
      minutesEarly: row.minutes_early || 0,
      minutesLate: row.minutes_late || 0,
      departureReason: row.departure_reason,
      checkInMethod: row.check_in_method || 'manual',
      checkOutMethod: row.check_out_method,
      status: row.status
    };
  }
}

export const enhancedAttendanceService = new EnhancedAttendanceService();
