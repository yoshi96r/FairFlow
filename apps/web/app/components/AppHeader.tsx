'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../auth-context';

const navLinks = [
  { href: '/', label: 'Overview' },
  { href: '/dashboard', label: 'Control Tower' },
  { href: '/track', label: 'Live Map' },
  { href: '/capabilities', label: 'Capability Matrix' },
];

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hydrated, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="brand">
        <Link href="/">FairFlow Logistics</Link>
      </div>
      <nav className="nav-links">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link${pathname === link.href ? ' active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="auth-controls">
        {hydrated && user ? (
          <>
            <span>{user.email}</span>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                logout();
                router.push('/');
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <Link href="/login" className="btn btn-primary">
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
