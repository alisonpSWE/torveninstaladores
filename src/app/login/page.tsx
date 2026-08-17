'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Zap, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Por favor, informe seu e-mail e sua senha.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('E-mail ou senha incorretos.');
        }
        throw new Error(error.message);
      }

      // Sucesso no login: redireciona para a raiz e atualiza a sessão
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao realizar login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-zinc-100 items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 bg-zinc-900/90 border-zinc-800 shadow-2xl space-y-6">
        {/* Header do Login */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#ffc61e]/15 border border-[#ffc61e]/30 flex items-center justify-center text-[#ffc61e] mx-auto shadow-md">
            <Zap className="w-8 h-8 fill-[#ffc61e]" />
          </div>

          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Torven Instaladores
          </h1>
          <p className="text-xs text-zinc-400 font-medium">
            Digite suas credenciais de acesso para entrar no PWA de campo
          </p>
        </div>

        {/* Form de Autenticação */}
        <form onSubmit={handleLogin} className="space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Input de E-mail */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 block">E-mail de Acesso</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
              <Input
                type="email"
                placeholder="seu.email@torven.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="pl-10 h-11 bg-zinc-950 border-zinc-800 text-xs focus:ring-2 focus:ring-[#ffc61e] text-white placeholder:text-zinc-600 rounded-xl"
              />
            </div>
          </div>

          {/* Input de Senha */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 block">Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="pl-10 h-11 bg-zinc-950 border-zinc-800 text-xs focus:ring-2 focus:ring-[#ffc61e] text-white placeholder:text-zinc-600 rounded-xl"
              />
            </div>
          </div>

          {/* Botão de Submit em Alto Contraste */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-[#ffc61e] hover:bg-[#e5b010] text-black font-extrabold text-xs shadow-md border border-[#ffc61e]/40 transition-all min-h-[44px] rounded-xl mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-black" /> Autenticando...
              </span>
            ) : (
              'Entrar no Sistema'
            )}
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-zinc-800/80">
          <p className="text-[11px] text-zinc-500">
            Torven Engenharia Solar • Sistema Interno Protegido
          </p>
        </div>
      </Card>
    </div>
  );
}
