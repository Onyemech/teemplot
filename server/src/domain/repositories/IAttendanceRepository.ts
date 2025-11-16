import { AttendanceRecord } from '../entities/Attendance';

export interface IAttendanceRepository {
  findById(id: string): Promise<AttendanceRecord | null>;
  findByUserAndDate(userId: string, date: Date): Promise<AttendanceRecord | null>;
  findByCompany(companyId: string, filters?: AttendanceFilters): Promise<AttendanceRecord[]>;
  findByUser(userId: string, filters?: AttendanceFilters): Promise<AttendanceRecord[]>;
  create(record: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AttendanceRecord>;
  update(id: string, data: Partial<AttendanceRecord>): Promise<AttendanceRecord>;
  hasActiveClock(userId: string): Promise<boolean>;
  getUserAttendanceStats(userId: string, startDate: Date, endDate: Date): Promise<AttendanceStats>;
}

export interface AttendanceFilters {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  totalHours: number;
  averageHoursPerDay: number;
}
