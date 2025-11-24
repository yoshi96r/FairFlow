'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { Map as MLMap, Marker } from 'maplibre-gl';
import { colorForRoute } from './colors';

export default function TrackPage() {
  const mapRef = useRef(null as MLMap | null);
  const elRef = useRef(null as HTMLDivElement | null);
  const markers = useRef(new Map());
  const [connected, setConnected] = useState(false);
  const [drivers, setDrivers] = useState([] as any[]);
  const [q, setQ] = useState('');
  const [routeFilter, setRouteFilter] = useState('ALL' as any);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const style = process.env.NEXT_PUBLIC_MAP_STYLE || process.env.MAP_STYLE || 'https://demotiles.maplibre.org/style.json';
    const map = new maplibregl.Map({ container: elRef.current, style, center: [-87.623, 41.882], zoom: 11 });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL;
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3001';
    const url = base ? base.replace(/^http/, 'ws') + '/api/ws/live' : `${protocol}://${host}/api/ws/live`;
    const ws = new WebSocket(url);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      try { const msg = JSON.parse(e.data); if (msg.type === 'drivers') setDrivers(msg.drivers); } catch {}
    };
    return () => ws.close();
  }, []);

  const routes = useMemo(() => {
    const ids = Array.from(new Set(drivers.map((d:any)=>d.routeId).filter(Boolean)));
    return ids.map((id:any) => ({ id, color: colorForRoute(id) }));
  }, [drivers]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return drivers.filter((d:any) => (
      (!ql || d.name.toLowerCase().includes(ql) || d.id.toLowerCase().includes(ql)) &&
      (routeFilter === 'ALL' || d.routeId === routeFilter)
    ));
  }, [drivers, q, routeFilter]);

  useEffect(() => {
    if (!mapRef.current) return;
    const m:any = markers.current;
    const keep = new Set();
    filtered.forEach((d:any) => {
      keep.add(d.id);
      let mk = m.get(d.id);
      const color = colorForRoute(d.routeId);
      if (!mk) {
        const el = document.createElement('div');
        el.style.width = '18px'; el.style.height = '18px'; el.style.borderRadius = '50%';
        el.style.background = color; el.style.boxShadow = '0 0 0 2px #fff';
        mk = new (maplibregl as any).Marker({ element: el }).setLngLat([d.lng, d.lat])
          .setPopup(new (maplibregl as any).Popup({ offset: 12 }).setHTML(`<b>${d.name}</b><br/>${d.routeId || 'Unassigned'}`))
          .addTo(mapRef.current);
        m.set(d.id, mk);
      }
      mk.setLngLat([d.lng, d.lat]);
    });
    for (const [id, mk] of m.entries()) {
      if (!keep.has(id)) { mk.remove(); m.delete(id); }
    }
  }, [filtered]);

  function focus(driver:any){ mapRef.current?.flyTo({ center: [driver.lng, driver.lat], zoom: 14 }); }

  return (
    <div className="grid grid-cols-12 h-[calc(100vh-64px)]">
      <aside className="col-span-3 border-r p-3 space-y-3 overflow-auto">
        <div className="flex gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search driver…" className="border rounded px-2 py-1 w-full" />
        </div>
        <div className="space-y-1">
          <button onClick={()=>setRouteFilter('ALL')} className={`text-sm ${routeFilter==='ALL'?'font-semibold':''}`}>All Routes</button>
          {routes.map((r:any) => (
            <div key={r.id} className="flex items-center gap-2 cursor-pointer" onClick={()=>setRouteFilter(r.id)}>
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: r.color }} />
              <span className={`text-sm ${routeFilter===r.id?'font-semibold':''}`}>{r.id}</span>
            </div>
          ))}
        </div>
        <div className="text-xs opacity-70">Status: {connected ? 'live' : 'offline'}</div>
        <div className="border-t pt-2 space-y-1">
          {filtered.map((d:any) => (
            <div key={d.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: colorForRoute(d.routeId) }} />
                <span>{d.name}</span>
              </div>
              <button className="text-blue-600" onClick={()=>focus(d)}>focus</button>
            </div>
          ))}
        </div>
      </aside>
      <main className="col-span-9">
        <div ref={elRef} style={{ width: '100%', height: '100%' }} />
      </main>
    </div>
  );
}
