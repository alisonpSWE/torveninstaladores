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
  themeColor: '#000000',
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
      <body className="bg-black text-zinc-100 antialiased selection:bg-[#ffc61e] selection:text-black min-h-screen">
        <QueryProvider>
          <NetworkStatus />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
