'use client';
import { useEffect, useState } from 'react';

type Shipment = {
  id: string;
  trackingCode: string;
  status: string;
  city: string;
  state: string;
  serviceLevel?: string;
  createdAt: string;
};

type DashboardResponse = {
  ok: boolean;
  stats: {
    shipmentsByStatus: Record<string, number>;
    totals: {
      customers: number;
      activeRoutes: number;
      activeDrivers: number;
      pendingDeliveries: number;
    };
  };
  recentShipments: Shipment[];
};

const API_BASE = '/api';

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Created',
  ASSIGNED: 'Assigned',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  EXCEPTION: 'Exception',
  RETURNED: 'Returned'
};

export default function DashboardPage(){
  const [stats, setStats] = useState<DashboardResponse["stats"] | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerName: 'Walk-in Customer',
    contactEmail: '',
    addressLine1: '',
    addressLine2: '',
    city: 'Chicago',
    state: 'IL',
    postalCode: '',
    serviceLevel: 'STANDARD',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  async function refreshData(){
    setLoading(true);
    setError(null);
    try {
      const [statsRes, shipmentsRes, routesRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard/overview`).then((r) => r.json()),
        fetch(`${API_BASE}/shipments?limit=8`).then((r) => r.json()),
        fetch(`${API_BASE}/routes?window=today`).then((r) => r.json())
      ]);
      if (!statsRes.ok) throw new Error('Failed to load overview');
      if (!shipmentsRes.ok) throw new Error('Failed to load shipments');
      if (!routesRes.ok) throw new Error('Failed to load routes');
      setStats(statsRes.stats);
      setShipments(shipmentsRes.shipments);
      setRoutes(routesRes.routes);
    } catch (err: any) {
      setError(err?.message || 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  function updateField(e: any){
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function submitShipment(e: any){
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Unable to create shipment');
      setSuccess(`Shipment ${json.shipment.trackingCode} created`);
      setForm((prev) => ({ ...prev, addressLine1: '', postalCode: '', notes: '' }));
      refreshData();
    } catch (err: any) {
      setError(err?.message || 'Unable to create shipment');
    } finally {
      setSaving(false);
    }
  }

  const statusCards = ['CREATED', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED'].map((key) => ({
    key,
    label: STATUS_LABELS[key] || key,
    value: stats?.shipmentsByStatus?.[key] || 0
  }));

  return (
    <div>
      <h1 className="section-title" style={{ fontSize: 24 }}>Operations dashboard</h1>
      <p className="helper-text" style={{ marginBottom: 24 }}>Monitor live routes, outstanding stops, and inject new jobs for the drivers in the field.</p>
      {error && <div className="card" style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b', marginBottom: 24 }}>{error}</div>}
      <div className="cards-grid">
        {statusCards.map((card) => (
          <div key={card.key} className="card">
            <div className="stat-label">{card.label}</div>
            <div className="stat-value">{card.value}</div>
          </div>
        ))}
        <div className="card">
          <div className="stat-label">Customers</div>
          <div className="stat-value">{stats?.totals.customers ?? '—'}</div>
        </div>
        <div className="card">
          <div className="stat-label">Active routes</div>
          <div className="stat-value">{stats?.totals.activeRoutes ?? '—'}</div>
        </div>
        <div className="card">
          <div className="stat-label">Drivers online</div>
          <div className="stat-value">{stats?.totals.activeDrivers ?? 0}</div>
        </div>
        <div className="card">
          <div className="stat-label">Pending deliveries</div>
          <div className="stat-value">{stats?.totals.pendingDeliveries ?? 0}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '2fr 1fr', alignItems: 'start' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 className="section-title" style={{ margin: 0 }}>Recent shipments</h2>
            <button type="button" className="primary-button" style={{ padding: '8px 14px' }} onClick={refreshData} disabled={loading}>Refresh</button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Tracking</th>
                <th>Status</th>
                <th>City</th>
                <th>State</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => (
                <tr key={shipment.id}>
                  <td>{shipment.trackingCode}</td>
                  <td><span className="badge">{STATUS_LABELS[shipment.status] || shipment.status}</span></td>
                  <td>{shipment.city}</td>
                  <td>{shipment.state}</td>
                  <td>{new Date(shipment.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {!shipments.length && !loading && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>No shipments yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="section-title" style={{ margin: 0 }}>Schedule a shipment</h2>
          <p className="helper-text" style={{ marginBottom: 12 }}>Enter the stop details and dispatch will see it instantly.</p>
          <form onSubmit={submitShipment} className="form-grid">
            <div className="form-field">
              <label>Customer name</label>
              <input name="customerName" value={form.customerName} onChange={updateField} required />
            </div>
            <div className="form-field">
              <label>Contact email</label>
              <input name="contactEmail" value={form.contactEmail} onChange={updateField} type="email" placeholder="ops@example.com" />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Address line 1</label>
              <input name="addressLine1" value={form.addressLine1} onChange={updateField} required placeholder="233 W Huron St" />
            </div>
            <div className="form-field">
              <label>City</label>
              <input name="city" value={form.city} onChange={updateField} required />
            </div>
            <div className="form-field">
              <label>State</label>
              <input name="state" value={form.state} onChange={updateField} required />
            </div>
            <div className="form-field">
              <label>Postal code</label>
              <input name="postalCode" value={form.postalCode} onChange={updateField} required />
            </div>
            <div className="form-field">
              <label>Service level</label>
              <select name="serviceLevel" value={form.serviceLevel} onChange={updateField}>
                <option value="STANDARD">Standard</option>
                <option value="EXPEDITED">Expedited</option>
                <option value="OVERNIGHT">Overnight</option>
              </select>
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Notes</label>
              <textarea name="notes" value={form.notes} onChange={updateField} rows={3} placeholder="Gate code, reference, etc." />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add shipment'}</button>
              {success && <span className="helper-text" style={{ color: '#15803d' }}>{success}</span>}
            </div>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2 className="section-title" style={{ margin: '0 0 16px' }}>Routes on the street</h2>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {routes.map((route) => (
            <div key={route.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong>{route.name}</strong>
                <span className="helper-text">{new Date(route.serviceDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="helper-text" style={{ marginBottom: 12 }}>Driver: {route.driver?.name || 'Unassigned'}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {route.stops.map((stop: any) => (
                  <li key={stop.id} className="status-pill">
                    <span className="badge" style={{ background: '#e2e8f0', color: '#0f172a' }}>{stop.sequence}</span>
                    <div>
                      <div>{stop.shipment?.trackingCode}</div>
                      <div className="helper-text">{stop.shipment?.city}, {stop.shipment?.state}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {!routes.length && <p className="helper-text">No routes scheduled for today.</p>}
        </div>
      </div>
    </div>
  );
}
