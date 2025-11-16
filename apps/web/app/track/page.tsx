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
    const base = (process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL);
    const url = base ? base.replace(/^http/, 'ws') + '/api/ws/live' : `ws://${window.location.hostname}:3001/api/ws/live`;
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
    <div className="track-container">
      <div className="track-layout">
        <aside className="track-sidebar">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search driver…" className="track-search" />
          <div className="route-filter">
            <button onClick={()=>setRouteFilter('ALL')} className={routeFilter==='ALL' ? 'active' : ''}>All routes</button>
            {routes.map((r:any) => (
              <button key={r.id} className={routeFilter===r.id ? 'active' : ''} onClick={()=>setRouteFilter(r.id)}>
                <span className="status-pill"><span className="badge" style={{ background: r.color, color: '#fff' }}></span>{r.id}</span>
              </button>
            ))}
          </div>
          <div className="helper-text" style={{ marginBottom: 12 }}>Status: {connected ? 'Live feed' : 'Offline'}</div>
          <div>
            {filtered.map((d:any) => (
              <div key={d.id} className="driver-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge" style={{ background: colorForRoute(d.routeId), color: '#fff' }}></span>
                  <span>{d.name}</span>
                </div>
                <button className="focus-button" onClick={()=>focus(d)}>Focus</button>
              </div>
            ))}
            {!filtered.length && <div className="helper-text">No drivers match your filters.</div>}
          </div>
        </aside>
        <main>
          <div ref={elRef} className="track-map" />
        </main>
      </div>
    </div>
  );
}