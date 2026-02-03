import { useId } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface SolidCircleChartProps {
  score: number;
  label?: string;
  size?: number;
  theme?: 'light' | 'dark';
  accent?: { start: string; end: string };
  trackColor?: string;
}

// Custom tooltip formatter type
type ValueType = number | string | Array<number | string>;
type NameType = number | string;

export default function SolidCircleChart({
  score,
  label = "Score",
  size = 200,
  theme = 'light',
  accent = { start: '#FFD700', end: '#F59E0B' },
  trackColor = '#4B5563',
}: SolidCircleChartProps) {
  const id = useId().replace(/:/g, '');
  const gradientId = `scoreGradient-${id}`;

  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  // Data for the chart: The score slice and the remaining slice
  const data = [
    { name: 'Score', value: clamped },
    { name: 'Remaining', value: 100 - clamped },
  ];

  const COLORS = [`url(#${gradientId})`, trackColor];

  // Custom formatter function
  const tooltipFormatter = (value: ValueType, _name: NameType, props: any): [ValueType, NameType] => {
    return [`${value}%`, props.payload.name];
  };

  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col items-center justify-center" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className={`absolute inset-0 rounded-full blur-3xl opacity-60 ${isDark ? 'motion-safe:animate-[pulse_4s_ease-in-out_infinite]' : ''}`}
          style={{ background: `radial-gradient(circle at 30% 30%, ${accent.start}55, transparent 60%)` }}
        />
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={accent.start} />
                <stop offset="100%" stopColor={accent.end} />
              </linearGradient>
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={90}
              endAngle={-270}
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={1}
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

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`${isDark ? 'text-[#FBBF24] drop-shadow-[0_0_12px_rgba(251,191,36,0.35)]' : 'text-gray-900'} text-4xl font-extrabold tabular-nums`}>
            {Math.round(clamped)}
          </span>
          <span className={`${isDark ? 'text-white/60' : 'text-gray-500'} text-xs font-semibold uppercase tracking-wider`}>
            {label}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs">
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${isDark ? 'border-white/10 bg-white/5 text-white/80' : 'border-gray-200 bg-white text-gray-700'}`}>
          <span className="h-2 w-2 rounded-full" style={{ background: `linear-gradient(135deg, ${accent.start}, ${accent.end})` }} />
          Score
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${isDark ? 'border-white/10 bg-white/5 text-white/80' : 'border-gray-200 bg-white text-gray-700'}`}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: trackColor }} />
          Remaining
        </div>
      </div>
    </div>
  );
}
