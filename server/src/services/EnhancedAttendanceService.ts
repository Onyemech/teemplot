import { query } from '../config/database';
import { logger } from '../utils/logger';
import { notificationService } from './NotificationService';
import { auditService } from './AuditService';
import { formatDuration } from '../utils/attendanceFormatter';

interface CheckInRequest {
  userId: string;
  companyId: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  method: 'manual' | 'auto';
  biometricsProof?: string;
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
  biometricsProof?: string;
}

export interface AttendanceRecord {
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
  isWithinGeofence?: boolean;
  clockInDistanceMeters?: number;
  breaks?: {
    id: string;
    startTime: string;
    endTime?: string;
    duration?: number;
  }[];
  totalBreakMinutes?: number;
}

class EnhancedAttendanceService {

  async checkIn(request: CheckInRequest): Promise<AttendanceRecord> {
    try {
      const { userId, companyId, location, method, biometricsProof } = request;

      // Get company settings
      const companyResult = await query(
        `SELECT 
          c.auto_clockin_enabled,
          c.require_geofence_for_clockin,
          c.office_latitude,
          c.office_longitude,
          c.geofence_radius_meters,
          c.timezone,
          c.work_start_time,
          c.grace_period_minutes,
          c.biometrics_required,
          COALESCE(c.allow_remote_clockin, cs.allow_remote_clockin, false) AS allow_remote_clockin,
          c.allow_remote_clockin_on_non_working_days,
          c.working_days AS working_days_json,
          cs.working_days AS working_days_array,
          COALESCE(cs.allow_remote_clockin_on_non_working_days, false) AS allow_remote_clockin_on_non_working_days_settings
         FROM companies c
         LEFT JOIN company_settings cs ON c.id = cs.company_id
         WHERE c.id = $1`,
        [companyId]
      );

      if (companyResult.rows.length === 0) {
        throw new Error('Company not found');
      }

      const company = companyResult.rows[0];

      // Check biometrics if required
      if (company.biometrics_required && method === 'manual') {
        if (!biometricsProof) {
          throw new Error('Biometric verification required');
        }
      }

      // STRICT CHECK: Auto-Clockin
      if (method === 'auto' && !company.auto_clockin_enabled) {
        logger.warn({ userId, companyId }, 'Auto check-in attempted but disabled');
        throw new Error('Auto check-in is disabled for this company');
      }

      // Get user settings (Remote Clock-in permission)
      const userResult = await query(
        'SELECT allow_remote_clockin, company_id, is_active FROM users WHERE id = $1 AND deleted_at IS NULL',
        [userId]
      );
      const userSettings = userResult.rows[0];
      if (!userSettings) {
        throw new Error('User not found or inactive');
      }
      if (String(userSettings.company_id) !== String(companyId)) {
        throw new Error('Invalid company relationship for this user');
      }
      if (userSettings.is_active === false) {
        throw new Error('User not active');
      }

      const globalRemoteAllowed = company.allow_remote_clockin === true;
      const userRemoteAllowed = userSettings?.allow_remote_clockin === true;
      const remoteAllowed = globalRemoteAllowed || userRemoteAllowed;

      const allowRemoteOnNonWorkingDays =
        company.allow_remote_clockin_on_non_working_days === true ||
        company.allow_remote_clockin_on_non_working_days_settings === true;

      let isWithinGeofence = true;
      let distanceMeters: number | null = null;
      let locationId: string | null = null;
      let locationName: string | null = null;
      let requiresRemoteOnNonWorkingDay = false;

      {
        const tz = company.timezone || 'UTC';
        const nowIsoDowResult = await query(
          'SELECT EXTRACT(ISODOW FROM (NOW() AT TIME ZONE $1))::int AS isodow',
          [tz]
        );
        const isodow = nowIsoDowResult.rows[0]?.isodow;
        const jsDow = isodow % 7;

        const workingDaysList: number[] = Array.isArray(company.working_days_array)
          ? company.working_days_array.map((n: any) => Number(n)).filter((n: number) => !Number.isNaN(n))
          : [];

        let workingDaysJson: any = null;
        if (company.working_days_json) {
          try {
            workingDaysJson =
              typeof company.working_days_json === 'string' ? JSON.parse(company.working_days_json) : company.working_days_json;
          } catch {
            workingDaysJson = null;
          }
        }

        let isWorkingDay = true;
        if (workingDaysJson) {
          if (Array.isArray(workingDaysJson)) {
            isWorkingDay = workingDaysJson.includes(isodow) || workingDaysJson.includes(jsDow) || (jsDow === 0 && workingDaysJson.includes(7));
          } else {
            isWorkingDay = Boolean(workingDaysJson[String(isodow)]) || Boolean(workingDaysJson[String(jsDow)]);
          }
        } else if (workingDaysList.length > 0 && typeof isodow === 'number') {
          isWorkingDay = workingDaysList.includes(isodow);
        } else if (typeof isodow === 'number') {
          isWorkingDay = [1, 2, 3, 4, 5].includes(isodow);
        }

        if (!isWorkingDay) {
          if (!(method === 'manual' && allowRemoteOnNonWorkingDays && remoteAllowed)) {
            throw new Error('Today is not a working day according to company policy. Please contact your administrator if you need to work today.');
          }
          if (!location) {
            throw new Error('Location is required to check in remotely on non-working days.');
          }
          requiresRemoteOnNonWorkingDay = true;
        }
      }

      // Check geofence if location provided
      if (location) {
        // v2 check_geofence returns table (is_within, distance_meters, location_id, location_name)
        const geofenceResult = await query(
          'SELECT * FROM public.check_geofence($1, $2, $3)',
          [companyId, location.latitude, location.longitude]
        );

        if (geofenceResult.rows.length === 0) {
          if (company.require_geofence_for_clockin || requiresRemoteOnNonWorkingDay) {
            throw new Error('Office location is not configured for geofence validation. Please contact your administrator.');
          }
        } else {
          isWithinGeofence = geofenceResult.rows[0].is_within;
          distanceMeters = geofenceResult.rows[0].distance_meters;
          locationId = geofenceResult.rows[0].location_id;
          locationName = geofenceResult.rows[0].location_name;
        }

        if (method === 'manual' && company.require_geofence_for_clockin && !isWithinGeofence && !remoteAllowed) {
          throw new Error(
            `You must be within the geofence to check in. ` +
            `Distance: ${distanceMeters !== null && !isNaN(distanceMeters) ? Math.round(distanceMeters) + 'm' : 'Unknown'}`
          );
        }

        if (requiresRemoteOnNonWorkingDay && isWithinGeofence) {
          throw new Error('Today is not a working day according to company policy. Please contact your administrator if you need to work today.');
        }

        // If remote is allowed and they are outside, we still record the distance but set isWithinGeofence to true for record keeping?
        // Actually, let's keep isWithinGeofence as the physical reality, but the enforcement is what changes.
        // The attendance record field 'is_within_geofence' should show if they WERE physically within.
      }

      // Create attendance record
      const attendanceResult = await query(
        `INSERT INTO attendance_records (
          company_id, user_id, clock_in_time, 
          clock_in_location, clock_in_distance_meters,
          is_within_geofence, check_in_method,
          location_id, location_address
        ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          companyId,
          userId,
          location ? JSON.stringify(location) : null,
          distanceMeters,
          isWithinGeofence,
          method,
          locationId,
          locationName || location?.address || null
        ]
      );

      const attendance = attendanceResult.rows[0];

      // Notify admin if late arrival
      if (attendance.is_late_arrival && attendance.minutes_late > 0) {
        await this.notifyAdminLateArrival(companyId, userId, attendance);
        
        // Audit log for late arrival
        await auditService.logAction({
          userId,
          companyId,
          action: 'LATE_ARRIVAL',
          entityType: 'attendance',
          entityId: attendance.id,
          metadata: {
             minutesLate: attendance.minutes_late,
             clockInTime: attendance.clock_in_time
          }
        });
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
      const { userId, companyId, attendanceId, location, method, departureReason, biometricsProof } = request;

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
                office_latitude, office_longitude, timezone,
                biometrics_required
         FROM companies WHERE id = $1`,
        [companyId]
      );

      const company = companyResult.rows[0];

      // Check biometrics if required
      if (company.biometrics_required && method === 'manual') {
        if (!biometricsProof) {
          throw new Error('Biometric verification required');
        }
      }

      let distanceMeters: number | null = null;

      // Check geofence if location provided
      if (location && company.office_latitude && company.office_longitude) {
        const geofenceResult = await query(
          'SELECT * FROM public.check_geofence($1, $2, $3)',
          [companyId, location.latitude, location.longitude]
        );

        if (geofenceResult.rows.length > 0) {
          distanceMeters = geofenceResult.rows[0].distance_meters;
        }
      }

      // Check for active breaks and close them
      const activeBreaks = await query(
        `SELECT id FROM attendance_breaks 
         WHERE attendance_record_id = $1 AND end_time IS NULL`,
        [attendanceId]
      );

      if (activeBreaks.rows.length > 0) {
        await query(
          `UPDATE attendance_breaks 
           SET end_time = NOW(),
               duration_minutes = EXTRACT(EPOCH FROM (NOW() - start_time))/60
           WHERE attendance_record_id = $1 AND end_time IS NULL`,
          [attendanceId]
        );
        logger.info({ userId, attendanceId }, 'Auto-closed active break on checkout');
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

        // Audit log for early departure
        await auditService.logAction({
          userId,
          companyId,
          action: 'EARLY_DEPARTURE',
          entityType: 'attendance',
          entityId: attendanceId,
          metadata: {
             minutesEarly: updatedAttendance.minutes_early,
             clockOutTime: updatedAttendance.clock_out_time,
             departureReason
          }
        });
      }

      // Meal eligibility removed per rollback; attendance remains focused on breaks and core status

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
   * Start a break for an employee
   */
  async startBreak(userId: string, companyId: string): Promise<AttendanceRecord> {
    try {
      // Get current attendance
      const attendance = await this.getCurrentAttendance(userId, companyId);

      if (!attendance) {
        throw new Error('You must be clocked in to start a break');
      }

      if (attendance.clockOutTime) {
        throw new Error('Cannot start break after clocking out');
      }

      // Check if already on break
      const activeBreak = await query(
        `SELECT id FROM attendance_breaks 
         WHERE attendance_record_id = $1 AND end_time IS NULL`,
        [attendance.id]
      );

      if (activeBreak.rows.length > 0) {
        throw new Error('You are already on a break');
      }

      // Check company settings
      const companyResult = await query(
        'SELECT breaks_enabled FROM companies WHERE id = $1',
        [companyId]
      );

      if (!companyResult.rows[0]?.breaks_enabled) {
        throw new Error('Breaks are not enabled for this company');
      }

      // Start break
      await query(
        `INSERT INTO attendance_breaks (attendance_record_id, start_time)
         VALUES ($1, NOW())`,
        [attendance.id]
      );

      // Update status to 'on_break'
      await query(
        `UPDATE attendance_records SET status = 'on_break' WHERE id = $1`,
        [attendance.id]
      );

      logger.info({ userId, companyId, attendanceId: attendance.id }, 'Break started');

      return this.getCurrentAttendance(userId, companyId) as Promise<AttendanceRecord>;
    } catch (error: any) {
      logger.error({ error, userId }, 'Failed to start break');
      throw error;
    }
  }

  /**
   * End a break for an employee
   */
  async endBreak(userId: string, companyId: string): Promise<AttendanceRecord> {
    try {
      // Get current attendance
      const attendance = await this.getCurrentAttendance(userId, companyId);

      if (!attendance) {
        throw new Error('Attendance record not found');
      }

      // Find active break
      const breakResult = await query(
        `SELECT id, start_time FROM attendance_breaks 
         WHERE attendance_record_id = $1 AND end_time IS NULL`,
        [attendance.id]
      );

      if (breakResult.rows.length === 0) {
        throw new Error('No active break found');
      }

      const breakRecord = breakResult.rows[0];

      // Calculate duration
      // We let the DB handle the timestamp diff or calculate here. 
      // Ideally update end_time = NOW() and let a trigger or query calc duration.
      // Here we'll just update end_time and calculate duration in minutes.

      await query(
        `UPDATE attendance_breaks 
         SET end_time = NOW(),
             duration_minutes = EXTRACT(EPOCH FROM (NOW() - start_time))/60
         WHERE id = $1`,
        [breakRecord.id]
      );

      // Update status back to 'present' (or 'late' if they were late, but simplest is 'present')
      // NOTE: If they were originally late, we might want to preserve that, but 'present' usually implies 'currently working'
      await query(
        `UPDATE attendance_records SET status = 'present' WHERE id = $1`,
        [attendance.id]
      );

      logger.info({ userId, companyId, attendanceId: attendance.id }, 'Break ended');

      return this.getCurrentAttendance(userId, companyId) as Promise<AttendanceRecord>;
    } catch (error: any) {
      logger.error({ error, userId }, 'Failed to end break');
      throw error;
    }
  }

  /**
   * Get current attendance status for user
   */
  async getCurrentAttendance(userId: string, companyId: string): Promise<AttendanceRecord | null> {
    try {
      const result = await query(
        `SELECT * FROM attendance_records 
         WHERE user_id = $1 
           AND company_id = $2
           AND clock_in_time::DATE = CURRENT_DATE 
         ORDER BY clock_in_time DESC 
         LIMIT 1`,
        [userId, companyId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapAttendanceRecord(result.rows[0], true);
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
      // Get company settings
      const companyResult = await query(
        'SELECT auto_clockin_enabled FROM companies WHERE id = $1',
        [companyId]
      );

      if (companyResult.rows.length === 0 || !companyResult.rows[0].auto_clockin_enabled) {
        logger.info({ companyId }, 'Auto clock-in skipped: disabled or company not found');
        return 0;
      }

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
        'SELECT first_name, last_name, email FROM users WHERE id = $1 AND company_id = $2',
        [userId, companyId]
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
      const formattedLate = formatDuration(attendance.minutes_late, { format: 'long' });
      for (const admin of adminsResult.rows) {
        await notificationService.sendPushNotification({
          userId: admin.id,
          title: 'Late Arrival',
          body: `${user.first_name} ${user.last_name} arrived ${formattedLate} late`,
          data: {
            companyId,
            type: 'warning',
            employeeId: userId,
            employeeName: `${user.first_name} ${user.last_name}`,
            minutesLate: attendance.minutes_late,
            clockInTime: attendance.clock_in_time,
            url: '/dashboard/attendance'
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
              <li><strong>Minutes Late:</strong> ${formattedLate}</li>
              <li><strong>Check-in Time:</strong> ${new Date(attendance.clock_in_time).toLocaleString()}</li>
            </ul>
            <p><a href="${process.env.FRONTEND_URL}/dashboard/attendance">View Attendance</a></p>
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
        'SELECT first_name, last_name, email FROM users WHERE id = $1 AND company_id = $2',
        [userId, companyId]
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
      const formattedEarly = formatDuration(attendance.minutes_early, { format: 'long' });
      for (const admin of adminsResult.rows) {
        await notificationService.sendPushNotification({
          userId: admin.id,
          title: 'Early Departure',
          body: `${user.first_name} ${user.last_name} left ${formattedEarly} early${departureReason ? `: ${departureReason}` : ''}`,
          data: {
            companyId,
            type: 'early_departure',
            employeeId: userId,
            employeeName: `${user.first_name} ${user.last_name}`,
            minutesEarly: attendance.minutes_early,
            clockOutTime: attendance.clock_out_time,
            departureReason: departureReason || null,
            url: '/dashboard/attendance'
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
              <li><strong>Minutes Early:</strong> ${formattedEarly}</li>
              <li><strong>Check-out Time:</strong> ${new Date(attendance.clock_out_time).toLocaleString()}</li>
              ${departureReason ? `<li><strong>Reason:</strong> ${departureReason}</li>` : ''}
            </ul>
            <p><a href="${process.env.FRONTEND_URL}/dashboard/attendance">View Attendance</a></p>
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
  /**
   * Map database record to AttendanceRecord
   */
  private async mapAttendanceRecord(row: any, includeBreaks: boolean = false): Promise<AttendanceRecord> {
    let breaks: any[] = [];
    let totalBreakMinutes = 0;

    if (includeBreaks || row.id) { // Always fetch if we have an ID, or make logic tighter
      // Fetches breaks if requested. 
      // Note: For 'getCompanyAttendance' (bulk), executing a query per row is bad for performance.
      // It's better to JOIN in the main query or fetch separately.
      // For 'getCurrentAttendance' (single), this is fine.
      if (includeBreaks) {
        const breaksResult = await query(
          `SELECT id, start_time, end_time, duration_minutes 
                 FROM attendance_breaks 
                 WHERE attendance_record_id = $1 
                 ORDER BY start_time ASC`,
          [row.id]
        );
        breaks = breaksResult.rows.map(b => ({
          id: b.id,
          startTime: b.start_time,
          endTime: b.end_time,
          duration: b.duration_minutes
        }));

        totalBreakMinutes = breaks.reduce((acc, b) => acc + (b.duration || 0), 0);
      }
    }

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
      status: row.status,
      isWithinGeofence: row.is_within_geofence,
      clockInDistanceMeters: row.clock_in_distance_meters,
      breaks: breaks.length > 0 ? breaks : undefined,
      totalBreakMinutes: totalBreakMinutes > 0 ? totalBreakMinutes : undefined
    };
  }

  /**
   * Get company attendance with filtering and pagination
   */
  async getCompanyAttendance(
    companyId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      department?: string;
      search?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ data: any[]; total: number }> {
    try {
      const conditions: string[] = ['ar.company_id = $1'];
      const params: any[] = [companyId];
      let paramCount = 1;

      if (filters.startDate) {
        paramCount++;
        conditions.push(`ar.clock_in_time >= $${paramCount}`);
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        paramCount++;
        conditions.push(`ar.clock_in_time <= $${paramCount}`);
        params.push(filters.endDate);
      }

      if (filters.department) {
        paramCount++;
        conditions.push(`d.name = $${paramCount}`);
        params.push(filters.department);
      }

      if (filters.status) {
        paramCount++;
        conditions.push(`ar.status = $${paramCount}`);
        params.push(filters.status);
      }

      if (filters.search) {
        paramCount++;
        conditions.push(`(u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
        params.push(`%${filters.search}%`);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) 
         FROM attendance_records ar
         JOIN users u ON ar.user_id = u.id
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].count);

      // Get data with optimized subqueries for breaks to avoid N+1
      let queryStr = `
        SELECT ar.*, u.first_name, u.last_name, u.email, u.position,
        d.name as department,
        CASE 
          WHEN ar.is_within_geofence THEN 'onsite'
          WHEN ar.clock_in_location IS NOT NULL THEN 'remote'
          ELSE 'onsite'
        END as location_type,
        (
          SELECT SUM(duration_minutes) 
          FROM attendance_breaks 
          WHERE attendance_record_id = ar.id
        ) as total_break_minutes,
        (
          SELECT json_agg(json_build_object(
            'id', id,
            'startTime', start_time,
            'endTime', end_time,
            'duration', duration_minutes
          ))
          FROM attendance_breaks 
          WHERE attendance_record_id = ar.id
        ) as breaks_json
        FROM attendance_records ar
        JOIN users u ON ar.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE ${whereClause}
        ORDER BY ar.clock_in_time DESC
      `;

      if (filters.limit) {
        paramCount++;
        queryStr += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      if (filters.offset !== undefined) {
        paramCount++;
        queryStr += ` OFFSET $${paramCount}`;
        params.push(filters.offset);
      }

      const result = await query(queryStr, params);

      return {
        data: result.rows.map(row => ({
          ...row,
          breaks: row.breaks_json || undefined,
          totalBreakMinutes: parseFloat(row.total_break_minutes) || 0
        })),
        total
      };
    } catch (error: any) {
      logger.error({ error, companyId }, 'Failed to get company attendance');
      throw error;
    }
  }
}

export const enhancedAttendanceService = new EnhancedAttendanceService();
