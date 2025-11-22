import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Calendar, TrendingUp, Clock, 
  AlertCircle, CheckCircle, XCircle, Plus,
  Search, Filter, Download, ChevronLeft, ChevronRight
} from 'lucide-react';

interface AttendanceStats {
  totalEmployees: number;
  totalClockIn: number;
  earlyClockIn: number;
  lateClockIn: number;
  absent: number;
  earlyDeparture: number;
  leave: number;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  duration: string;
  status: 'present' | 'late_arrival' | 'early_departure' | 'absent' | 'on_leave';
  location: 'onsite' | 'remote';
  avatar?: string;
}

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<AttendanceStats>({
    totalEmployees: 10,
    totalClockIn: 8,
    earlyClockIn: 6,
    lateClockIn: 2,
    absent: 2,
    earlyDeparture: 0,
    leave: 1
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([
    {
      id: '1',
      employeeId: 'EMP001',
      employeeName: 'Daniel Osonuga',
      department: 'Product Design',
      clockInTime: '07:45 am',
      clockOutTime: '05:45 pm',
      duration: '10 hours',
      status: 'present',
      location: 'onsite'
    },
    {
      id: '2',
      employeeId: 'EMP002',
      employeeName: 'Abiimbola Malik',
      department: 'Business & Marketing',
      clockInTime: '09:02 am',
      clockOutTime: '03:45 pm',
      duration: '10 hours',
      status: 'early_departure',
      location: 'onsite'
    },
    {
      id: '3',
      employeeId: 'EMP003',
      employeeName: 'Ben Olewuezi',
      department: 'Risk Enterprise',
      clockInTime: null,
      clockOutTime: null,
      duration: '--:--',
      status: 'on_leave',
      location: 'onsite'
    },
    {
      id: '4',
      employeeId: 'EMP004',
      employeeName: 'Titilayo Akande',
      department: 'Solutions Delivery',
      clockInTime: '07:45 am',
      clockOutTime: '05:45 pm',
      duration: '10 hours',
      status: 'present',
      location: 'remote'
    },
    {
      id: '5',
      employeeId: 'EMP005',
      employeeName: 'Nonso Toidun',
      department: 'Customer Experience',
      clockInTime: '07:45 am',
      clockOutTime: '04:45 pm',
      duration: '10 hours',
      status: 'early_departure',
      location: 'onsite'
    },
    {
      id: '6',
      employeeId: 'EMP006',
      employeeName: 'Chucks Ebinum',
      department: 'Software Testing',
      clockInTime: null,
      clockOutTime: null,
      duration: '--',
      status: 'absent',
      location: 'onsite'
    },
    {
      id: '7',
      employeeId: 'EMP007',
      employeeName: 'Nike Adesanaya',
      department: 'Human Resources',
      clockInTime: '07:45 am',
      clockOutTime: '05:45 pm',
      duration: '10 hours',
      status: 'present',
      location: 'remote'
    },
    {
      id: '8',
      e