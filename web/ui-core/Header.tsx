'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuthStatus } from '@/lib/auth/useAuthStatus';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthed } = useAuthStatus();

  const closeMenu = () => setIsMenuOpen(false);

  const guestNav: { href: string; label: string; desktopOnly?: string }[] = [
    { href: '/', label: 'Home' },
    { href: '/courses', label: 'Courses' },
    { href: '/products', label: 'Products' },
    { href: '/about', label: 'About', desktopOnly: 'lg' },
    { href: '/contact', label: 'Contact', desktopOnly: 'xl' },
  ];

  const studentNav: { href: string; label: string; desktopOnly?: string }[] = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/testhub', label: 'TestHub' },
    { href: '/courses', label: 'Courses' },
  ];

  const navLinks = isAuthed === null ? [] : isAuthed ? studentNav : guestNav;

  return (
    <header className="bg-white shadow-sm sticky top-0 z-[100]">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 relative">
        <div className="flex-shrink-0 relative z-10">
          <Link href={isAuthed ? '/dashboard' : '/'} className="flex items-center gap-3">
            <img
              src="/images/saphala-logo.png"
              alt="Saphala Logo"
              className="h-11 md:h-12 w-auto object-contain"
            />
            <div className="hidden sm:flex flex-col gap-0.5">
              <span className="text-xl font-bold text-[var(--brand-primary)] tracking-tight leading-tight">
                Saphala Pathshala
              </span>
              <span className="text-sm font-medium text-blue-900 opacity-90 leading-tight">
                Your Success is Our Focus
              </span>
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6 lg:gap-10 absolute left-1/2 -translate-x-1/2 pointer-events-none w-max z-0">
          {navLinks.map((link) => {
            const hideClass = link.desktopOnly
              ? `hidden ${link.desktopOnly}:inline`
              : '';
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-gray-600 hover:text-[#2D1B69] font-medium transition-colors pointer-events-auto ${hideClass}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 md:gap-4 flex-shrink-0 relative z-20 pointer-events-auto">
          {isAuthed === null ? (
            <div className="hidden sm:flex items-center gap-3 md:gap-4">
              <div className="w-[72px] h-[36px]" />
            </div>
          ) : isAuthed ? (
            <div className="hidden sm:flex items-center gap-3 md:gap-4">
              <LogoutHeaderButton />
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-3 md:gap-4">
              <Link
                href="/login"
                className="btn-glossy-secondary text-sm px-4 lg:px-6 py-2 whitespace-nowrap"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="btn-glossy-primary text-sm px-4 lg:px-6 py-2 whitespace-nowrap cursor-pointer"
              >
                Create Account
              </Link>
            </div>
          )}

          <button
            type="button"
            className="md:hidden p-2 text-[#2D1B69]"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-6 px-4 absolute w-full shadow-lg z-[90]">
          <nav className="flex flex-col gap-4 mb-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="text-gray-600 font-medium py-2"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-4 sm:hidden">
            {isAuthed ? (
              <LogoutHeaderButton fullWidth />
            ) : (
              <>
                <Link href="/login" onClick={closeMenu} className="btn-glossy-secondary text-center py-3">
                  Log In
                </Link>
                <Link href="/register" onClick={closeMenu} className="btn-glossy-primary w-full py-3 text-center cursor-pointer">
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

function LogoutHeaderButton({ fullWidth }: { fullWidth?: boolean }) {
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json();
      window.location.href = data.redirectTo || '/';
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={busy}
      className={`btn-glossy-secondary text-sm px-4 lg:px-6 py-2 whitespace-nowrap disabled:opacity-50 ${fullWidth ? 'w-full py-3 text-center' : ''}`}
    >
      {busy ? 'Logging out…' : 'Log Out'}
    </button>
  );
}
