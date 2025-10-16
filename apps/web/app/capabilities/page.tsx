import fs from 'fs';
import path from 'path';

export const dynamic = 'force-static';

export default function CapabilitiesPage() {
  const markdown = fs.readFileSync(
    path.join(process.cwd(), 'docs/logistics-capability-matrix.md'),
    'utf-8'
  );

  return (
    <section className="card" style={{ maxWidth: 960, margin: '0 auto' }}>
      <h1>Logistics capability matrix</h1>
      <p className="meta" style={{ marginBottom: 16 }}>
        Direct view of the backlog reference captured with the logistics subject-matter expert. Use this to align product,
        engineering, and operations priorities.
      </p>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          background: '#f8fafc',
          borderRadius: 12,
          padding: 16,
          border: '1px solid #e2e8f0',
          fontSize: 14,
          lineHeight: 1.6,
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      >
        {markdown}
      </pre>
    </section>
  );
}
