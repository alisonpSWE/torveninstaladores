'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, LogOut } from 'lucide-react';

export default function LogoutPage() {
  useEffect(() => {
    async function performLogout() {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();

        // Limpa tokens do localStorage se existirem
        if (typeof window !== 'undefined') {
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase')) {
              localStorage.removeItem(key);
            }
          });
        }
      } catch (err) {
        console.error('[LOGOUT] Erro ao deslogar:', err);
      } finally {
        // Redireciona com reload completo para garantir que todos os caches/sessões sejam limpos
        window.location.href = '/login';
      }
    }

    performLogout();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-black text-zinc-100 items-center justify-center p-6 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-[#ffc61e]/15 border border-[#ffc61e]/30 flex items-center justify-center text-[#ffc61e] shadow-lg">
        <LogOut className="w-7 h-7" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-base font-bold text-white">Saindo do sistema...</h2>
        <p className="text-xs text-zinc-400">Encerrando sessão com segurança.</p>
      </div>
      <Loader2 className="w-6 h-6 animate-spin text-[#ffc61e]" />
    </div>
  );
}
