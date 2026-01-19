import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Building2, Globe, Zap, Calendar, Clock } from 'lucide-react';

interface AttendanceDonutChartProps {
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  onSite: number;
  remote: number;
  overtime: number;
}

export default function AttendanceDonutChart({
  present, late, absent, onLeave, onSite, remote, overtime
}: AttendanceDonutChartProps) {
  const data = [
    { name: 'Present', value: present, color: '#10B981' }, // Green-500
    { name: 'Late', value: late, color: '#F59E0B' },    // Amber-500
    { name: 'Absent', value: absent, color: '#EF4444' },  // Red-500
    { name: 'On Leave', value: onLeave, color: '#6366F1' }, // Indigo-500
  ].filter(item => item.value > 0);

  const indicators = [
    { label: 'On-site', value: onSite, icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Remote', value: remote, icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Late', value: late, icon: Clock, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Overtime', value: overtime, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Leave', value: onLeave, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="h-full w-full bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Overview</h3>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => [`${value}`, 'Employees']}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => (
                <span className="text-sm text-gray-600 ml-1">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 lg:grid-cols-3 gap-4">
        {indicators.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${item.bg}`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{item.label}</p>
              <p className="text-lg font-bold text-gray-900">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
