import React from 'react';
import { Zap } from 'lucide-react';

interface KwpDisplayProps {
  value?: number | null;
  className?: string;
}

export function KwpDisplay({ value, className = '' }: KwpDisplayProps) {
  const formattedValue = value ? value.toFixed(2) : '0.00';

  return (
    <div className={`flex flex-col items-end shrink-0 bg-zinc-950/60 border border-zinc-800/80 px-2.5 py-1.5 rounded-xl ${className}`}>
      <div className="flex items-center gap-1 text-[#ffc61e] font-extrabold text-base leading-none">
        <Zap className="w-4 h-4 fill-[#ffc61e]/20" />
        <span>{formattedValue}</span>
      </div>
      <span className="text-xs text-zinc-400 font-semibold uppercase mt-0.5">kWp Total</span>
    </div>
  );
}
