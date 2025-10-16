import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ReactNode } from 'react';
import { AuthProvider } from './auth-context';
import AppHeader from './components/AppHeader';

export const metadata = {
  title: 'FairFlow Logistics Control Tower',
  description:
    'Unified delivery, routing, and driver tracking experience for modern logistics operations.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="app-shell">
            <AppHeader />
            <main>{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
