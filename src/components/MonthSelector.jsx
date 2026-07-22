'use client';
import { useEffect, useState } from 'react';
import { useCurrentMonth } from '@/lib/useCurrentMonth';

export default function MonthSelector() {
  const { monthId, setMonthId, months, reload } = useCurrentMonth();
  useEffect(() => { reload(); }, []);

  if (!months.length) {
    return <span className="text-xs text-slate-500 hidden sm:inline">Chưa có tháng nào</span>;
  }
  return (
    <select
      value={monthId || ''}
      onChange={e => setMonthId(e.target.value)}
      className="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
    >
      {months.map(m => (
        <option key={m._id} value={m._id}>{m.label}</option>
      ))}
    </select>
  );
}
