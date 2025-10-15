'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, hydrated } = useAuth();
  const [email, setEmail] = useState('dispatcher@fairflow.local');
  const [password, setPassword] = useState('dispatch');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push('/dashboard');
  }

  if (hydrated && user) {
    return (
      <section className="card" style={{ maxWidth: 440, margin: '40px auto' }}>
        <h1>Already signed in</h1>
        <p className="meta">Use the control tower to manage shipments or explore the live map.</p>
        <div className="form-actions">
          <Link href="/dashboard" className="btn btn-primary">
            Go to dashboard
          </Link>
          <Link href="/track" className="btn btn-secondary">
            View live map
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="card" style={{ maxWidth: 440, margin: '40px auto' }}>
      <h1 style={{ marginBottom: 16 }}>Sign in</h1>
      <p className="meta" style={{ marginBottom: 24 }}>
        Use the dispatcher credentials created by the Prisma seed to access the logistics control tower.
      </p>
      <form onSubmit={handleSubmit} className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && <div className="toast">{error}</div>}
        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
      <p className="helper-text" style={{ marginTop: 16 }}>
        Default credentials: <code>dispatcher@fairflow.local</code> / <code>dispatch</code>
      </p>
    </section>
  );
}
