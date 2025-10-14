import 'maplibre-gl/dist/maplibre-gl.css';
export default function RootLayout({ children }){
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}