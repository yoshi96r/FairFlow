import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
import type { ReactNode } from 'react';
import { Open_Sans } from 'next/font/google';

const openSans = Open_Sans({ subsets: ['latin'], weight: ['400', '600', '700', '800'] });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={openSans.className}>
      <body>{children}</body>
    </html>
  );
}
