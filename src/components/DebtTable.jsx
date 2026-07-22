'use client';
import { useState, useRef, useEffect } from 'react';

const round2 = n => Math.round(n * 100) / 100;
const fmt = n => (n || n === 0) ? Number(n).toLocaleString('vi-VN') : '';

export default function DebtTable({ monthId, debts, loading, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState(empty());

  function empty() { return { khach: '', soTien: 0, daThanhToan: 0, noTu: '', dienGiai: '' }; }

  async function saveNew() {
    if (!newRow.khach.trim()) return;
    const res = await fetch('/api/debts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...newRow, monthId }),
    });
    if (res.ok) { setNewRow(empty()); setAdding(false); onChanged(); }
  }

  const totalSoTien = debts.reduce((s, d) => s + (d.soTien || 0), 0);
  const totalDaTT = debts.reduce((s, d) => s + (d.daThanhToan || 0), 0);
  const totalConNo = round2(totalSoTien - totalDaTT);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-semibold text-brand-700">Sổ nợ</h2>
          <p className="text-xs text-slate-500">
            {debts.length} khoản · Còn nợ: <span className="font-semibold text-red-600">{fmt(totalConNo)}</span>
          </p>
        </div>
        <button className="btn" onClick={() => setAdding(v => !v)}>
          {adding ? 'Đóng' : '+ Thêm khoản nợ'}
        </button>
      </div>

      <div className="scroll-x">
        <table className="tbl">
          <thead>
            <tr>
              <th>TT</th>
              <th className="min-w-[160px]">Khách</th>
              <th className="text-right">Số tiền</th>
              <th className="text-right">Đã thanh toán</th>
              <th className="text-right bg-slate-50">Còn nợ</th>
              <th>Nợ từ</th>
              <th className="min-w-[200px]">Diễn giải</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {adding && (
              <tr className="bg-amber-50/40">
                <td>➕</td>
                <td><input autoFocus className="cell-input" value={newRow.khach} onChange={e => setNewRow({ ...newRow, khach: e.target.value })} placeholder="Tên khách" /></td>
                <td><input type="number" className="cell-input cell-input-num" value={newRow.soTien} onChange={e => setNewRow({ ...newRow, soTien: Number(e.target.value || 0) })} /></td>
                <td><input type="number" className="cell-input cell-input-num" value={newRow.daThanhToan} onChange={e => setNewRow({ ...newRow, daThanhToan: Number(e.target.value || 0) })} /></td>
                <td className="text-right bg-slate-50 text-slate-500">{fmt(round2((newRow.soTien || 0) - (newRow.daThanhToan || 0)))}</td>
                <td><input className="cell-input" value={newRow.noTu} onChange={e => setNewRow({ ...newRow, noTu: e.target.value })} placeholder="mm/yy" /></td>
                <td><input className="cell-input" value={newRow.dienGiai} onChange={e => setNewRow({ ...newRow, dienGiai: e.target.value })} /></td>
                <td>
                  <div className="flex gap-1">
                    <button className="text-green-600 hover:text-green-800 font-bold" onClick={saveNew}>✓</button>
                    <button className="text-slate-500 hover:text-red-600" onClick={() => { setAdding(false); setNewRow(empty()); }}>✕</button>
                  </div>
                </td>
              </tr>
            )}
            {debts.map((d, i) => <DebtRow key={d._id} debt={d} index={i + 1} onChanged={onChanged} />)}
            {!debts.length && !adding && (
              <tr><td colSpan="8" className="text-center text-slate-400 py-6">
                {loading ? 'Đang tải…' : 'Chưa có khoản nợ nào'}
              </td></tr>
            )}
          </tbody>
          {debts.length > 0 && (
            <tfoot>
              <tr className="font-semibold bg-brand-50/50">
                <td colSpan="2" className="text-right pr-2">Tổng:</td>
                <td className="text-right">{fmt(totalSoTien)}</td>
                <td className="text-right">{fmt(totalDaTT)}</td>
                <td className="text-right text-red-700">{fmt(totalConNo)}</td>
                <td colSpan="3"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function DebtRow({ debt, index, onChanged }) {
  const [local, setLocal] = useState(debt);
  useEffect(() => { setLocal(debt); }, [debt._id, debt.updatedAt]);
  const t = useRef(null);
  const conNo = round2((local.soTien || 0) - (local.daThanhToan || 0));

  function upd(k, v) {
    const next = { ...local, [k]: v };
    setLocal(next);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => save(next), 500);
  }

  async function save(next) {
    const payload = {
      khach: next.khach, soTien: next.soTien, daThanhToan: next.daThanhToan,
      noTu: next.noTu, dienGiai: next.dienGiai,
    };
    await fetch(`/api/debts/${debt._id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    onChanged();
  }
  async function del() {
    if (!confirm(`Xoá khoản nợ của ${local.khach}?`)) return;
    await fetch(`/api/debts/${debt._id}`, { method: 'DELETE' });
    onChanged();
  }

  return (
    <tr>
      <td className="text-slate-400 text-center">{index}</td>
      <td><input className="cell-input" value={local.khach} onChange={e => upd('khach', e.target.value)} /></td>
      <td><input type="number" className="cell-input cell-input-num" value={local.soTien ?? 0} onChange={e => upd('soTien', Number(e.target.value || 0))} /></td>
      <td><input type="number" className="cell-input cell-input-num" value={local.daThanhToan ?? 0} onChange={e => upd('daThanhToan', Number(e.target.value || 0))} /></td>
      <td className={`text-right bg-slate-50 font-medium ${conNo > 0 ? 'text-red-600' : 'text-green-700'}`}>{fmt(conNo)}</td>
      <td><input className="cell-input" value={local.noTu || ''} onChange={e => upd('noTu', e.target.value)} /></td>
      <td><input className="cell-input" value={local.dienGiai || ''} onChange={e => upd('dienGiai', e.target.value)} /></td>
      <td><button className="text-slate-400 hover:text-red-600" onClick={del}>✕</button></td>
    </tr>
  );
}
