import type { Metadata, Viewport } from 'next';
import './globals.css';
import QueryProvider from '@/lib/query/provider';
import { NetworkStatus } from '@/components/network-status';

export const metadata: Metadata = {
  title: 'Torven Instaladores',
  description: 'Aplicativo de campo para instaladores de sistemas fotovoltaicos da Torven Engenharia',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Torven',
  },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-zinc-950 text-zinc-100 antialiased selection:bg-orange-500 selection:text-white">
        <QueryProvider>
          <div className="mx-auto max-w-md min-h-screen flex flex-col bg-zinc-950 border-x border-zinc-900 shadow-2xl relative">
            <NetworkStatus />
            {children}
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
