
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface SolidCircleChartProps {
  score: number;
  label?: string;
  size?: number;
}

// Custom tooltip formatter type
type ValueType = number | string | Array<number | string>;
type NameType = number | string;

export default function SolidCircleChart({ score, label = "Score", size = 200 }: SolidCircleChartProps) {
  // Data for the chart: The score slice and the remaining slice
  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score },
  ];

  // Colors: Dynamic based on score, and a muted gray for the remainder
  let scoreColor = '#3b82f6'; // Blue default
  if (score >= 90) scoreColor = '#15803d'; // Green (Platinum/Gold-ish high)
  else if (score >= 80) scoreColor = '#ca8a04'; // Yellow/Gold
  else if (score >= 60) scoreColor = '#94a3b8'; // Silver/Gray
  else scoreColor = '#b45309'; // Bronze/Orange

  const COLORS = [scoreColor, '#e2e8f0']; // Remainder is light gray

  // Custom formatter function
  const tooltipFormatter = (value: ValueType, _name: NameType, props: any): [ValueType, NameType] => {
    return [`${value}%`, props.payload.name];
  };

  return (
    <div className="flex flex-col items-center justify-center relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={90}
            endAngle={-270}
            innerRadius={0} // Solid circle (no hole)
            outerRadius="100%"
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
             formatter={tooltipFormatter as any}
             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Overlay Text Centered */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-white drop-shadow-md">
        <span className="text-4xl font-bold">{Math.round(score)}</span>
        <span className="text-sm uppercase tracking-wider font-medium opacity-90">{label}</span>
      </div>
    </div>
  );
}
