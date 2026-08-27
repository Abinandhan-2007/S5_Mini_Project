import React from 'react';
import { clsx } from 'clsx';
import { ShieldCheck, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';

export interface ConfidenceBadgeProps {
  confidence: number; // e.g. 94 for 94%
  riskLevel?: 'low' | 'moderate' | 'high' | 'critical';
  size?: 'sm' | 'md';
  className?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  riskLevel = 'low',
  size = 'md',
  className,
}) => {
  const getBadgeStyle = () => {
    switch (riskLevel) {
      case 'critical':
      case 'high':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-700',
          dot: 'bg-rose-500',
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
          label: 'High Risk / Escalation Required',
        };
      case 'moderate':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          dot: 'bg-amber-500',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
          label: 'Moderate Urgency',
        };
      case 'low':
      default:
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          dot: 'bg-emerald-500',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Routine Care',
        };
    }
  };

  const style = getBadgeStyle();

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1.5 border rounded-full font-heading font-bold shadow-2xs select-none',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        style.bg,
        className
      )}
    >
      <div className="flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-[#0B5A54] animate-pulse" />
        <span>AI Match {confidence}%</span>
      </div>
      <span className="w-1 h-1 rounded-full bg-current opacity-40" />
      <div className="flex items-center gap-1">
        {style.icon}
        <span>{style.label}</span>
      </div>
    </div>
  );
};
