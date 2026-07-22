'use client';
import { useEffect, useState } from 'react';
import { useCurrentMonth } from '@/lib/useCurrentMonth';

const fmt = n => (n || n === 0) ? Number(n).toLocaleString('vi-VN') : '';

export default function DashboardPage() {
  const { monthId, months, reload } = useCurrentMonth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { reload(); }, []);
  useEffect(() => {
    if (!monthId) { setData(null); return; }
    setLoading(true);
    fetch(`/api/summary/${monthId}`).then(r => r.json())
      .then(setData).finally(() => setLoading(false));
  }, [monthId]);

  if (!months.length) {
    return <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
      <div className="text-lg font-semibold mb-1">Chưa có dữ liệu</div>
      <p className="text-sm text-slate-500">
        Hãy vào <a href="/dashboard/manage" className="text-brand-600 hover:underline">Tháng / Import / Export</a> để tạo tháng đầu tiên hoặc import từ file Excel/Google Sheet.
      </p>
    </div>;
  }

  const currentLabel = months.find(m => m._id === monthId)?.label || '';

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-bold text-slate-800">Tổng hợp — {currentLabel}</h1>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
          <Stat label="Tổng vốn"       value={data.total.tongVon} />
          <Stat label="Vốn còn"        value={data.total.vonCon} color="slate" />
          <Stat label="Tổng tiền bán"  value={data.total.tongBan} color="blue" />
          <Stat label="Tổng lãi"       value={data.total.tongLai} color="green" />
          <Stat label="Tổng chi"       value={data.total.tongChi} color="red" />
          <Stat label="Tổng nợ"        value={data.total.tongNo}  color="amber" />
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-3 border-b border-slate-100">
          <h2 className="font-semibold text-brand-700">Chi tiết theo danh mục</h2>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>TT</th>
                <th className="min-w-[220px]">Sản phẩm</th>
                <th className="text-right">Tổng vốn</th>
                <th className="text-right">Tổng tiền bán</th>
                <th className="text-right">Tổng lãi</th>
                <th className="text-right">Tổng chi</th>
                <th className="text-right">Vốn còn</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="7" className="text-center py-6 text-slate-400">Đang tải…</td></tr>}
              {!loading && data?.rows.map(r => (
                <tr key={r.key}>
                  <td>{r.tt}</td>
                  <td>{r.name}</td>
                  <td className="text-right">{fmt(r.tongVon)}</td>
                  <td className="text-right">{fmt(r.tongBan)}</td>
                  <td className={`text-right font-medium ${r.tongLai >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(r.tongLai)}</td>
                  <td className="text-right text-red-700">{fmt(r.tongChi)}</td>
                  <td className="text-right">{fmt(r.vonCon)}</td>
                </tr>
              ))}
            </tbody>
            {data && (
              <tfoot>
                <tr className="font-semibold bg-brand-50/50">
                  <td>#</td>
                  <td>Tổng</td>
                  <td className="text-right">{fmt(data.total.tongVon)}</td>
                  <td className="text-right">{fmt(data.total.tongBan)}</td>
                  <td className="text-right text-green-700">{fmt(data.total.tongLai)}</td>
                  <td className="text-right text-red-700">{fmt(data.total.tongChi)}</td>
                  <td className="text-right">{fmt(data.total.vonCon)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color = 'brand' }) {
  const colorMap = {
    brand: 'text-brand-700 bg-brand-50 border-brand-100',
    slate: 'text-slate-700 bg-slate-50 border-slate-200',
    blue:  'text-blue-700 bg-blue-50 border-blue-100',
    green: 'text-green-700 bg-green-50 border-green-100',
    red:   'text-red-700 bg-red-50 border-red-100',
    amber: 'text-amber-700 bg-amber-50 border-amber-100',
  }[color];
  return (
    <div className={`rounded-xl border p-3 ${colorMap}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-lg md:text-xl font-bold mt-0.5">{fmt(value)}</div>
    </div>
  );
}
