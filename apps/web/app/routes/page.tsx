'use client';

import { RouteMap } from '../components/route-map';
import { routeHealth, stewartRouteStops, type RouteStop } from '../data/routes';

export default function RoutesPage() {
  return (
    <main>
      <header className="section">
        <div className="section-header">
          <div>
            <p className="badge">Stewart Post Office</p>
            <h1>Route builder & line-of-travel</h1>
            <p>Visualize the Stewart, MN loop with USPS right-hand delivery baked into every stop.</p>
          </div>
          <div className="card">
            <h3>Compliance</h3>
            <p className="stat-subtext">{routeHealth.compliance}</p>
            <p className="stat-subtext">{routeHealth.supervisor}</p>
          </div>
        </div>
        <div className="grid grid-3">
          <div className="card">
            <div className="stat-number">{routeHealth.distance}</div>
            <div className="stat-subtext">Optimized distance</div>
          </div>
          <div className="card">
            <div className="stat-number">{routeHealth.duration}</div>
            <div className="stat-subtext">Projected duration</div>
          </div>
          <div className="card">
            <div className="stat-number">5</div>
            <div className="stat-subtext">Stops in today&apos;s loop</div>
          </div>
        </div>
      </header>

      <section className="section">
        <div className="section-header">
          <h2>Sketch map</h2>
          <span className="pill">Right-hand priority</span>
        </div>
        <RouteMap stops={stewartRouteStops} caption="Every mailbox stay on the right; house drops preserve line-of-travel." />
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Turn-by-turn board</h2>
          <span className="pill">Sequence + ETA</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Seq</th>
                <th>Stop</th>
                <th>Delivery</th>
                <th>ETA</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {stewartRouteStops.map((stop: RouteStop) => (
                <tr key={stop.id}>
                  <td>{stop.sequence}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong>{stop.label}</strong>
                      <span className="muted">{stop.address}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`pill ${stop.dropType === '@house' ? 'pill-success' : 'pill-warning'}`}>{stop.dropType}</span>
                  </td>
                  <td>
                    <div>{stop.eta}</div>
                    <div className="muted">+{stop.travelMinutes} mins travel</div>
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
