const quickActions = [
  {
    title: 'Load-Out Checklist',
    icon: '📦',
    description: 'Confirm every parcel, accountable piece, and hold mail item before you roll out.',
    steps: [
      'Scan parcels and mark signature-required pieces',
      'Print or sync your manifest to the handheld',
      'Stage parcels in delivery order for faster curbside stops',
    ],
  },
  {
    title: 'Mailbox Prep & Notices',
    icon: '📬',
    description: 'Keep customers in the loop and avoid second trips to long driveways.',
    steps: [
      'Bundle redelivery & collection notices with today\'s route',
      'Flag hardship deliveries for door service reminders',
      'Queue up scheduled pickups in the app before departure',
    ],
  },
  {
    title: 'Safety & Vehicle Readiness',
    icon: '🛠️',
    description: 'Start the day knowing your LLV or POV is road-ready and documented.',
    steps: [
      'Check tires, lights, flashers, and back-up alarm',
      'Log vehicle mileage, fuel level, and inspection photos',
      'Update emergency contacts and rural reach numbers',
    ],
  },
];

const routeTimeline = [
  {
    time: '6:30 AM',
    title: 'Vehicle Inspection & Loading',
    detail: 'Finish pre-trip checks and load parcels by stop sequence. Highlight signature stops in the manifest.',
  },
  {
    time: '9:15 AM',
    title: 'Mid-Morning Cluster',
    detail: 'Prioritize school and business deliveries before 11 AM. Use quick notes for gate codes or dogs.',
  },
  {
    time: '12:45 PM',
    title: 'Lunch + Wellness Break',
    detail: 'Record break location for mileage credit. Stretch and hydrate—app reminds you after 4 hours of continuous driving.',
  },
  {
    time: '3:30 PM',
    title: 'Afternoon Parcel Surge',
    detail: 'Switch to parcel-heavy workflow with photo confirmation prompts and one-tap customer callbacks.',
  },
  {
    time: '5:10 PM',
    title: 'Return to Office & Close-Out',
    detail: 'Sync delivery scans, submit delays, and auto-generate PS Form 4240 entries before dispatch cutoff.',
  },
];

const toolkit = [
  {
    title: 'Mileage & Time Log',
    icon: '🧭',
    detail: 'Capture route deviations, detours, and break mileage for weekly evaluations.',
    action: 'Open log sheet',
  },
  {
    title: 'Package Lookup',
    icon: '🔍',
    detail: 'Search by address, article number, or nickname when a customer calls mid-route.',
    action: 'Find a package',
  },
  {
    title: 'Scanner Health',
    icon: '🔋',
    detail: 'Run a quick diagnostic on battery life, storage, and network strength before leaving the lot.',
    action: 'Run diagnostics',
  },
  {
    title: 'Hazard Notes',
    icon: '⚠️',
    detail: 'Track dogs, washed-out roads, or construction areas. Share instantly with relief carriers.',
    action: 'Record a hazard',
  },
  {
    title: 'Customer Directory',
    icon: '👥',
    detail: 'Save gate codes, preferred delivery spots, and special service requests to avoid repeat questions.',
    action: 'View households',
  },
  {
    title: 'Supply Tracker',
    icon: '📋',
    detail: 'Monitor tray counts, rubber bands, scan forms, and cash bag balances for weekly inventory.',
    action: 'Update supplies',
  },
];

const updates = [
  {
    title: 'Weather Alert: High Winds on Route 12',
    level: 'warning',
    detail: 'Secure loose parcels and switch to curbside delivery where possible. Expect 35 mph gusts from noon to 4 PM.',
  },
  {
    title: 'New Mail Count Reminder',
    level: 'info',
    detail: 'Start logging raw letters and flats today. The companion app will prompt you at each cluster box.',
  },
  {
    title: 'Relief Carrier Scheduled Friday',
    level: 'success',
    detail: 'Share hazard and customer notes before Thursday evening to prep the substitute driver.',
  },
];

const resourceLibrary = [
  {
    title: 'Weekly Planning Toolkit',
    icon: '🗂️',
    summary: 'Route evaluation worksheet, DPS variance tracker, and personal time estimator.',
    links: ['Download planner', 'Watch 5-minute setup video'],
  },
  {
    title: 'Community & Support',
    icon: '🤝',
    summary: 'Tap into union updates, rural carrier forums, and mentorship calls when you hit a snag.',
    links: ['View local steward contacts', 'Join this week\'s Q&A'],
  },
];

const badgeMap: Record<string, string> = {
  warning: 'badge badge--warning',
  success: 'badge badge--success',
  info: 'badge',
};

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <span className="hero__tag">Daily companion for USPS rural carriers</span>
        <h1>FairFlow keeps your route organized, safe, and on schedule.</h1>
        <p>
          From pre-trip inspections to afternoon parcel surges, FairFlow centralizes the checklists,
          reminders, and references you need to serve every mailbox with confidence.
        </p>
        <div className="hero__actions">
          <a className="button button--primary" href="#daily-board">
            Start today&apos;s route
          </a>
          <a className="button button--ghost" href="#toolkit">
            Open toolkit
          </a>
        </div>
        <dl className="hero__stats">
          <div>
            <dt>Average time saved</dt>
            <dd>34 min / day</dd>
          </div>
          <div>
            <dt>Routes using FairFlow</dt>
            <dd>2,180+</dd>
          </div>
          <div>
            <dt>Hazards shared this month</dt>
            <dd>486</dd>
          </div>
        </dl>
      </section>

      <section id="daily-board" className="card-grid">
        <header className="section-header">
          <h2>Daily task board</h2>
          <p>Stay ahead of the rush with focused cards that guide the start of your shift.</p>
        </header>
        <div className="grid">
          {quickActions.map((item) => (
            <article className="card" key={item.title}>
              <div className="card__icon" aria-hidden="true">
                {item.icon}
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <ul className="card__list">
                {item.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="timeline" aria-labelledby="route-snapshot-heading">
        <header className="section-header">
          <h2 id="route-snapshot-heading">Route snapshot</h2>
          <p>Follow the rhythm of a high-performing rural route with gentle reminders built in.</p>
        </header>
        <ol className="timeline__list">
          {routeTimeline.map((event) => (
            <li className="timeline__item" key={event.time}>
              <span className="timeline__time">{event.time}</span>
              <div className="timeline__content">
                <h3>{event.title}</h3>
                <p>{event.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="toolkit" className="toolkit">
        <header className="section-header">
          <h2>Essential tools</h2>
          <p>Everything you need throughout the day, one tap away in the FairFlow companion app.</p>
        </header>
        <div className="grid">
          {toolkit.map((tool) => (
            <article className="card" key={tool.title}>
              <div className="card__icon" aria-hidden="true">
                {tool.icon}
              </div>
              <h3>{tool.title}</h3>
              <p>{tool.detail}</p>
              <a className="button button--ghost" href="#">
                {tool.action}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="updates-heading">
        <header className="section-header">
          <h2 id="updates-heading">Live route updates</h2>
          <p>Respond quickly to weather, staffing, and service alerts across your assigned territory.</p>
        </header>
        <div className="updates">
          {updates.map((update) => (
            <article className="update-card" key={update.title}>
              <span className={badgeMap[update.level] ?? 'badge'}>{update.level}</span>
              <h3>{update.title}</h3>
              <p>{update.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="resource-grid" aria-labelledby="resource-heading">
        <header className="section-header">
          <h2 id="resource-heading">Resources & community</h2>
          <p>Plan the week ahead and connect with fellow carriers for tips that make the job lighter.</p>
        </header>
        <div className="grid">
          {resourceLibrary.map((resource) => (
            <article className="card" key={resource.title}>
              <div className="card__icon" aria-hidden="true">
                {resource.icon}
              </div>
              <h3>{resource.title}</h3>
              <p>{resource.summary}</p>
              <ul>
                {resource.links.map((link) => (
                  <li key={link}>{link}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
