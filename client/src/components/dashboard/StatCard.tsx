import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: React.ReactNode;
  icon?: React.ElementType;
  iconColorClass?: string;
  subtextColorClass?: string;
}

export default function StatCard({ label, value, subtext, icon: Icon, iconColorClass }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden h-full flex flex-col">
      <div className="bg-[#F5F7F7] px-4 py-3 border-b border-gray-100 flex justify-between items-start gap-2">
        <div className="text-xs font-bold text-gray-700 uppercase tracking-wider leading-tight min-w-0 pt-0.5 break-words" title={label}>
          <span className="block">{label}</span>
        </div>
        {Icon && <Icon className={`h-5 w-5 flex-shrink-0 ${iconColorClass || 'text-gray-500'}`} />}
      </div>
      <div className="bg-white px-4 py-4 flex-1 flex flex-col justify-center min-w-0">
        <div className="text-2xl font-bold text-gray-900 break-words">{value}</div>
        {subtext && <div className="mt-1 text-sm min-w-0 break-words">{subtext}</div>}
      </div>
    </div>
  );
}
