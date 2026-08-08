import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan' | 'orange';
  badgeText?: string;
  badgeStyle?: string;
  borderAccent?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'indigo',
  badgeText,
  badgeStyle,
  borderAccent
}) => {
  return (
    <div className={`bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ${borderAccent || ''}`}>
      <div className="flex items-center justify-between">
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
        {Icon && (
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="flex items-end justify-between mt-2">
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white leading-none">{value}</h3>
        {badgeText && (
          <span className={`px-2 py-1 rounded text-xs font-bold ${badgeStyle || 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400'}`}>
            {badgeText}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium truncate">{subtitle}</p>
      )}
    </div>
  );
};
