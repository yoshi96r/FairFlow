'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../auth-context';

type Overview = {
  shipmentsCreatedToday: number;
  shipmentsInMotion: number;
  shipmentsDelivered: number;
  exceptionsOpen: number;
  routesToday: number;
  driversActive: number;
};

type Shipment = {
  id: string;
  trackingCode: string;
  referenceNo?: string | null;
  status: string;
  serviceLevel: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  deliverBy: string | null;
  customerName: string | null;
  assignedRoute: { id: string; name: string; status: string } | null;
  latestEvent: { status: string; at: string; actorType: string } | null;
  createdAt: string;
};

type RouteStop = {
  id: string;
  sequence: number;
  eta: string | null;
  arrivedAt: string | null;
  departedAt: string | null;
  shipment: {
    id: string;
    trackingCode: string;
    status: string;
    addressLine1: string;
    city: string;
    state: string;
  };
};

type Route = {
  id: string;
  name: string;
  serviceDate: string;
  status: string;
  driver: { id: string; name: string } | null;
  stopCount: number;
  stops: RouteStop[];
};

type Driver = {
  id: string;
  name: string;
  phone?: string | null;
  vehiclePlate?: string | null;
  lastKnownLat?: number | null;
  lastKnownLng?: number | null;
  lastSeenAt: string | null;
  isOnline: boolean;
  activeRoute: { id: string; name: string; status: string } | null;
};

type ApiResponse<T> = { ok: boolean } & T;

async function fetchWithAuth<T>(token: string, url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const data = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !data.ok) {
    throw new Error((data as any)?.error || 'Request failed');
  }
  return data;
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDateOnly(iso?: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

function classForStatus(status: string) {
  return `status-pill status-${status}`;
}

const statusActions: Record<string, { label: string; status: string }[]> = {
  CREATED: [
    { label: 'Assign & dispatch', status: 'ASSIGNED' },
    { label: 'Start transit', status: 'IN_TRANSIT' },
  ],
  ASSIGNED: [
    { label: 'Start transit', status: 'IN_TRANSIT' },
    { label: 'Mark delivered', status: 'DELIVERED' },
    { label: 'Raise exception', status: 'EXCEPTION' },
  ],
  IN_TRANSIT: [
    { label: 'Mark delivered', status: 'DELIVERED' },
    { label: 'Raise exception', status: 'EXCEPTION' },
  ],
  EXCEPTION: [
    { label: 'Re-dispatch', status: 'ASSIGNED' },
    { label: 'Complete delivery', status: 'DELIVERED' },
  ],
  DELIVERED: [],
  RETURNED: [],
  CANCELED: [],
};

export default function DashboardPage() {
  const { token, user, hydrated } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingShipment, setPendingShipment] = useState<string | null>(null);
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [creatingRoute, setCreatingRoute] = useState(false);

  const [newShipment, setNewShipment] = useState({
    customerName: '',
    addressLine1: '',
    city: '',
    state: 'IL',
    postalCode: '',
    trackingCode: '',
    referenceNo: '',
    serviceLevel: 'STANDARD',
    deliverBy: '',
  });

  const [routePlan, setRoutePlan] = useState({
    name: 'Loop Wave',
    serviceDate: new Date().toISOString().slice(0, 10),
    driverId: '',
    shipmentIds: [] as string[],
  });

  const resetToast = useCallback(() => {
    setTimeout(() => setToast(null), 5000);
  }, []);

  const authorizedFetch = useCallback(
    function <T>(url: string, init?: RequestInit) {
      if (!token) {
        return Promise.reject(new Error('Not authenticated')) as Promise<ApiResponse<T>>;
      }
      return fetchWithAuth<T>(token, url, init);
    },
    [token]
  );

  const loadOverview = useCallback(async () => {
    const data = await authorizedFetch<{ overview: Overview }>('/api/dashboard/overview');
    setOverview(data.overview);
  }, [authorizedFetch]);

  const loadShipments = useCallback(async () => {
    const data = await authorizedFetch<{ shipments: Shipment[] }>('/api/shipments');
    setShipments(data.shipments);
  }, [authorizedFetch]);

  const loadRoutes = useCallback(async () => {
    const data = await authorizedFetch<{ routes: Route[] }>('/api/routes');
    setRoutes(data.routes);
  }, [authorizedFetch]);

  const loadDrivers = useCallback(async () => {
    const data = await authorizedFetch<{ drivers: Driver[] }>('/api/drivers');
    setDrivers(data.drivers);
  }, [authorizedFetch]);

  const refreshAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadOverview(), loadShipments(), loadRoutes(), loadDrivers()]);
    } catch (err) {
      console.error(err);
      setError('Unable to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [token, loadOverview, loadShipments, loadRoutes, loadDrivers]);

  useEffect(() => {
    if (token) {
      refreshAll();
    } else {
      setOverview(null);
      setShipments([]);
      setRoutes([]);
      setDrivers([]);
    }
  }, [token, refreshAll]);

  const availableShipments = useMemo(
    () =>
      shipments.filter(
        (shipment) => !shipment.assignedRoute || shipment.status === 'CREATED' || shipment.status === 'ASSIGNED'
      ),
    [shipments]
  );

  const handleShipmentStatus = useCallback(
    async (shipmentId: string, nextStatus: string) => {
      setPendingShipment(shipmentId);
      try {
        const data = await authorizedFetch<{ shipment: Shipment }>(`/api/shipments/${shipmentId}/status`, {
          method: 'POST',
          body: JSON.stringify({ status: nextStatus }),
        });
        setShipments((prev) => prev.map((item) => (item.id === shipmentId ? data.shipment : item)));
        await loadOverview();
        setToast(`Shipment ${data.shipment.trackingCode} updated to ${nextStatus}`);
        resetToast();
      } catch (err: any) {
        setToast(err.message || 'Failed to update shipment');
        resetToast();
      } finally {
        setPendingShipment(null);
      }
    },
    [authorizedFetch, loadOverview, resetToast]
  );

  const handleCreateShipment = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setCreatingShipment(true);
      try {
        const payload = {
          ...newShipment,
          deliverBy: newShipment.deliverBy ? new Date(newShipment.deliverBy).toISOString() : undefined,
          trackingCode: newShipment.trackingCode || undefined,
          referenceNo: newShipment.referenceNo || undefined,
        };
        const data = await authorizedFetch<{ shipment: Shipment }>('/api/shipments', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        await Promise.all([loadShipments(), loadOverview()]);
        setToast(`Shipment ${data.shipment.trackingCode} created`);
        resetToast();
        setNewShipment({
          customerName: '',
          addressLine1: '',
          city: '',
          state: 'IL',
          postalCode: '',
          trackingCode: '',
          referenceNo: '',
          serviceLevel: 'STANDARD',
          deliverBy: '',
        });
      } catch (err: any) {
        setToast(err.message || 'Failed to create shipment');
        resetToast();
      } finally {
        setCreatingShipment(false);
      }
    },
    [authorizedFetch, newShipment, loadOverview, loadShipments, resetToast]
  );

  const toggleRouteShipment = useCallback((shipmentId: string) => {
    setRoutePlan((prev) => {
      const exists = prev.shipmentIds.includes(shipmentId);
      return {
        ...prev,
        shipmentIds: exists
          ? prev.shipmentIds.filter((id) => id !== shipmentId)
          : [...prev.shipmentIds, shipmentId],
      };
    });
  }, []);

  const handleCreateRoute = useCallback(
    async (event: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (routePlan.shipmentIds.length === 0) {
        setToast('Select at least one shipment for the route');
        resetToast();
        return;
      }
      setCreatingRoute(true);
      try {
        const body = {
          name: routePlan.name,
          serviceDate: routePlan.serviceDate,
          driverId: routePlan.driverId || null,
          stops: routePlan.shipmentIds.map((shipmentId, index) => ({ shipmentId, sequence: index + 1 })),
        };
        const data = await authorizedFetch<{ route: Route }>('/api/routes', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setRoutes((prev) => [data.route, ...prev.filter((route) => route.id !== data.route.id)]);
        await Promise.all([loadShipments(), loadDrivers(), loadOverview()]);
        setRoutePlan((prev) => ({ ...prev, shipmentIds: [] }));
        setToast(`Route ${data.route.name} published`);
        resetToast();
      } catch (err: any) {
        setToast(err.message || 'Failed to create route');
        resetToast();
      } finally {
        setCreatingRoute(false);
      }
    },
    [authorizedFetch, routePlan, loadShipments, loadDrivers, loadOverview, resetToast]
  );

  const handleCompleteRoute = useCallback(
    async (routeId: string) => {
      try {
        const data = await authorizedFetch<{ route: Route }>(`/api/routes/${routeId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'COMPLETED' }),
        });
        setRoutes((prev) => prev.map((route) => (route.id === routeId ? data.route : route)));
        await Promise.all([loadShipments(), loadDrivers(), loadOverview()]);
        setToast(`Route ${data.route.name} marked complete`);
        resetToast();
      } catch (err: any) {
        setToast(err.message || 'Failed to update route');
        resetToast();
      }
    },
    [authorizedFetch, loadDrivers, loadOverview, loadShipments, resetToast]
  );

  if (!hydrated) {
    return (
      <section className="card" style={{ maxWidth: 480, margin: '40px auto' }}>
        <h1>Loading session…</h1>
        <p className="meta">Restoring your credentials. Hang tight.</p>
      </section>
    );
  }

  if (!token || !user) {
    return (
      <section className="card" style={{ maxWidth: 520, margin: '40px auto' }}>
        <h1>Sign in to launch the control tower</h1>
        <p className="meta" style={{ marginBottom: 16 }}>
          Authenticate with the dispatcher account created by the Prisma seed to manage shipments, routes, and drivers.
        </p>
        <Link href="/login" className="btn btn-primary">
          Go to login
        </Link>
      </section>
    );
  }

  return (
    <div>
      {toast && <div className="toast" style={{ marginBottom: 16 }}>{toast}</div>}
      {error && <div className="toast" style={{ marginBottom: 16, background: '#fee2e2', color: '#b91c1c' }}>{error}</div>}
      {overview && (
        <div className="stats-grid">
          <div className="stat-card">
            <h4>Created today</h4>
            <div className="value">{overview.shipmentsCreatedToday}</div>
          </div>
          <div className="stat-card">
            <h4>In motion</h4>
            <div className="value">{overview.shipmentsInMotion}</div>
          </div>
          <div className="stat-card">
            <h4>Delivered</h4>
            <div className="value">{overview.shipmentsDelivered}</div>
          </div>
          <div className="stat-card">
            <h4>Exceptions</h4>
            <div className="value">{overview.exceptionsOpen}</div>
          </div>
          <div className="stat-card">
            <h4>Routes today</h4>
            <div className="value">{overview.routesToday}</div>
          </div>
          <div className="stat-card">
            <h4>Drivers active</h4>
            <div className="value">{overview.driversActive}</div>
          </div>
        </div>
      )}

      <div className="section-grid" style={{ marginTop: 24 }}>
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Shipments</h2>
            {loading && <span className="meta">Refreshing…</span>}
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tracking</th>
                  <th>Status</th>
                  <th>Destination</th>
                  <th>Customer</th>
                  <th>Route</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment) => (
                  <tr key={shipment.id}>
                    <td>
                      <strong>{shipment.trackingCode}</strong>
                      {shipment.referenceNo && <div className="meta">Ref {shipment.referenceNo}</div>}
                    </td>
                    <td>
                      <span className={classForStatus(shipment.status)}>{shipment.status.replace('_', ' ')}</span>
                    </td>
                    <td>
                      {shipment.addressLine1}
                      <div className="meta">
                        {shipment.city}, {shipment.state} {shipment.postalCode}
                      </div>
                    </td>
                    <td>{shipment.customerName || '—'}</td>
                    <td>
                      {shipment.assignedRoute ? (
                        <div>
                          <strong>{shipment.assignedRoute.name}</strong>
                          <div className="meta">{shipment.assignedRoute.status}</div>
                        </div>
                      ) : (
                        <span className="meta">Unassigned</span>
                      )}
                    </td>
                    <td>{formatDate(shipment.latestEvent?.at || shipment.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        {statusActions[shipment.status]?.map((action) => (
                          <button
                            key={action.status}
                            className="btn btn-link"
                            type="button"
                            disabled={pendingShipment === shipment.id}
                            onClick={() => handleShipmentStatus(shipment.id, action.status)}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>Create shipment</h2>
          <form onSubmit={handleCreateShipment} className="form-grid">
            <div className="form-field">
              <label htmlFor="customer">Customer name</label>
              <input
                id="customer"
                value={newShipment.customerName}
                onChange={(event) => setNewShipment((prev) => ({ ...prev, customerName: event.target.value }))}
                placeholder="Acme Retail"
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="tracking">Tracking code</label>
              <input
                id="tracking"
                value={newShipment.trackingCode}
                onChange={(event) => setNewShipment((prev) => ({ ...prev, trackingCode: event.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="form-field">
              <label htmlFor="reference">Reference</label>
              <input
                id="reference"
                value={newShipment.referenceNo}
                onChange={(event) => setNewShipment((prev) => ({ ...prev, referenceNo: event.target.value }))}
                placeholder="Order #"
              />
            </div>
            <div className="form-field">
              <label htmlFor="address">Address</label>
              <input
                id="address"
                value={newShipment.addressLine1}
                onChange={(event) => setNewShipment((prev) => ({ ...prev, addressLine1: event.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="city">City</label>
              <input
                id="city"
                value={newShipment.city}
                onChange={(event) => setNewShipment((prev) => ({ ...prev, city: event.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="state">State</label>
              <input
                id="state"
                value={newShipment.state}
                onChange={(event) => setNewShipment((prev) => ({ ...prev, state: event.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="postal">Postal code</label>
              <input
                id="postal"
                value={newShipment.postalCode}
                onChange={(event) => setNewShipment((prev) => ({ ...prev, postalCode: event.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="service">Service level</label>
              <select
                id="service"
                value={newShipment.serviceLevel}
                onChange={(event) => setNewShipment((prev) => ({ ...prev, serviceLevel: event.target.value }))}
              >
                <option value="STANDARD">Standard</option>
                <option value="EXPEDITED">Expedited</option>
                <option value="OVERNIGHT">Overnight</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="deliverBy">Deliver by</label>
              <input
                id="deliverBy"
                type="date"
                value={newShipment.deliverBy}
                onChange={(event) => setNewShipment((prev) => ({ ...prev, deliverBy: event.target.value }))}
              />
            </div>
            <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
              <button className="btn btn-primary" type="submit" disabled={creatingShipment}>
                {creatingShipment ? 'Saving…' : 'Create shipment'}
              </button>
            </div>
          </form>

          <div style={{ marginTop: 32 }}>
            <h3>Plan route</h3>
            <form className="form-grid" onSubmit={handleCreateRoute}>
              <div className="form-field">
                <label htmlFor="routeName">Route name</label>
                <input
                  id="routeName"
                  value={routePlan.name}
                  onChange={(event) => setRoutePlan((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="serviceDate">Service date</label>
                <input
                  id="serviceDate"
                  type="date"
                  value={routePlan.serviceDate}
                  onChange={(event) => setRoutePlan((prev) => ({ ...prev, serviceDate: event.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="driver">Driver</label>
                <select
                  id="driver"
                  value={routePlan.driverId}
                  onChange={(event) => setRoutePlan((prev) => ({ ...prev, driverId: event.target.value }))}
                >
                  <option value="">Unassigned</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              </div>
            </form>
            <div className="helper-text" style={{ marginTop: 12 }}>
              Select shipments to include:
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
              {availableShipments.length === 0 && <div className="meta">No available shipments</div>}
              {availableShipments.map((shipment) => {
                const checked = routePlan.shipmentIds.includes(shipment.id);
                return (
                  <label key={shipment.id} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleRouteShipment(shipment.id)} />
                    <div>
                      <strong>{shipment.trackingCode}</strong>
                      <div className="meta">
                        {shipment.city}, {shipment.state}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="form-actions" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" type="button" disabled={creatingRoute} onClick={handleCreateRoute}>
                {creatingRoute ? 'Publishing…' : 'Publish route'}
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="section-grid" style={{ marginTop: 24 }}>
        <section className="card">
          <h2>Routes</h2>
          <div className="list">
            {routes.map((route) => (
              <div key={route.id} className="list-item" style={{ alignItems: 'flex-start' }}>
                <div>
                  <strong>{route.name}</strong>
                  <div className="meta">
                    {formatDateOnly(route.serviceDate)} • {route.driver ? route.driver.name : 'Unassigned'}
                  </div>
                  <div className="meta">{route.stopCount} stops • {route.status}</div>
                  <ul className="timeline" style={{ marginTop: 12 }}>
                    {route.stops.map((stop) => (
                      <li key={stop.id}>
                        <strong>
                          {stop.sequence}. {stop.shipment.trackingCode}
                        </strong>{' '}
                        → {stop.shipment.city}, {stop.shipment.state}
                        <div className="meta">
                          ETA {formatDate(stop.eta)} • Status {stop.shipment.status}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                {route.status !== 'COMPLETED' && route.status !== 'CANCELED' && (
                  <button className="btn btn-secondary" type="button" onClick={() => handleCompleteRoute(route.id)}>
                    Mark completed
                  </button>
                )}
              </div>
            ))}
            {routes.length === 0 && <div className="meta">No routes yet. Plan one on the right.</div>}
          </div>
        </section>

        <section className="card">
          <h2>Drivers</h2>
          <div className="list">
            {drivers.map((driver) => (
              <div key={driver.id} className="list-item">
                <div>
                  <strong>{driver.name}</strong>
                  <div className="meta">
                    {driver.phone || '—'} • {driver.vehiclePlate || 'No plate'}
                  </div>
                  <div className="meta">Last seen {driver.lastSeenAt ? formatDate(driver.lastSeenAt) : 'never'}</div>
                  {driver.activeRoute ? (
                    <div className="meta">Route: {driver.activeRoute.name}</div>
                  ) : (
                    <div className="meta">No active route</div>
                  )}
                </div>
                <div
                  className="live-banner"
                  style={{
                    background: driver.isOnline ? 'rgba(22, 163, 74, 0.12)' : '#e2e8f0',
                    color: driver.isOnline ? '#15803d' : '#475569',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: driver.isOnline ? '#16a34a' : '#94a3b8',
                      display: 'inline-block',
                    }}
                  />
                  {driver.isOnline ? 'Online' : 'Offline'}
                </div>
              </div>
            ))}
            {drivers.length === 0 && <div className="meta">No drivers registered yet.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
