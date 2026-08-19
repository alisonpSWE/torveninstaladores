import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { pathname } = request.nextUrl;

  // REGRAS DE ISENÇÃO DO PROXY/MIDDLEWARE:
  // Permitir acesso livre aos webhooks do QStash (/api/webhooks/*), tela de login, logout, sw.js e assets estáticos
  const isWebhookRoute = pathname.startsWith('/api/webhooks');
  const isLoginPage = pathname === '/login';
  const isLogoutPage = pathname === '/logout';
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js)$/i);

  if (isWebhookRoute || isStaticAsset || isLogoutPage) {
    return response;
  }

  // Verifica a sessão atual do usuário no Supabase Auth com resiliência offline
  let user = null;
  let authError = null;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      user = data.user;
    } else {
      authError = error;
    }
  } catch (err: any) {
    authError = err;
  }

  // Detecção de Cookies de Sessão do Supabase (Offline Resilient)
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some((c) =>
    c.name.startsWith('sb-') &&
    (c.name.includes('-auth-token') || c.name.endsWith('-access-token') || c.name.endsWith('-refresh-token'))
  );

  // Se o usuário está autenticado na rede OU possui cookies válidos em modo offline:
  // NÃO redireciona para /login para permitir que o Service Worker sirva a aplicação a partir do cache
  const isConsideredAuthenticated = user !== null || (hasAuthCookie && authError !== null);

  // 1. Usuário sem sessão tentando acessar rota protegida ➔ Redireciona para /login
  if (!isConsideredAuthenticated && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Usuário com sessão ativa tentando acessar /login ➔ Redireciona para a raiz /
  if (user && isLoginPage) {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
