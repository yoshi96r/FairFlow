import './global.css';
import 'maplibre-gl/dist/maplibre-gl.css';

export const metadata = {
  title: 'FairFlow Logistics',
  description: 'Logistics management system for modern delivery teams'
};

export default function RootLayout({ children }){
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <div>
              <div className="brand-title">FairFlow Logistics</div>
              <div className="brand-subtitle">Everyday routing, done right</div>
            </div>
            <nav className="app-nav">
              <a href="/">Dashboard</a>
              <a href="/track">Live tracking</a>
              <a href="mailto:hello@fairflowlogistics.com">Contact</a>
            </nav>
          </header>
          <div className="app-content">{children}</div>
        </div>
      </body>
    </html>
  );
}