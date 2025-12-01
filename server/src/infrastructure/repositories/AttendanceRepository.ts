import { IAttendanceRepository, AttendanceFilters, AttendanceStats } from '../../domain/repositories/IAttendanceRepository';
import { AttendanceRecord } from '../../domain/entities/Attendance';
import { DatabaseFactory } from '../database/DatabaseFactory';
import { IDatabase } from '../database/IDatabase';
import { startOfDay, endOfDay } from 'date-fns';

export class AttendanceRepository implements IAttendanceRepository {
  private tableName = 'attendance_records';
  private db: IDatabase;

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
  }

  async findById(id: string): Promise<AttendanceRecord | null> {
    const record = await this.db.findOne(this.tableName, { id });
    if (!record) return null;
    return this.mapToEntity(record);
  }

  async findByUserAndDate(userId: string, date: Date): Promise<AttendanceRecord | null> {
    const start = startOfDay(date);
    const end = endOfDay(date);

    const records = await this.db.query(
      `SELECT * FROM ${this.tableName} 
       WHERE user_id = $1 
       AND clock_in_time >= $2 
       AND clock_in_time <= $3 
       ORDER BY clock_in_time DESC 
       LIMIT 1`,
      [userId, start.toISOString(), end.toISOString()]
    );

    if (records.rows.length === 0) return null;
    return this.mapToEntity(records.rows[0]);
  }

  async findByCompany(companyId: string, filters?: AttendanceFilters): Promise<AttendanceRecord[]> {
    // TODO: Implement using IDatabase interface
    throw new Error('Not implemented - use DatabaseFactory.getPrimaryDatabase() directly in services');
  }

  private applyFilters(query: any, filters?: AttendanceFilters): any {
    // Legacy method - not used
    return query;
  }

  async findByUser(userId: string, filters?: AttendanceFilters): Promise<AttendanceRecord[]> {
    // TODO: Implement using IDatabase interface
    throw new Error('Not implemented - use DatabaseFactory.getPrimaryDatabase() directly in services');
  }

  async create(record: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AttendanceRecord> {
    const result = await this.db.insert(this.tableName, this.mapToDb(record));
    return this.mapToEntity(result);
  }

  async update(id: string, recordData: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
    const results = await this.db.update(this.tableName, this.mapToDb(recordData), { id });
    if (results.length === 0) throw new Error('Attendance record not found');
    return this.mapToEntity(results[0]);
  }

  async hasActiveClock(userId: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT id FROM ${this.tableName} WHERE user_id = $1 AND clock_out_time IS NULL LIMIT 1`,
      [userId]
    );
    return result.rows.length > 0;
  }

  async getUserAttendanceStats(userId: string, startDate: Date, endDate: Date): Promise<AttendanceStats> {
    const result = await this.db.query(
      `SELECT status, total_hours FROM ${this.tableName} 
       WHERE user_id = $1 
       AND clock_in_time >= $2 
       AND clock_in_time <= $3`,
      [userId, startDate.toISOString(), endDate.toISOString()]
    );

    const data = result.rows;
    if (!data || data.length === 0) {
      return {
        totalDays: 0,
        presentDays: 0,
        lateDays: 0,
        absentDays: 0,
        totalHours: 0,
        averageHoursPerDay: 0,
      };
    }

    const stats = data.reduce((acc: any, record: any) => {
      acc.totalDays++;
      if (record.status === 'present') acc.presentDays++;
      if (record.status === 'late') acc.lateDays++;
      if (record.status === 'absent') acc.absentDays++;
      acc.totalHours += record.total_hours || 0;
      return acc;
    }, {
      totalDays: 0,
      presentDays: 0,
      lateDays: 0,
      absentDays: 0,
      totalHours: 0,
    });

    return {
      ...stats,
      averageHoursPerDay: stats.totalDays > 0 ? stats.totalHours / stats.totalDays : 0,
    };
  }

  private mapToEntity(data: any): AttendanceRecord {
    return {
      id: data.id,
      companyId: data.company_id,
      userId: data.user_id,
      clockInTime: new Date(data.clock_in_time),
      clockOutTime: data.clock_out_time ? new Date(data.clock_out_time) : undefined,
      clockInLocation: data.clock_in_location,
      clockOutLocation: data.clock_out_location,
      totalHours: data.total_hours,
      status: data.status,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapToDb(data: Partial<AttendanceRecord>): any {
    const dbData: any = {};
    
    if (data.companyId) dbData.company_id = data.companyId;
    if (data.userId) dbData.user_id = data.userId;
    if (data.clockInTime) dbData.clock_in_time = data.clockInTime;
    if (data.clockOutTime !== undefined) dbData.clock_out_time = data.clockOutTime;
    if (data.clockInLocation !== undefined) dbData.clock_in_location = data.clockInLocation;
    if (data.clockOutLocation !== undefined) dbData.clock_out_location = data.clockOutLocation;
    if (data.totalHours !== undefined) dbData.total_hours = data.totalHours;
    if (data.status) dbData.status = data.status;
    if (data.notes !== undefined) dbData.notes = data.notes;
    
    return dbData;
  }
}
