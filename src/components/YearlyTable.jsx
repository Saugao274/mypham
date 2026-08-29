'use client';
import { useState } from 'react';

const fmt = n => (n || n === 0) ? Number(n).toLocaleString('vi-VN') : '';

export default function YearlyTable({ data, loading, onReload }) {
  const [expandedRow, setExpandedRow] = useState(null);

  if (loading) {
    return <div className="bg-white rounded-xl border p-8 text-center text-slate-500">Đang tải dữ liệu...</div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <p className="text-slate-500">Chưa có tháng nào trong năm này.</p>
        <p className="text-sm text-slate-400 mt-1">Vào mục Tháng / Nhập / Xuất để tạo tháng mới.</p>
      </div>
    );
  }

  const totals = data.reduce((acc, row) => ({
    tongBan: acc.tongBan + (row.tongBan || 0),
    tongChi: acc.tongChi + (row.tongChi || 0),
    chenhLech: acc.chenhLech + (row.chenhLech || 0),
    tongMua: acc.tongMua + (row.tongMua || 0),
  }), { tongBan: 0, tongChi: 0, chenhLech: 0, tongMua: 0 });

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <th className="p-3 font-semibold">Tháng</th>
              <th className="p-3 font-semibold text-right text-blue-700">Tổng bán (Thu)</th>
              <th className="p-3 font-semibold text-right text-red-600">Tổng chi (SP)</th>
              <th className="p-3 font-semibold text-right text-emerald-700">Chênh lệch</th>
              <th className="p-3 font-semibold text-right text-slate-500">Vốn tồn kho</th>
              <th className="p-3 font-semibold text-right text-amber-600">Tổng mua SP</th>
              <th className="p-3 font-semibold text-center w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map(row => (
              <Row 
                key={row._id} 
                row={row} 
                isExpanded={expandedRow === row._id} 
                onToggle={() => setExpandedRow(expandedRow === row._id ? null : row._id)} 
                onReload={onReload}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-brand-50 border-t-2 border-brand-100 font-bold text-brand-900">
              <td className="p-3">TỔNG NĂM</td>
              <td className="p-3 text-right text-blue-700">{fmt(totals.tongBan)}</td>
              <td className="p-3 text-right text-red-600">{fmt(totals.tongChi)}</td>
              <td className="p-3 text-right text-emerald-700">{fmt(totals.chenhLech)}</td>
              <td className="p-3 text-right text-slate-500">-</td>
              <td className="p-3 text-right text-amber-600">{fmt(totals.tongMua)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function Row({ row, isExpanded, onToggle, onReload }) {
  const [adding, setAdding] = useState(false);
  const [newPurchase, setNewPurchase] = useState({ supplier: '', date: '', amount: 0 });
  const [saving, setSaving] = useState(false);

  async function handleSavePurchase(purchasesToSave) {
    setSaving(true);
    try {
      const res = await fetch(`/api/months/${row._id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ purchases: purchasesToSave }),
      });
      if (res.ok) {
        setAdding(false);
        setNewPurchase({ supplier: '', date: '', amount: 0 });
        onReload();
      } else {
        alert('Lỗi lưu nhập hàng');
      }
    } finally {
      setSaving(false);
    }
  }

  function addPurchase() {
    if (!newPurchase.supplier.trim() || newPurchase.amount <= 0) {
      alert('Vui lòng nhập tên chỗ nhập hàng và số tiền > 0');
      return;
    }
    const updated = [...(row.purchases || []), newPurchase];
    handleSavePurchase(updated);
  }

  function deletePurchase(idx) {
    if (!confirm('Bạn có chắc muốn xóa đợt nhập hàng này?')) return;
    const updated = [...(row.purchases || [])];
    updated.splice(idx, 1);
    handleSavePurchase(updated);
  }

  return (
    <>
      <tr className={`hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`} onClick={onToggle}>
        <td className="p-3 font-semibold text-slate-700">{row.label}</td>
        <td className="p-3 text-right font-medium text-blue-700">{fmt(row.tongBan)}</td>
        <td className="p-3 text-right font-medium text-red-600">{fmt(row.tongChi)}</td>
        <td className="p-3 text-right font-bold text-emerald-700">{fmt(row.chenhLech)}</td>
        <td className="p-3 text-right text-slate-500 font-medium">{fmt(row.vonCon)}</td>
        <td className="p-3 text-right font-bold text-amber-600">{fmt(row.tongMua)}</td>
        <td className="p-3 text-center text-slate-400">
          <svg className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </td>
      </tr>
      
      {isExpanded && (
        <tr className="bg-slate-50/50">
          <td colSpan="7" className="p-0">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  📦 Chi tiết nhập hàng ({row.label})
                </h4>
                {!adding && (
                  <button onClick={() => setAdding(true)} className="text-xs bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-100 font-medium">
                    + Thêm đợt nhập
                  </button>
                )}
              </div>

              {row.purchases && row.purchases.length > 0 ? (
                <table className="w-full text-xs text-left border border-slate-200 rounded-md bg-white">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-2 w-1/3">Chỗ nhập hàng</th>
                      <th className="p-2 w-1/4">Ngày nhập</th>
                      <th className="p-2 text-right w-1/4">Số tiền</th>
                      <th className="p-2 w-12 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {row.purchases.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-medium">{p.supplier}</td>
                        <td className="p-2 text-slate-500">{p.date || '-'}</td>
                        <td className="p-2 text-right font-semibold text-amber-600">{fmt(p.amount)}</td>
                        <td className="p-2 text-center">
                          <button onClick={() => deletePurchase(idx)} disabled={saving} className="text-slate-400 hover:text-red-500 p-1">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-xs text-slate-500 italic mb-2">Chưa có đợt nhập hàng nào trong tháng này.</div>
              )}

              {adding && (
                <div className="mt-3 bg-white p-3 border border-brand-200 rounded-md shadow-sm">
                  <div className="flex flex-wrap md:flex-nowrap gap-2 items-end">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Chỗ nhập hàng</label>
                      <input type="text" value={newPurchase.supplier} onChange={e => setNewPurchase({...newPurchase, supplier: e.target.value})} placeholder="VD: Công ty A" className="w-full text-sm border rounded px-2 py-1.5 outline-none focus:border-brand-500" />
                    </div>
                    <div className="w-[120px]">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Ngày (tùy chọn)</label>
                      <input type="text" value={newPurchase.date} onChange={e => setNewPurchase({...newPurchase, date: e.target.value})} placeholder="DD/MM" className="w-full text-sm border rounded px-2 py-1.5 outline-none focus:border-brand-500" />
                    </div>
                    <div className="w-[140px]">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Số tiền nhập</label>
                      <input 
                        type="text" 
                        value={newPurchase.amount ? newPurchase.amount.toLocaleString('vi-VN') : ''} 
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          setNewPurchase({...newPurchase, amount: raw ? parseInt(raw, 10) : 0});
                        }} 
                        placeholder="0" 
                        className="w-full text-sm border rounded px-2 py-1.5 outline-none focus:border-brand-500 text-right font-medium" 
                      />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={addPurchase} disabled={saving} className="bg-brand-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-brand-700">Lưu</button>
                      <button onClick={() => setAdding(false)} disabled={saving} className="bg-slate-100 text-slate-600 border px-3 py-1.5 rounded text-sm font-medium hover:bg-slate-200">Hủy</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
