import { IAttendanceRepository, AttendanceFilters, AttendanceStats } from '../../domain/repositories/IAttendanceRepository';
import { AttendanceRecord } from '../../domain/entities/Attendance';
import { db } from '../../config/database';
import { startOfDay, endOfDay } from 'date-fns';

export class AttendanceRepository implements IAttendanceRepository {
  private tableName = 'attendance_records';

  async findById(id: string): Promise<AttendanceRecord | null> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByUserAndDate(userId: string, date: Date): Promise<AttendanceRecord | null> {
    const start = startOfDay(date);
    const end = endOfDay(date);

    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .gte('clock_in_time', start.toISOString())
      .lte('clock_in_time', end.toISOString())
      .order('clock_in_time', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return this.mapToEntity(data);
  }

  async findByCompany(companyId: string, filters?: AttendanceFilters): Promise<AttendanceRecord[]> {
    let query = db.getAdminClient()
      .from(this.tableName)
      .select('*')
      .eq('company_id', companyId);

    query = this.applyFilters(query, filters);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(this.mapToEntity);
  }

  async findByUser(userId: string, filters?: AttendanceFilters): Promise<AttendanceRecord[]> {
    let query = db.getAdminClient()
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId);

    query = this.applyFilters(query, filters);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(this.mapToEntity);
  }

  async create(record: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AttendanceRecord> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .insert(this.mapToDb(record))
      .select()
      .single();

    if (error) throw new Error(`Failed to create attendance record: ${error.message}`);
    return this.mapToEntity(data);
  }

  async update(id: string, recordData: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .update(this.mapToDb(recordData))
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update attendance record: ${error.message}`);
    return this.mapToEntity(data);
  }

  async hasActiveClock(userId: string): Promise<boolean> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .select('id')
      .eq('user_id', userId)
      .is('clock_out_time', null)
      .limit(1)
      .single();

    return !error && data !== null;
  }

  async getUserAttendanceStats(userId: string, startDate: Date, endDate: Date): Promise<AttendanceStats> {
    const { data, error } = await db.getAdminClient()
      .from(this.tableName)
      .select('status, total_hours')
      .eq('user_id', userId)
      .gte('clock_in_time', startDate.toISOString())
      .lte('clock_in_time', endDate.toISOString());

    if (error || !data) {
      return {
        totalDays: 0,
        presentDays: 0,
        lateDays: 0,
        absentDays: 0,
        totalHours: 0,
        averageHoursPerDay: 0,
      };
    }

    const stats = data.reduce((acc, record) => {
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

  private applyFilters(query: any, filters?: AttendanceFilters): any {
    if (filters?.startDate) {
      query = query.gte('clock_in_time', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte('clock_in_time', filters.endDate.toISOString());
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    query = query.order('clock_in_time', { ascending: false });
    return query;
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
