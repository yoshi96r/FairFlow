import Link from 'next/link';

const highlights = [
  {
    title: 'Live control tower',
    description:
      'Orchestrate routes, assignments, and service levels from a single dashboard with live location feeds.',
  },
  {
    title: 'Driver-first mobility',
    description:
      'Background GPS streaming, proof-of-delivery capture, and route compliance are built in for drivers.',
  },
  {
    title: 'Exception-ready workflows',
    description:
      'Escalations, customer communication, and billing-ready status trails keep stakeholders aligned.',
  },
];

export default function Home() {
  return (
    <div className="split">
      <section className="card">
        <h1 style={{ fontSize: 32, marginBottom: 12 }}>FairFlow Logistics Platform</h1>
        <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.6 }}>
          FairFlow brings dispatchers, drivers, warehouse teams, and customers into one operating picture. Track shipments end to
          end, respond to exceptions in seconds, and let customers self-serve with the same data you see in the control tower.
        </p>
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <Link href="/dashboard" className="btn btn-primary">
            Open Control Tower
          </Link>
          <Link href="/track" className="btn btn-secondary">
            View Live Map
          </Link>
        </div>
        <div style={{ marginTop: 32 }}>
          <h3 style={{ marginBottom: 12 }}>Platform highlights</h3>
          <ul className="list">
            {highlights.map((item) => (
              <li key={item.title} className="list-item">
                <div>
                  <strong>{item.title}</strong>
                  <div className="meta">{item.description}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <aside className="card" style={{ background: '#0f172a', color: '#f8fafc' }}>
        <h2 style={{ color: '#f8fafc' }}>Build the roadmap</h2>
        <p style={{ color: '#cbd5f5', fontSize: 15, lineHeight: 1.6 }}>
          Explore the full capability blueprint captured with industry experts. It covers shipment lifecycle milestones, warehouse
          operations, financial controls, customer experience, analytics, and platform services.
        </p>
        <Link href="/capabilities" className="btn btn-secondary" style={{ marginTop: 16, alignSelf: 'flex-start' }}>
          Open capability matrix
        </Link>
        <div style={{ marginTop: 24 }}>
          <div className="badge">What&apos;s inside</div>
          <ul style={{ marginTop: 12, color: '#e2e8f0', fontSize: 14, lineHeight: 1.6 }}>
            <li>Role-based workflows across dispatch, warehouse, and customer portals.</li>
            <li>Visibility and analytics requirements for control tower operations.</li>
            <li>Integration and compliance notes for scaling in regulated markets.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
