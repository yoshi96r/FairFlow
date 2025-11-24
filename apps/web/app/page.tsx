'use client';

import { useMemo, useState } from 'react';
import { RouteMap } from './components/route-map';
import { packageSeed, type Package } from './data/packages';
import { stewartRouteStops, type RouteStop } from './data/routes';

export default function Home() {
  const [packages, setPackages] = useState<Package[]>(packageSeed);
  const [barcode, setBarcode] = useState('');
  const [preference, setPreference] = useState<'@mailbox' | '@house'>('@mailbox');
  const [note, setNote] = useState('Hand to customer if present; otherwise place out of weather.');

  const deliveryProgress = useMemo(() => {
    const delivered = packages.filter((p) => p.status === 'Delivered').length;
    const percentage = Math.round((delivered / packages.length) * 100);
    return { delivered, percentage };
  }, [packages]);

  const handleScan = () => {
    if (!barcode.trim()) return;
    setPackages((prev) => [
      {
        id: barcode.trim(),
        address: 'Unassigned address (awaiting geocode)',
        preference,
        instructions: note,
        status: 'Pending',
        photoHint: 'linear-gradient(135deg, rgba(0,75,135,0.2), rgba(220,20,60,0.2))',
      },
      ...prev,
    ]);
    setBarcode('');
  };

  return (
    <main>
      <header className="section">
        <div className="section-header">
          <div>
            <p className="badge">USPS-inspired | Stewart, MN</p>
            <h1>Route command for postal drivers</h1>
            <p>Learn unfamiliar territory with package-aware routing, visual delivery cues, and supervisor-ready reporting.</p>
          </div>
          <div className="card">
            <h3>Start & Return</h3>
            <p className="stat-number">707 Hall St</p>
            <p className="stat-subtext">Stewart Post Office • Dynamic right-hand loop</p>
          </div>
        </div>
        <div className="grid grid-3">
          <div className="card">
            <div className="stat-number">{packages.length}</div>
            <div className="stat-subtext">Packages in today&apos;s tour</div>
          </div>
          <div className="card">
            <div className="stat-number">{deliveryProgress.percentage}%</div>
            <div className="stat-subtext">Right-hand deliveries completed</div>
          </div>
          <div className="card">
            <div className="stat-number">6.4 mi</div>
            <div className="stat-subtext">Optimized line-of-travel loop</div>
          </div>
        </div>
      </header>

      <section className="section">
        <div className="section-header">
          <h2>Route visualization & USPS right-hand logic</h2>
          <span className="pill">Dynamic line of travel</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1.3fr 0.7fr', gap: 16 }}>
          <RouteMap
            stops={stewartRouteStops}
            caption="Interactive map mirrors USPS right-hand delivery: each stop is sequenced so mailboxes stay on the driver&apos;s right and line-of-travel is preserved."
          />
          <div className="list">
            {stewartRouteStops.map((stop: RouteStop) => (
              <div key={stop.id} className="list-item">
                <div>
                  <strong>{stop.label}</strong>
                  <div style={{ fontSize: 13 }}>{stop.address}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{stop.note}</div>
                </div>
                <span className={`pill ${stop.dropType === '@house' ? 'pill-success' : 'pill-warning'}`}>
                  {stop.dropType}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>OCR barcode intake</h2>
          <span className="pill">Scan to add & route</span>
        </div>
        <div className="form-grid">
          <div className="card">
            <h3>Scan barcode</h3>
            <p className="stat-subtext">OCR-friendly input accepts USPS/FedEx/UPS labels.</p>
            <input
              className="input"
              placeholder="Scan or paste barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
            <select className="select" value={preference} onChange={(e) => setPreference(e.target.value as '@mailbox' | '@house')}>
              <option value="@mailbox">@mailbox – keep to right-hand delivery</option>
              <option value="@house">@house – porch/garage side</option>
            </select>
            <textarea
              className="input"
              style={{ minHeight: 90 }}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button className="button" onClick={handleScan}>Add to route</button>
          </div>
          <div className="card">
            <h3>Auto-route notes</h3>
            <ul className="list" style={{ listStyle: 'none', padding: 0 }}>
              <li>• New packages inherit the line-of-travel sequence from the Stewart hub.</li>
              <li>• Right-hand logic ensures no left-side mailbox crossovers.</li>
              <li>• Scanner captures location preference (@mailbox or @house) and anchors instructions.</li>
            </ul>
          </div>
        </div>
        <div className="grid grid-3" style={{ marginTop: 16 }}>
          {packages.map((pkg) => (
            <div key={pkg.id} className="media-card">
              <div className="media-thumb" style={{ backgroundImage: pkg.photoHint }} />
              <div className="media-body">
                <div className="flex-row" style={{ justifyContent: 'space-between' }}>
                  <strong>{pkg.id}</strong>
                  <span className={`pill ${pkg.preference === '@house' ? 'pill-success' : 'pill-warning'}`}>{pkg.preference}</span>
                </div>
                <div style={{ fontSize: 13, marginTop: 6 }}>{pkg.address}</div>
                <div style={{ fontSize: 13, color: '#6c757d', marginTop: 4 }}>{pkg.instructions}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#0f5132' }}>{pkg.status}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Delivery walkthrough</h2>
          <span className="pill">Guided stops with visual proof</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <h3>Location-specific instructions</h3>
            <div className="timeline">
              <div className="timeline-step">
                <strong>312 Cedar Ave (@mailbox)</strong>
                <div>Locking mailbox; keep vehicle right-hand to curb, no driveway entry.</div>
              </div>
              <div className="timeline-step">
                <strong>98 Prairie View Rd (@house)</strong>
                <div>Approach front porch, bench drop with photo; alert if dog in yard.</div>
              </div>
              <div className="timeline-step">
                <strong>141 Sunrise Cir (@house)</strong>
                <div>Garage-side door; capture photo reference and knock for signature items.</div>
              </div>
            </div>
          </div>
          <div className="card">
            <h3>USPS-compliant route</h3>
            <div className="list">
              <div className="list-item">
                <div>
                  <strong>Right-hand delivery</strong>
                  <div style={{ fontSize: 13 }}>Stops sequenced to keep mailboxes on the passenger side.</div>
                </div>
                <span className="pill">Safety first</span>
              </div>
              <div className="list-item">
                <div>
                  <strong>Line-of-travel optimized</strong>
                  <div style={{ fontSize: 13 }}>No backtracking; loop returns to Stewart Post Office.</div>
                </div>
                <span className="pill pill-success">Loop closed</span>
              </div>
              <div className="list-item">
                <div>
                  <strong>Visual guidance</strong>
                  <div style={{ fontSize: 13 }}>Photo history shows correct porch/bench/garage drops.</div>
                </div>
                <span className="pill pill-warning">Photo check</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Supervisor reporting & admin</h2>
          <span className="pill">Auto-submit on route completion</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="card">
            <h3>Completion packet</h3>
            <p>Route automatically submits package scans, proof photos, and timestamps back to supervisors when the driver returns to 707 Hall St.</p>
          </div>
          <div className="card">
            <h3>Admin panel</h3>
            <p>Create, update, or retire routes; manage right-hand delivery constraints and photo requirements without leaving the dashboard.</p>
          </div>
          <div className="card">
            <h3>Exception alerts</h3>
            <p>Weather, blocked mailbox, or gated house? Flag exceptions with one tap so dispatch can re-route or notify recipients instantly.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
