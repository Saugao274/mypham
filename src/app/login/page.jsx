'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi đăng nhập');
      router.push('/dashboard');
      router.refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-brand-50 to-white">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 space-y-4 border border-brand-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-brand-700">Quản lý mỹ phẩm</div>
          <div className="text-sm text-slate-500 mt-1">Đăng nhập admin</div>
        </div>
        {err && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-sm">{err}</div>}
        <div>
          <label className="block text-sm font-medium mb-1">Tài khoản</label>
          <input value={u} onChange={e => setU(e.target.value)} required autoFocus
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Mật khẩu</label>
          <input type="password" value={p} onChange={e => setP(e.target.value)} required
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <button type="submit" disabled={loading} className="btn w-full justify-center">
          {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
