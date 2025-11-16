export interface AttendanceRecord {
  id: string;
  companyId: string;
  userId: string;
  clockInTime: Date;
  clockOutTime?: Date;
  clockInLocation?: LocationData;
  clockOutLocation?: LocationData;
  totalHours?: number;
  status: AttendanceStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum AttendanceStatus {
  PRESENT = 'present',
  LATE = 'late',
  ABSENT = 'absent',
  HALF_DAY = 'half_day',
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}
