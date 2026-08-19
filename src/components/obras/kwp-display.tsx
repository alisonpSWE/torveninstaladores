import React from 'react';
import { Zap } from 'lucide-react';

interface KwpDisplayProps {
  value?: number | null;
  className?: string;
}

export function KwpDisplay({ value, className = '' }: KwpDisplayProps) {
  const formattedValue = value ? value.toFixed(2) : '0.00';

  return (
    <div className={`flex flex-col items-end shrink-0 bg-zinc-950/80 border border-zinc-800/90 px-2.5 py-1 rounded-xl shadow-inner ${className}`}>
      <div className="flex items-center gap-1 text-[#ffc61e] font-extrabold text-sm md:text-base leading-none">
        <Zap className="w-3.5 h-3.5 fill-[#ffc61e]/20 text-[#ffc61e]" />
        <span>{formattedValue}</span>
      </div>
      <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">kWp Total</span>
    </div>
  );
}

