'use client';

import { useMemo, useState } from 'react';
import { RouteMap } from '../components/route-map';
import { packageSeed, type Package } from '../data/packages';
import { stewartRouteStops } from '../data/routes';

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>(packageSeed);
  const [barcode, setBarcode] = useState('');
  const [preference, setPreference] = useState<'@mailbox' | '@house'>('@mailbox');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Package['status']>('ALL');

  const filtered = useMemo(() => {
    if (statusFilter === 'ALL') return packages;
    return packages.filter((pkg) => pkg.status === statusFilter);
  }, [packages, statusFilter]);

  function handleAdd() {
    if (!barcode.trim()) return;
    setPackages((prev) => [
      {
        id: barcode.trim(),
        address: 'Awaiting assignment',
        preference,
        instructions: 'Captured from OCR intake',
        status: 'Pending',
        photoHint: 'linear-gradient(135deg, rgba(0,75,135,0.2), rgba(220,20,60,0.2))',
      },
      ...prev,
    ]);
    setBarcode('');
  }

  return (
    <main>
      <header className="section">
        <div className="section-header">
          <div>
            <p className="badge">Stewart, MN</p>
            <h1>Package intake & delivery playbook</h1>
            <p>Scan parcels, respect @mailbox vs @house preferences, and double-check visual references before drop-off.</p>
          </div>
          <div className="card">
            <h3>Right-hand delivery guardrails</h3>
            <p className="stat-subtext">Auto-applies to every new package added to the Stewart loop.</p>
          </div>
        </div>
        <div className="grid grid-3">
          <div className="card">
            <div className="stat-number">{packages.length}</div>
            <div className="stat-subtext">Tracked parcels</div>
          </div>
          <div className="card">
            <div className="stat-number">{packages.filter((p) => p.preference === '@house').length}</div>
            <div className="stat-subtext">House deliveries</div>
          </div>
          <div className="card">
            <div className="stat-number">{packages.filter((p) => p.preference === '@mailbox').length}</div>
            <div className="stat-subtext">Mailbox deliveries</div>
          </div>
        </div>
      </header>

      <section className="section">
        <div className="section-header">
          <h2>OCR barcode capture</h2>
          <span className="pill">Input → preference → dispatch</span>
        </div>
        <div className="form-grid">
          <div className="card">
            <h3>Scan or paste barcode</h3>
            <input
              className="input"
              placeholder="9400 1000 0000 0000 0000"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
            <select className="select" value={preference} onChange={(e) => setPreference(e.target.value as '@mailbox' | '@house')}>
              <option value="@mailbox">@mailbox – route to passenger side delivery</option>
              <option value="@house">@house – porch/garage guidance</option>
            </select>
            <button className="button" onClick={handleAdd}>Add package</button>
          </div>
          <div className="card">
            <h3>Filter by status</h3>
            <div className="chip-row">
              {(['ALL', 'Pending', 'Out for delivery', 'Delivered'] as const).map((opt) => (
                <button
                  key={opt}
                  className={`chip ${statusFilter === opt ? 'chip-active' : ''}`}
                  onClick={() => setStatusFilter(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
            <p className="stat-subtext">Use this view to hand packages to the driver in USPS order.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Package roster</h2>
          <span className="pill">Live delivery notes</span>
        </div>
        <div className="grid grid-3">
          {filtered.map((pkg) => (
            <div key={pkg.id} className="media-card">
              <div className="media-thumb" style={{ backgroundImage: pkg.photoHint }} />
              <div className="media-body">
                <div className="flex-row" style={{ justifyContent: 'space-between' }}>
                  <strong>{pkg.id}</strong>
                  <span className={`pill ${pkg.preference === '@house' ? 'pill-success' : 'pill-warning'}`}>{pkg.preference}</span>
                </div>
                <div style={{ fontSize: 13, marginTop: 6 }}>{pkg.address}</div>
                <div style={{ fontSize: 13, color: '#6c757d', marginTop: 4 }}>{pkg.instructions}</div>
                <div className="status-row">
                  <span className={`status ${pkg.status === 'Delivered' ? 'status-success' : pkg.status === 'Pending' ? 'status-warn' : ''}`}>
                    {pkg.status}
                  </span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Photo proof encouraged</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Route alignment</h2>
          <span className="pill">Stops inherit package preferences</span>
        </div>
        <RouteMap stops={stewartRouteStops} caption="Route builder keeps each mailbox to the right-hand side." />
      </section>
    </main>
  );
}
