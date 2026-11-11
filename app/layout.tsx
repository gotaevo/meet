import '../styles/globals.css';
import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: {
    default: 'Taevo Meet | Videoconferência',
    template: '%s',
  },
  description:
    'Videoconferência rápida e gratuita, direto do navegador.',
  openGraph: {
    siteName: 'Taevo Meet',
    images: [{ url: '/images/icon-512.png', width: 512, height: 512, type: 'image/png' }],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/images/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: [{ url: '/images/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#141110',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body data-lk-theme="default">
        <Toaster />
        {children}
      </body>
    </html>
  );
}
