'use client';

import { useState } from 'react';
import { stewartRouteStops } from '../data/routes';

export default function AdminPage() {
  const [routeName, setRouteName] = useState('Stewart Loop A');
  const [driver, setDriver] = useState('Driver 5501');
  const [requirePhoto, setRequirePhoto] = useState(true);
  const [note, setNote] = useState('Keep mailboxes on the right; avoid gated lanes.');

  return (
    <main>
      <header className="section">
        <div className="section-header">
          <div>
            <p className="badge">Admin</p>
            <h1>Supervisor controls</h1>
            <p>Create and audit routes, enforce delivery proof, and handle exceptions before dispatch.</p>
          </div>
          <div className="card">
            <h3>Return reporting</h3>
            <p className="stat-subtext">Auto-submit driver proof when arriving back to 707 Hall St.</p>
          </div>
        </div>
      </header>

      <section className="section">
        <div className="section-header">
          <h2>Route setup</h2>
          <span className="pill">CRUD + guardrails</span>
        </div>
        <div className="form-grid">
          <div className="card">
            <h3>Edit route metadata</h3>
            <label className="muted">Name</label>
            <input className="input" value={routeName} onChange={(e) => setRouteName(e.target.value)} />
            <label className="muted" style={{ marginTop: 8 }}>Assigned driver</label>
            <input className="input" value={driver} onChange={(e) => setDriver(e.target.value)} />
            <label className="muted" style={{ marginTop: 8 }}>Supervisor note</label>
            <textarea className="input" style={{ minHeight: 80 }} value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex-row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
              <label className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={requirePhoto} onChange={(e) => setRequirePhoto(e.target.checked)} />
                Require photo proof on @house drops
              </label>
              <button className="button">Save</button>
            </div>
          </div>
          <div className="card">
            <h3>Exception templates</h3>
            <ul className="list" style={{ listStyle: 'none', padding: 0 }}>
              <li>• Blocked mailbox → reroute to porch with photo</li>
              <li>• Gated community → request phone confirmation</li>
              <li>• Weather hold → leave at post office, mark & notify</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Stops overview</h2>
          <span className="pill">Right-hand delivery enforced</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Stop</th>
                <th>Drop</th>
                <th>Instruction</th>
              </tr>
            </thead>
            <tbody>
              {stewartRouteStops.map((stop) => (
                <tr key={stop.id}>
                  <td>{stop.sequence}</td>
                  <td>
                    <strong>{stop.label}</strong>
                    <div className="muted">{stop.address}</div>
                  </td>
                  <td>
                    <span className={`pill ${stop.dropType === '@house' ? 'pill-success' : 'pill-warning'}`}>{stop.dropType}</span>
                  </td>
                  <td className="muted">{stop.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
