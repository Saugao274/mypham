'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MonthSelector from '@/components/MonthSelector';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const links = [
    { href: '/dashboard', label: 'Tổng hợp' },
    { href: '/dashboard/products', label: 'Sản phẩm' },
    { href: '/dashboard/debts', label: 'Nợ' },
    { href: '/dashboard/manage', label: 'Tháng / Import / Export' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 py-3 flex items-center gap-3">
          <button className="md:hidden btn-ghost !p-2" onClick={() => setOpen(v => !v)} aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
          <div className="font-bold text-brand-700 text-lg">💄 Mỹ phẩm</div>
          <nav className="hidden md:flex items-center gap-1 ml-2">
            {links.map(l => (
              <Link key={l.href} href={l.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${pathname === l.href ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-brand-50'}`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <MonthSelector />
            <button onClick={logout} className="btn-ghost">Đăng xuất</button>
          </div>
        </div>
        {open && (
          <nav className="md:hidden border-t border-slate-100 bg-white">
            {links.map(l => (
              <Link key={l.href} href={l.href}
                className={`block px-4 py-2.5 text-sm ${pathname === l.href ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700'}`}>
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 md:px-6 py-4 md:py-6">
        {children}
      </main>
      <footer className="text-center text-xs text-slate-400 py-4">Made with 💗 · Next.js + MongoDB</footer>
    </div>
  );
}
