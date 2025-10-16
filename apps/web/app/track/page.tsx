'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { Map as MapLibreMap, Marker } from 'maplibre-gl';
import { colorForRoute } from './colors';

type LiveDriver = {
  id: string;
  name: string;
  routeId?: string | null;
  lat: number;
  lng: number;
  heading?: number;
  speedKph?: number;
  updatedAt: number;
};

const CHICAGO = { lng: -87.623, lat: 41.882 };

export default function TrackPage() {
  const mapRef = useRef<MapLibreMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<Map<string, Marker>>(new Map());
  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [connected, setConnected] = useState(false);
  const [query, setQuery] = useState('');
  const [routeFilter, setRouteFilter] = useState<string>('ALL');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const styleUrl =
      process.env.NEXT_PUBLIC_MAP_STYLE || process.env.MAP_STYLE || 'https://demotiles.maplibre.org/style.json';
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [CHICAGO.lng, CHICAGO.lat],
      zoom: 11,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL;
    const wsUrl = base ? base.replace(/^http/, 'ws') + '/api/ws/live' : `ws://${window.location.hostname}:3001/api/ws/live`;
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'drivers') {
          setDrivers(payload.drivers);
        }
      } catch (error) {
        console.warn('Failed to parse live payload', error);
      }
    };
    return () => ws.close();
  }, []);

  const routes = useMemo(() => {
    const unique = new Map<string, string>();
    drivers.forEach((driver) => {
      if (driver.routeId) unique.set(driver.routeId, colorForRoute(driver.routeId));
    });
    return Array.from(unique.entries()).map(([id, color]) => ({ id, color }));
  }, [drivers]);

  const filteredDrivers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drivers.filter((driver) => {
      const matchesQuery = !q || driver.name.toLowerCase().includes(q) || driver.id.toLowerCase().includes(q);
      const matchesRoute = routeFilter === 'ALL' || driver.routeId === routeFilter;
      return matchesQuery && matchesRoute;
    });
  }, [drivers, query, routeFilter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markerRef.current;
    const keep = new Set<string>();
    filteredDrivers.forEach((driver) => {
      keep.add(driver.id);
      let marker = markers.get(driver.id);
      const color = colorForRoute(driver.routeId || driver.id);
      if (!marker) {
        const element = document.createElement('div');
        element.style.width = '18px';
        element.style.height = '18px';
        element.style.borderRadius = '50%';
        element.style.background = color;
        element.style.boxShadow = '0 0 0 2px #ffffff';
        const popup = new maplibregl.Popup({ offset: 12 });
        marker = new maplibregl.Marker({ element }).setLngLat([driver.lng, driver.lat]).setPopup(popup).addTo(map);
        markers.set(driver.id, marker);
      }
      marker.setLngLat([driver.lng, driver.lat]);
      const popup = marker.getPopup();
      popup?.setHTML(
        `<strong>${driver.name}</strong><br/>${driver.routeId || 'Unassigned'}<br/>${
          driver.speedKph ? `${driver.speedKph.toFixed(1)} km/h` : ''
        }`
      );
    });
    for (const [id, marker] of markers.entries()) {
      if (!keep.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
  }, [filteredDrivers]);

  function focusOnDriver(driver: LiveDriver) {
    mapRef.current?.flyTo({ center: [driver.lng, driver.lat], zoom: 14, speed: 0.8 });
  }

  return (
    <section className="card" style={{ padding: 0, height: 'calc(100vh - 160px)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100%' }}>
        <aside style={{ borderRight: '1px solid #e2e8f0', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}>Live drivers</h2>
            <div className="meta">WebSocket feed updates every few seconds.</div>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search driver or ID"
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5f5', fontSize: 14 }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              style={{
                padding: '6px 10px',
                fontSize: 12,
                borderRadius: 999,
                borderColor: routeFilter === 'ALL' ? '#2563eb' : '#cbd5f5',
                color: routeFilter === 'ALL' ? '#2563eb' : '#1e293b',
              }}
              onClick={() => setRouteFilter('ALL')}
            >
              All routes
            </button>
            {routes.map((route) => (
              <button
                key={route.id}
                className="btn btn-secondary"
                style={{
                  padding: '6px 10px',
                  fontSize: 12,
                  borderRadius: 999,
                  borderColor: routeFilter === route.id ? route.color : '#cbd5f5',
                  color: routeFilter === route.id ? route.color : '#1e293b',
                }}
                onClick={() => setRouteFilter(route.id)}
              >
                {route.id}
              </button>
            ))}
          </div>
          <div className="live-banner" style={{ width: 'fit-content' }}>
            <span
              style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#16a34a' : '#ef4444', display: 'inline-block' }}
            />
            {connected ? 'Connected to live feed' : 'Offline'}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ul className="list">
              {filteredDrivers.map((driver) => (
                <li key={driver.id} className="list-item">
                  <div>
                    <strong>{driver.name}</strong>
                    <div className="meta">{driver.routeId || 'Unassigned route'}</div>
                    <div className="meta">{formatDate(driver.updatedAt)} • {driver.speedKph ? `${driver.speedKph.toFixed(0)} km/h` : '—'}</div>
                  </div>
                  <button className="btn btn-link" type="button" onClick={() => focusOnDriver(driver)}>
                    Focus
                  </button>
                </li>
              ))}
              {filteredDrivers.length === 0 && <div className="meta">No drivers match this filter.</div>}
            </ul>
          </div>
        </aside>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </section>
  );
}

function formatDate(timestamp: number | string | undefined) {
  if (!timestamp) return '—';
  const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}
