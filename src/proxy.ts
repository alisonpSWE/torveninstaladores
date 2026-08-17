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
  // Permitir acesso livre aos webhooks do QStash (/api/webhooks/*), tela de login, sw.js e assets estáticos
  const isWebhookRoute = pathname.startsWith('/api/webhooks');
  const isLoginPage = pathname === '/login';
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js)$/i);

  if (isWebhookRoute || isStaticAsset) {
    return response;
  }

  // Verifica a sessão atual do usuário no Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Usuário ANÔNIMO tentando acessar rota protegida ➔ Redireciona para /login
  if (!user && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Usuário AUTENTICADO tentando acessar /login ➔ Redireciona para a raiz /
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
