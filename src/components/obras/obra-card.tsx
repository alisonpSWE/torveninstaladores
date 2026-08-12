'use client';

import React from 'react';
import Link from 'next/link';
import { Obra } from '@/lib/supabase/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, MapPin, ChevronRight, User } from 'lucide-react';

interface ObraCardProps {
  obra: Obra;
}

export function ObraCard({ obra }: ObraCardProps) {
  // Define a cor do Badge baseada no status
  const getBadgeVariant = (statusStr: string) => {
    const s = statusStr.toLowerCase();
    if (s.includes('liberad') || s.includes('conclu') || s.includes('finaliz')) return 'success';
    if (s.includes('andamento') || s.includes('execuç')) return 'warning';
    if (s.includes('bloquead') || s.includes('cancel')) return 'danger';
    return 'default';
  };

  return (
    <Link href={`/obra/${obra.id_obra}`} className="block group focus:outline-none">
      <Card className="p-4 border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800/80 hover:border-zinc-700 active:scale-[0.99] transition-all duration-150">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-[#ffc61e] bg-[#ffc61e]/10 px-2 py-0.5 rounded-md border border-[#ffc61e]/20 font-bold">
                #{obra.id_obra}
              </span>
              <Badge variant={getBadgeVariant(obra.status)}>
                {obra.status}
              </Badge>
            </div>
            <h2 className="text-base font-bold text-white truncate leading-snug group-hover:text-[#ffc61e] transition-colors">
              {obra.cliente}
            </h2>
          </div>

          {/* Potência numética em destaque */}
          <div className="flex flex-col items-end shrink-0 bg-zinc-950/60 border border-zinc-800/80 px-2.5 py-1.5 rounded-xl">
            <div className="flex items-center gap-1 text-amber-400 font-extrabold text-base leading-none">
              <Zap className="w-4 h-4 fill-amber-400/20" />
              <span>{obra.potencia_total_kwp ? obra.potencia_total_kwp.toFixed(2) : '0.00'}</span>
            </div>
            <span className="text-xs text-zinc-400 font-semibold uppercase mt-0.5">kWp Total</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800/60 mt-3">
          <div className="flex items-center gap-1.5 truncate pr-2">
            <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="truncate">{obra.cidade}</span>
          </div>

          <div className="flex items-center gap-1 text-zinc-400 font-medium shrink-0 group-hover:text-white transition-colors">
            <span>Ver detalhes</span>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
