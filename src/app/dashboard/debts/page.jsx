'use client';
import { useEffect, useState } from 'react';
import { useCurrentMonth } from '@/lib/useCurrentMonth';
import DebtTable from '@/components/DebtTable';

export default function DebtsPage() {
  const { monthId, months, reload } = useCurrentMonth();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { reload(); }, []);

  async function loadDebts() {
    if (!monthId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/debts?monthId=${monthId}`);
      const data = await res.json();
      setDebts(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }
  useEffect(() => { loadDebts(); }, [monthId]);

  if (!months.length) {
    return <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
      <div className="text-lg font-semibold mb-1">Chưa có tháng nào</div>
      <p className="text-sm text-slate-500">Tạo tháng ở mục <a href="/dashboard/manage" className="text-brand-600 hover:underline">Tháng / Import / Export</a>.</p>
    </div>;
  }
  return <DebtTable monthId={monthId} debts={debts} loading={loading} onChanged={loadDebts} />;
}
