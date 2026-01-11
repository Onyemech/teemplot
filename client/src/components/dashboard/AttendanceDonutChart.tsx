import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface AttendanceDonutChartProps {
  present: number;
  late: number;
  absent: number;
  onLeave: number;
}

export default function AttendanceDonutChart({ present, late, absent, onLeave }: AttendanceDonutChartProps) {
  const data = [
    { name: 'Present', value: present, color: '#10B981' }, // Green-500
    { name: 'Late', value: late, color: '#F59E0B' },    // Amber-500
    { name: 'Absent', value: absent, color: '#EF4444' },  // Red-500
    { name: 'On Leave', value: onLeave, color: '#6366F1' }, // Indigo-500
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-lg rounded-lg">
          <p className="text-sm font-medium" style={{ color: payload[0].payload.color }}>
            {payload[0].name}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[300px] w-full bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Overview</h3>
      <div className="h-[220px]">
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
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              formatter={(value, entry: any) => (
                <span className="text-sm text-gray-600 ml-1">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
