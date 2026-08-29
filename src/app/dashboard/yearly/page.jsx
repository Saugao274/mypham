'use client';
import { useEffect, useState } from 'react';
import YearlyTable from '@/components/YearlyTable';

export default function YearlyPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadData(targetYear) {
    setLoading(true);
    try {
      const res = await fetch(`/api/yearly/${targetYear}`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(year);
  }, [year]);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>📅</span> Báo cáo tổng hợp năm
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng kết thu, chi, chênh lệch và các đợt nhập hàng theo từng tháng
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Chọn năm:</span>
          <select 
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-slate-300 rounded-md px-3 py-1.5 font-semibold text-brand-700 outline-none focus:ring-2 focus:ring-brand-500"
          >
            {[year-2, year-1, year, year+1, year+2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <YearlyTable data={data} loading={loading} onReload={() => loadData(year)} />
    </div>
  );
}
