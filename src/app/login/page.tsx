'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Zap,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  WifiOff,
  HelpCircle,
  Phone,
  ShieldCheck,
} from 'lucide-react';

function getFriendlyAuthError(rawMessage: string): string {
  const msg = rawMessage.toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
    return 'E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.';
  }
  if (msg.includes('email not confirmed')) {
    return 'E-mail de acesso ainda não confirmado. Fale com a administração da Torven.';
  }
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return 'Muitas tentativas consecutivas. Aguarde alguns instantes antes de tentar novamente.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'Falha de conexão com a rede. Verifique seu sinal de internet móvel ou Wi-Fi.';
  }
  return rawMessage || 'Não foi possível realizar o login. Verifique sua conexão e tente novamente.';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    if (!isOnline) {
      setErrorMessage('Sem conexão com a internet. Conecte-se para autenticar.');
      return;
    }

    if (!email.trim() || !password) {
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
        throw new Error(getFriendlyAuthError(error.message));
      }

      // Sucesso no login: redireciona para a raiz e atualiza a sessão
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(getFriendlyAuthError(err.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-zinc-100 items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 sm:p-7 bg-zinc-900/90 border-zinc-800 shadow-2xl space-y-6 rounded-2xl">
        {/* Header do Login */}
        <div className="text-center space-y-2.5">
          <div className="w-14 h-14 rounded-2xl bg-[#ffc61e]/15 border border-[#ffc61e]/30 flex items-center justify-center text-[#ffc61e] mx-auto shadow-md">
            <Zap className="w-8 h-8 fill-[#ffc61e]" aria-hidden="true" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Torven Instaladores
            </h1>
            <p className="text-xs text-[#ffc61e] font-extrabold tracking-widest uppercase mt-0.5">
              Acesso Operacional & Campo
            </p>
          </div>
          <p className="text-xs text-zinc-400 font-medium max-w-xs mx-auto">
            Informe suas credenciais corporativas para acessar suas obras e registros.
          </p>
        </div>

        {/* Aviso de Dispositivo Offline */}
        {!isOnline && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2.5"
          >
            <WifiOff className="w-4 h-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span>Dispositivo desconectado da rede. Conecte-se para entrar.</span>
          </div>
        )}

        {/* Form de Autenticação */}
        <form onSubmit={handleLogin} className="space-y-4" noValidate={false}>
          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Input de E-mail */}
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="text-xs font-bold text-zinc-300 block">
              E-mail de Acesso
            </label>
            <div className="relative">
              <Mail
                className="w-4 h-4 absolute left-3.5 top-4 text-zinc-500 pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="login-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="username email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                placeholder="seu.email@torven.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="pl-10 h-12 bg-zinc-950 border-zinc-800 text-base sm:text-sm focus:ring-2 focus:ring-[#ffc61e] text-white placeholder:text-zinc-500 rounded-xl"
              />
            </div>
          </div>

          {/* Input de Senha */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="text-xs font-bold text-zinc-300 block">
                Senha
              </label>
              <button
                type="button"
                onClick={() => setHelpDialogOpen(true)}
                className="text-xs text-[#ffc61e] hover:underline font-semibold"
              >
                Esqueceu a senha?
              </button>
            </div>

            <div className="relative">
              <Lock
                className="w-4 h-4 absolute left-3.5 top-4 text-zinc-500 pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="pl-10 pr-12 h-12 bg-zinc-950 border-zinc-800 text-base sm:text-sm focus:ring-2 focus:ring-[#ffc61e] text-white placeholder:text-zinc-500 rounded-xl"
              />
              {/* Botão de Alternância de Visibilidade de Senha */}
              <button
                type="button"
                tabIndex={0}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1 bottom-1 w-11 flex items-center justify-center text-zinc-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-[#ffc61e] rounded-lg"
                aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Botão de Submit em Alto Contraste */}
          <Button
            type="submit"
            disabled={isLoading || !isOnline}
            className="w-full h-12 bg-[#ffc61e] hover:bg-[#e5b010] text-black font-extrabold text-xs sm:text-sm shadow-md border border-[#ffc61e]/40 transition-all min-h-[48px] rounded-xl mt-3 active:scale-[0.99]"
          >
            {isLoading ? (
              <span className="flex items-center gap-2 text-black">
                <Loader2 className="w-4 h-4 animate-spin text-black" aria-hidden="true" />{' '}
                Autenticando...
              </span>
            ) : (
              'Entrar no Sistema'
            )}
          </Button>
        </form>

        {/* Rodapé e Suporte */}
        <div className="text-center pt-3 border-t border-zinc-800/80 space-y-2">
          <button
            type="button"
            onClick={() => setHelpDialogOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#ffc61e]" />
            <span>Precisa de ajuda com seu acesso?</span>
          </button>

          <p className="text-xs text-zinc-500 font-medium">
            Torven Engenharia Solar • Sistema Interno Protegido
          </p>
        </div>
      </Card>

      {/* Modal de Suporte e Recuperação de Senha */}
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogHeader>
          <div className="w-10 h-10 rounded-xl bg-[#ffc61e]/15 border border-[#ffc61e]/30 flex items-center justify-center text-[#ffc61e] mb-2">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <DialogTitle>Suporte e Recuperação de Acesso</DialogTitle>
          <DialogDescription>
            O Torven Instaladores é um sistema restrito para equipes de campo e engenharia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs text-zinc-300">
          <p className="leading-relaxed">
            Se você esqueceu sua senha ou precisa de um novo acesso operacional, solicite a redefinição diretamente ao administrador ou ao setor de despacho da Torven.
          </p>
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
            <span className="text-zinc-400 font-semibold block">Contatos de Suporte:</span>
            <div className="flex items-center gap-2 text-zinc-200">
              <Phone className="w-3.5 h-3.5 text-[#ffc61e]" />
              <span>Despacho / Engenharia: (xx) xxxxx-xxxx</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-200">
              <Mail className="w-3.5 h-3.5 text-[#ffc61e]" />
              <span>suporte@torven.com.br</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={() => setHelpDialogOpen(false)}
            className="min-h-[44px] px-4 text-xs font-bold rounded-xl bg-[#ffc61e] text-black hover:bg-[#e5b010]"
          >
            Entendido
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
