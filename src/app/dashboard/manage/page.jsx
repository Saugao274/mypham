'use client';
import { useEffect, useState } from 'react';
import { useCurrentMonth } from '@/lib/useCurrentMonth';

export default function ManagePage() {
  const { monthId, months, setMonthId, reload } = useCurrentMonth();

  useEffect(() => { reload(); }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <MonthManager months={months} onChange={reload} onSelect={setMonthId} activeId={monthId} />
      <ImportPanel months={months} activeId={monthId} onImported={reload} />
      <ExportPanel months={months} activeId={monthId} />
      <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
        <h3 className="font-semibold text-brand-700 mb-2">💡 Mẹo dùng</h3>
        <ul className="space-y-1.5 list-disc pl-5">
          <li>Tạo tháng mới rồi bấm <b>"Carry-over"</b> để chép tồn kho từ tháng trước sang.</li>
          <li>Có thể import từ file Excel máy tính, hoặc dán link Google Sheet đã chia sẻ công khai.</li>
          <li>Chọn <b>"Xoá và ghi đè"</b> khi import nếu muốn thay thế dữ liệu tháng đó.</li>
          <li>Xuất Excel giữ đúng cấu trúc sheet như file gốc — mở lại được bằng Excel/Google Sheets.</li>
        </ul>
      </div>
    </div>
  );
}

function MonthManager({ months, onChange, onSelect, activeId }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [carryFromId, setCarryFromId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!carryFromId && months.length) setCarryFromId(months[0]._id);
  }, [months, carryFromId]);

  async function createMonth() {
    setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/months', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ year: Number(year), month: Number(month), carryFromId: carryFromId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi');
      setMsg(`Đã tạo ${data.label}`);
      onSelect(data._id);
      onChange();
    } catch (e) { setMsg('❌ ' + e.message); }
    finally { setBusy(false); }
  }

  async function delMonth(id, label) {
    if (!confirm(`Xoá ${label}? Toàn bộ sản phẩm và nợ của tháng này sẽ bị xoá vĩnh viễn.`)) return;
    await fetch(`/api/months/${id}`, { method: 'DELETE' });
    onChange();
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h3 className="font-semibold text-brand-700 mb-3">Quản lý tháng</h3>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <label className="text-sm">
          <span className="block text-xs text-slate-500 mb-1">Tháng</span>
          <select value={month} onChange={e => setMonth(e.target.value)} className="w-full border rounded-md px-2 py-1.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-slate-500 mb-1">Năm</span>
          <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full border rounded-md px-2 py-1.5" />
        </label>
      </div>
      <label className="text-sm block mb-3">
        <span className="block text-xs text-slate-500 mb-1">Carry-over tồn kho từ tháng (tuỳ chọn)</span>
        <select value={carryFromId} onChange={e => setCarryFromId(e.target.value)} className="w-full border rounded-md px-2 py-1.5">
          <option value="">— Không carry-over (tháng trống) —</option>
          {months.map(m => <option key={m._id} value={m._id}>{m.label}</option>)}
        </select>
      </label>

      <button className="btn w-full justify-center" onClick={createMonth} disabled={busy}>
        {busy ? 'Đang tạo…' : 'Tạo tháng'}
      </button>
      {msg && <div className="mt-2 text-sm text-slate-600">{msg}</div>}

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="text-xs text-slate-500 mb-2">Các tháng hiện có:</div>
        <ul className="space-y-1 max-h-64 overflow-auto">
          {months.map(m => (
            <li key={m._id} className={`flex items-center justify-between px-2 py-1.5 rounded-md ${m._id === activeId ? 'bg-brand-50' : ''}`}>
              <button className={`text-sm text-left flex-1 ${m._id === activeId ? 'font-semibold text-brand-700' : ''}`} onClick={() => onSelect(m._id)}>
                {m.label}
              </button>
              <button className="text-slate-400 hover:text-red-600 px-2" onClick={() => delMonth(m._id, m.label)}>✕</button>
            </li>
          ))}
          {!months.length && <li className="text-sm text-slate-400 italic px-2">Chưa có tháng nào</li>}
        </ul>
      </div>
    </div>
  );
}

function ImportPanel({ months, activeId, onImported }) {
  const [tab, setTab] = useState('file');
  const [targetMonthId, setTargetMonthId] = useState('');
  const [replace, setReplace] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // Tuỳ chọn tạo tháng mới lúc import
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [createNew, setCreateNew] = useState(false);

  useEffect(() => { if (activeId) setTargetMonthId(activeId); }, [activeId]);

  const [file, setFile] = useState(null);
  const [gUrl, setGUrl] = useState('');

  async function doImport() {
    setBusy(true); setMsg('');
    try {
      if (tab === 'file') {
        if (!file) throw new Error('Chọn file .xlsx trước đã');
        const fd = new FormData();
        fd.append('file', file);
        if (createNew) { fd.append('year', newYear); fd.append('month', newMonth); }
        else { if (!targetMonthId) throw new Error('Chọn tháng đích'); fd.append('monthId', targetMonthId); }
        const res = await fetch(`/api/import/file?replace=${replace ? 1 : 0}`, { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi import');
        setMsg(`✓ Đã import ${data.imported.products} sản phẩm, ${data.imported.debts} khoản nợ`);
      } else {
        if (!gUrl.trim()) throw new Error('Dán link Google Sheet vào');
        const body = { url: gUrl, replace };
        if (createNew) { body.year = Number(newYear); body.month = Number(newMonth); }
        else { if (!targetMonthId) throw new Error('Chọn tháng đích'); body.monthId = targetMonthId; }
        const res = await fetch('/api/import/gdrive', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi import');
        setMsg(`✓ Đã import ${data.imported.products} sản phẩm, ${data.imported.debts} khoản nợ`);
      }
      onImported();
    } catch (e) { setMsg('❌ ' + e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h3 className="font-semibold text-brand-700 mb-3">Import dữ liệu</h3>

      <div className="flex gap-1 mb-3">
        <button className={`flex-1 py-1.5 rounded-md text-sm font-medium ${tab === 'file' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setTab('file')}>Từ máy tính</button>
        <button className={`flex-1 py-1.5 rounded-md text-sm font-medium ${tab === 'gdrive' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setTab('gdrive')}>Google Sheet</button>
      </div>

      {tab === 'file' ? (
        <label className="block mb-3">
          <span className="block text-xs text-slate-500 mb-1">Chọn file .xlsx</span>
          <input type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-brand-600 file:text-white file:cursor-pointer" />
        </label>
      ) : (
        <label className="block mb-3">
          <span className="block text-xs text-slate-500 mb-1">Link Google Sheet (đã bật "Bất kỳ ai có link đều xem được")</span>
          <input value={gUrl} onChange={e => setGUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm" />
        </label>
      )}

      <div className="mb-3 p-3 bg-slate-50 rounded-md border border-slate-100 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={!createNew} onChange={() => setCreateNew(false)} />
          <span>Import vào tháng đang chọn:</span>
          <select value={targetMonthId} onChange={e => setTargetMonthId(e.target.value)}
            className="text-sm border rounded-md px-2 py-1 flex-1" disabled={createNew}>
            <option value="">— Chọn —</option>
            {months.map(m => <option key={m._id} value={m._id}>{m.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={createNew} onChange={() => setCreateNew(true)} />
          <span>Tạo tháng mới:</span>
          <select value={newMonth} onChange={e => setNewMonth(e.target.value)}
            className="text-sm border rounded-md px-1 py-1" disabled={!createNew}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>T{m}</option>)}
          </select>
          <input type="number" value={newYear} onChange={e => setNewYear(e.target.value)} disabled={!createNew}
            className="text-sm border rounded-md px-2 py-1 w-24" />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm mb-3">
        <input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} />
        Xoá dữ liệu cũ của tháng đó rồi ghi đè
      </label>

      <button className="btn w-full justify-center" onClick={doImport} disabled={busy}>
        {busy ? 'Đang import…' : 'Bắt đầu import'}
      </button>
      {msg && <div className="mt-2 text-sm">{msg}</div>}
    </div>
  );
}

function ExportPanel({ months, activeId }) {
  const [id, setId] = useState('');
  useEffect(() => { if (activeId) setId(activeId); }, [activeId]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h3 className="font-semibold text-brand-700 mb-3">Xuất Excel</h3>
      <label className="block mb-3">
        <span className="block text-xs text-slate-500 mb-1">Tháng cần xuất</span>
        <select value={id} onChange={e => setId(e.target.value)} className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm">
          <option value="">— Chọn —</option>
          {months.map(m => <option key={m._id} value={m._id}>{m.label}</option>)}
        </select>
      </label>
      <a href={id ? `/api/export/${id}` : '#'} onClick={e => { if (!id) e.preventDefault(); }}
        className={`btn w-full justify-center ${!id ? 'opacity-50 pointer-events-none' : ''}`}>
        ⬇ Tải file .xlsx
      </a>
      <p className="text-xs text-slate-500 mt-2">
        File xuất có đầy đủ các sheet: mỗi danh mục + sheet Nợ + sheet Tổng hợp — giống file gốc.
      </p>
    </div>
  );
}
