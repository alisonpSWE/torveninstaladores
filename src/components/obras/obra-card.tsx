'use client';

import React from 'react';
import Link from 'next/link';
import { Obra } from '@/lib/supabase/types';
import { Card } from '@/components/ui/card';
import { ObraStatusBadge } from './obra-status-badge';
import { KwpDisplay } from './kwp-display';
import { MapPin, ChevronRight } from 'lucide-react';

interface ObraCardProps {
  obra: Obra;
}

export function ObraCard({ obra }: ObraCardProps) {
  return (
    <Link href={`/obra/${obra.id_obra}`} className="block group focus:outline-none">
      <Card className="p-4 border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800/80 hover:border-zinc-700 active:scale-[0.99] transition-all duration-150">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-[#ffc61e] bg-[#ffc61e]/10 px-2 py-0.5 rounded-md border border-[#ffc61e]/20 font-bold">
                #{obra.id_obra}
              </span>
              <ObraStatusBadge status={obra.status} />
            </div>
            <h2 className="text-base font-bold text-white truncate leading-snug group-hover:text-[#ffc61e] transition-colors">
              {obra.cliente}
            </h2>
          </div>

          <KwpDisplay value={obra.potencia_total_kwp} />
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
