'use client';

import React from 'react';
import Link from 'next/link';
import { Obra } from '@/lib/supabase/types';
import { Card } from '@/components/ui/card';
import { ObraStatusBadge } from './obra-status-badge';
import { KwpDisplay } from './kwp-display';
import { MapPin, ChevronRight, Layers, Home, Cpu, Camera } from 'lucide-react';

interface ObraCardProps {
  obra: Obra;
  pendingPhotosCount?: number;
}

export function ObraCard({ obra, pendingPhotosCount = 0 }: ObraCardProps) {
  return (
    <Link
      href={`/obra/${obra.id_obra}`}
      className="block group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc61e] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      <Card className="p-3 sm:p-3.5 border-zinc-800/90 bg-zinc-900/90 hover:bg-zinc-900 hover:border-zinc-700/80 active:scale-[0.99] transition-all duration-150 shadow-md">
        <div className="space-y-2">
          {/* Header Row: ID + Status vs kWp */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="font-mono text-[11px] text-[#ffc61e] bg-[#ffc61e]/15 px-2 py-0.5 rounded-md border border-[#ffc61e]/30 font-bold tracking-tight">
                #{obra.id_obra}
              </span>
              <ObraStatusBadge status={obra.status} />
            </div>

            <KwpDisplay value={obra.potencia_total_kwp} />
          </div>

          {/* Client Name & Address */}
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-white leading-snug group-hover:text-[#ffc61e] transition-colors tracking-tight line-clamp-1">
              {obra.cliente}
            </h2>
            <p className="text-xs text-zinc-400 flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
              <span className="truncate">{obra.endereco ? `${obra.endereco} (${obra.cidade})` : obra.cidade}</span>
            </p>
          </div>

          {/* Compact Technical Micro-Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {obra.qtd_modulos > 0 && (
              <div className="inline-flex items-center gap-1 text-[11px] text-zinc-300 bg-zinc-950/80 border border-zinc-800/80 px-2 py-0.5 rounded-md font-medium">
                <Layers className="w-3 h-3 text-[#ffc61e]/90 shrink-0" />
                <span>
                  {obra.qtd_modulos} mód.
                  {obra.potencia_modulo_w ? ` ${obra.potencia_modulo_w}W` : ''}
                </span>
              </div>
            )}

            {obra.tipo_telhado && obra.tipo_telhado !== 'Sem dados' && (
              <div className="inline-flex items-center gap-1 text-[11px] text-zinc-300 bg-zinc-950/80 border border-zinc-800/80 px-2 py-0.5 rounded-md font-medium">
                <Home className="w-3 h-3 text-zinc-400 shrink-0" />
                <span>{obra.tipo_telhado}</span>
              </div>
            )}

            {obra.potencia_inversor_kw > 0 && (
              <div className="inline-flex items-center gap-1 text-[11px] text-zinc-300 bg-zinc-950/80 border border-zinc-800/80 px-2 py-0.5 rounded-md font-medium">
                <Cpu className="w-3 h-3 text-zinc-400 shrink-0" />
                <span>Inv. {obra.potencia_inversor_kw}kW</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Action Bar com Badge de Fotos Offline */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800/70 mt-2.5">
          {pendingPhotosCount > 0 ? (
            <div className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-300 bg-amber-500/20 border border-amber-500/50 px-2 py-0.5 rounded-md animate-pulse">
              <Camera className="w-3 h-3 text-amber-400 shrink-0" />
              <span>⚠️ {pendingPhotosCount} foto{pendingPhotosCount > 1 ? 's' : ''} local</span>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-1 text-zinc-300 font-semibold group-hover:text-[#ffc61e] transition-colors">
            <span>Acessar obra</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#ffc61e] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
