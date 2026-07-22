'use client';
import { useState, useRef, useEffect, useMemo } from 'react';

const round2 = n => Math.round(n * 100) / 100;
const fmt = n => (n || n === 0) ? Number(n).toLocaleString('vi-VN') : '';

function computeDerived(p) {
  const tongVon = round2((p.sl || 0) * (p.giaMua || 0));
  const vonCon = round2((p.slCon || 0) * (p.giaMua || 0));
  const tongBan = round2((p.slBan || 0) * (p.giaBan || 0));
  const tongChi = round2((p.slChi || 0) * (p.giaMua || 0));
  const tongLai = round2(tongBan - (p.slBan || 0) * (p.giaMua || 0) - (p.giamCuoc || 0));
  return { tongVon, vonCon, tongBan, tongLai, tongChi };
}

function getMonthsRemaining(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  let month, year;
  
  // 1. Try DD/MM/YYYY or DD/MM/YY
  let m = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    month = parseInt(m[2], 10);
    year = parseInt(m[3], 10);
  } else {
    // 2. Try MM/YYYY or MM/YY
    m = str.match(/(\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
      month = parseInt(m[1], 10);
      year = parseInt(m[2], 10);
      if (month > 12) return null; // Invalid month, probably Day/Month without Year
    } else {
      return null;
    }
  }

  if (year < 100) year += 2000;
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();
  return (year - curYear) * 12 + (month - curMonth);
}

export default function ProductTable({ monthId, category, items, loading, onChanged, onRowChange }) {
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState(makeEmpty());

  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' });
  const [filters, setFilters] = useState({});
  const [showCalculated, setShowCalculated] = useState(false);

  function makeEmpty() {
    return {
      ten: '', loaiHang: '', sl: 0, giaMua: 0, giaBan: 0, slCon: 0,
      slBan: 0, slChi: 0, giamCuoc: 0, date: '', baoDongMonths: 6, dienGiai: '', nhap: '',
    };
  }

  async function saveNew() {
    if (!newRow.ten.trim()) return;
    const body = { ...newRow, monthId, categoryKey: category.key };
    if (!body.slCon) body.slCon = body.sl;
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setNewRow(makeEmpty());
      setAdding(false);
      onChanged();
    } else {
      alert('Lỗi khi thêm sản phẩm');
    }
  }

  const processedItems = useMemo(() => {
    let arr = items.map((item, i) => ({ ...item, _originalIndex: i + 1 }));
    // filter
    for (const k in filters) {
      if (filters[k] !== '') {
        const query = String(filters[k]).toLowerCase();
        arr = arr.filter(p => {
          if (k === 'index') return String(p._originalIndex).includes(query);
          const val = String(p[k] || '').toLowerCase();
          return val.includes(query);
        });
      }
    }
    // sort
    if (sortConfig.key) {
      arr.sort((a, b) => {
        let va = sortConfig.key === 'index' ? a._originalIndex : a[sortConfig.key];
        let vb = sortConfig.key === 'index' ? b._originalIndex : b[sortConfig.key];
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return sortConfig.dir === 'asc' ? -1 : 1;
        if (va > vb) return sortConfig.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return arr;
  }, [items, filters, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilter = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  };

  const totals = processedItems.reduce((acc, p) => {
    const c = computeDerived(p);
    acc.tongVon += c.tongVon; acc.vonCon += c.vonCon;
    acc.tongBan += c.tongBan; acc.tongLai += c.tongLai; acc.tongChi += c.tongChi;
    return acc;
  }, { tongVon: 0, vonCon: 0, tongBan: 0, tongLai: 0, tongChi: 0 });

  const showLoai = category.hasLoaiHang;

  const Th = ({ k, label, className = '' }) => (
    <th className={`cursor-pointer hover:bg-slate-100 select-none ${className}`} onClick={() => handleSort(k)}>
      <div className="flex items-center justify-between gap-1">
        <span>{label}</span>
        {sortConfig.key === k && (
          <span className="text-[10px] text-brand-600">{sortConfig.dir === 'asc' ? '▲' : '▼'}</span>
        )}
      </div>
    </th>
  );

  const FilterInput = ({ k, placeholder = 'Lọc...' }) => (
    <input
      className="w-full text-xs border border-slate-300 rounded px-1 py-0.5 font-normal"
      placeholder={placeholder}
      value={filters[k] || ''}
      onChange={e => handleFilter(k, e.target.value)}
    />
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-semibold text-brand-700">{category.name}</h2>
          <p className="text-xs text-slate-500">{items.length} sản phẩm · Bấm vào tiêu đề cột để sắp xếp</p>
        </div>
        <div className="flex gap-2"><button className="btn-ghost text-xs py-1 px-2" onClick={() => setShowCalculated(v => !v)}>{showCalculated ? "Ẩn cột tính toán" : "Hiện cột tính toán"}</button>
        <button className="btn" onClick={() => setAdding(v => !v)}>
          {adding ? 'Đóng' : '+ Thêm sản phẩm'}
        </button></div></div>

      <div className="scroll-x">
        <table className="tbl text-sm">
          <thead>
            <tr>
              <Th k="index" label="TT" className="w-12 text-center" />
              <Th k="ten" label="Tên SP" className="min-w-[180px]" />
              {showLoai && <Th k="loaiHang" label="Loại hàng" />}
              <Th k="sl" label="SL" className="text-right" />
              <Th k="giaMua" label="Giá mua" className="text-right" />
              {showCalculated && <th className="text-right bg-slate-50">Tổng vốn</th>}
              <Th k="slCon" label="SL còn" className="text-right" />
              {showCalculated && <th className="text-right bg-slate-50">Vốn còn</th>}
              <Th k="giaBan" label="Giá bán" className="text-right" />
              <Th k="slBan" label="SL bán" className="text-right" />
              {showCalculated && <th className="text-right bg-slate-50">Tổng bán</th>}
              {showCalculated && <th className="text-right bg-slate-50">Tổng lãi</th>}
              <Th k="slChi" label="SL chi" className="text-right" />
              {showCalculated && <th className="text-right bg-slate-50">Tổng chi</th>}
              <Th k="date" label="Date" className="min-w-[80px]" />
              <Th k="baoDongMonths" label="Báo động" className="text-center w-20 text-[11px] leading-tight" />
              <Th k="dienGiai" label="Diễn giải" className="min-w-[160px]" />
              <Th k="giamCuoc" label="Giảm/cước" className="text-right" />
              <Th k="nhap" label="Nhập" />
              <th></th>
            </tr>
            <tr className="bg-slate-50/50">
              <td className="px-1 py-1"><FilterInput k="index" /></td>
              <td className="px-1 py-1"><FilterInput k="ten" /></td>
              {showLoai && <td className="px-1 py-1"><FilterInput k="loaiHang" /></td>}
              <td className="px-1 py-1"><FilterInput k="sl" /></td>
              <td className="px-1 py-1"><FilterInput k="giaMua" /></td>
              {showCalculated && <td className="bg-slate-50"></td>}
              <td className="px-1 py-1"><FilterInput k="slCon" /></td>
              {showCalculated && <td className="bg-slate-50"></td>}
              <td className="px-1 py-1"><FilterInput k="giaBan" /></td>
              <td className="px-1 py-1"><FilterInput k="slBan" /></td>
              {showCalculated && <td className="bg-slate-50"></td>}
              {showCalculated && <td className="bg-slate-50"></td>}
              <td className="px-1 py-1"><FilterInput k="slChi" /></td>
              {showCalculated && <td className="bg-slate-50"></td>}
              <td className="px-1 py-1"><FilterInput k="date" /></td>
              <td></td>
              <td className="px-1 py-1"><FilterInput k="dienGiai" /></td>
              <td className="px-1 py-1"><FilterInput k="giamCuoc" /></td>
              <td className="px-1 py-1"><FilterInput k="nhap" /></td>
              <td></td>
            </tr>
          </thead>
          <tbody>
            {adding && (
              <NewRow row={newRow} setRow={setNewRow} showLoai={showLoai} showCalculated={showCalculated} onSave={saveNew} onCancel={() => { setAdding(false); setNewRow(makeEmpty()); }} />
            )}
            {processedItems.map((p) => (
              <EditableRow key={p._id} index={p._originalIndex} product={p} showLoai={showLoai} showCalculated={showCalculated} onChanged={onChanged} onRowChange={onRowChange} />
            ))}
            {!processedItems.length && !adding && (
              <tr><td colSpan={showLoai ? (showCalculated ? 20 : 15) : (showCalculated ? 19 : 14)} className="text-center text-slate-400 py-6">
                {loading ? 'Đang tải…' : 'Không có dữ liệu'}
              </td></tr>
            )}
          </tbody>
          {processedItems.length > 0 && (
            <tfoot>
              <tr className="font-semibold bg-brand-50/50">
                <td colSpan={showLoai ? 5 : 4} className="text-right pr-2">Tổng:</td>
                {showCalculated && <td className="text-right">{fmt(totals.tongVon)}</td>}
                <td></td>
                {showCalculated && <td className="text-right">{fmt(totals.vonCon)}</td>}
                <td></td>
                <td></td>
                {showCalculated && <td className="text-right">{fmt(totals.tongBan)}</td>}
                {showCalculated && <td className="text-right text-green-700">{fmt(totals.tongLai)}</td>}
                <td></td>
                {showCalculated && <td className="text-right text-red-700">{fmt(totals.tongChi)}</td>}
                <td colSpan={6}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function NewRow({ row, setRow, showLoai, showCalculated, onSave, onCancel }) {
  const upd = (k, v) => setRow(r => {
    let next = { ...r, [k]: v };
    if (k === 'sl' || k === 'slBan' || k === 'slChi') {
      if (k === 'slBan' && next.slBan > next.sl) next.slBan = next.sl;
      if (k === 'slChi' && next.slChi > next.sl) next.slChi = next.sl;
      let sl = Number(next.sl) || 0;
      let slBan = Number(next.slBan) || 0;
      let slChi = Number(next.slChi) || 0;
      let con = sl - slBan - slChi;
      next.slCon = con >= 0 ? con : 0;
    }
    return next;
  });
  return (
    <tr className="bg-amber-50/40">
      <td className="text-center">➕</td>
      <td><input autoFocus className="cell-input" value={row.ten} onChange={e => upd('ten', e.target.value)} placeholder="Tên sản phẩm" /></td>
      {showLoai && <td><input className="cell-input" value={row.loaiHang} onChange={e => upd('loaiHang', e.target.value)} /></td>}
      <NumInput value={row.sl} onChange={v => upd('sl', v)} />
      <NumInput value={row.giaMua} onChange={v => upd('giaMua', v)} />
      {showCalculated && <td className="text-right text-slate-400 bg-slate-50">{fmt(round2((row.sl || 0) * (row.giaMua || 0)))}</td>}
      <NumInput value={row.slCon} onChange={v => upd('slCon', v)} placeholder={String(row.sl || 0)} />
      {showCalculated && <td className="text-right text-slate-400 bg-slate-50">{fmt(round2((row.slCon || 0) * (row.giaMua || 0)))}</td>}
      <NumInput value={row.giaBan} onChange={v => upd('giaBan', v)} />
      <NumInput value={row.slBan} onChange={v => upd('slBan', v)} />
      {showCalculated && <td className="text-right text-slate-400 bg-slate-50">{fmt(round2((row.slBan || 0) * (row.giaBan || 0)))}</td>}
      {showCalculated && <td className="text-right text-slate-400 bg-slate-50"></td>}
      <NumInput value={row.slChi} onChange={v => upd('slChi', v)} />
      {showCalculated && <td className="text-right text-slate-400 bg-slate-50">{fmt(round2((row.slChi || 0) * (row.giaMua || 0)))}</td>}
      <td><input className="cell-input text-center" value={row.date} onChange={e => upd('date', e.target.value)} placeholder="mm/yy" /></td>
      <NumInput value={row.baoDongMonths} onChange={v => upd('baoDongMonths', v)} />
      <td><input className="cell-input" value={row.dienGiai} onChange={e => upd('dienGiai', e.target.value)} /></td>
      <NumInput value={row.giamCuoc} onChange={v => upd('giamCuoc', v)} />
      <td><input className="cell-input" value={row.nhap} onChange={e => upd('nhap', e.target.value)} /></td>
      <td>
        <div className="flex gap-1 justify-center">
          <button className="text-green-600 hover:text-green-800 font-bold px-1" onClick={onSave} title="Lưu">✓</button>
          <button className="text-slate-500 hover:text-red-600 px-1" onClick={onCancel} title="Huỷ">✕</button>
        </div>
      </td>
    </tr>
  );
}

function EditableRow({ index, product, showLoai, showCalculated, onChanged, onRowChange }) {
  const [local, setLocal] = useState(product);
  useEffect(() => { setLocal(product); }, [product._id, product.updatedAt]);
  const savingRef = useRef(null);
  const derived = computeDerived(local);

  function upd(k, v) {
    setLocal(prev => {
      const next = { ...prev, [k]: v };
      if (k === 'sl' || k === 'slBan' || k === 'slChi') {
        if (k === 'slBan' && next.slBan > next.sl) next.slBan = next.sl;
        if (k === 'slChi' && next.slChi > next.sl) next.slChi = next.sl;
        let sl = Number(next.sl) || 0;
        let slBan = Number(next.slBan) || 0;
        let slChi = Number(next.slChi) || 0;
        let con = sl - slBan - slChi;
        next.slCon = con >= 0 ? con : 0;
      }
      
      if (onRowChange) onRowChange(product._id, next);
      
      if (savingRef.current) clearTimeout(savingRef.current);
      savingRef.current = setTimeout(() => save(next), 500);
      return next;
    });
  }

  async function save(next) {
    const fields = ['ten','loaiHang','sl','giaMua','giaBan','slCon','slBan','slChi','giamCuoc','date','baoDongMonths','dienGiai','nhap'];
    const payload = {};
    for (const f of fields) payload[f] = next[f];
    await fetch(`/api/products/${product._id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async function del() {
    if (!confirm(`Xoá "${local.ten}"?`)) return;
    await fetch(`/api/products/${product._id}`, { method: 'DELETE' });
    onChanged();
  }

  const remain = getMonthsRemaining(local.date);
  const threshold = local.baoDongMonths ?? 6;
  let dateClass = "cell-input text-center font-medium";
  if (remain !== null) {
    if (remain <= 0) dateClass += " !bg-red-500 !text-white !border-red-600";
    else if (remain <= threshold) dateClass += " !bg-orange-400 !text-white !border-orange-500";
  }

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="text-slate-400 text-center font-medium">{index}</td>
      <td><input className="cell-input" value={local.ten} onChange={e => upd('ten', e.target.value)} /></td>
      {showLoai && <td><input className="cell-input" value={local.loaiHang || ''} onChange={e => upd('loaiHang', e.target.value)} /></td>}
      <NumCell value={local.sl} onChange={v => upd('sl', v)} />
      <NumCell value={local.giaMua} onChange={v => upd('giaMua', v)} />
      {showCalculated && <td className="text-right bg-slate-50 text-slate-600">{fmt(derived.tongVon)}</td>}
      <NumCell value={local.slCon} onChange={v => upd('slCon', v)} />
      {showCalculated && <td className="text-right bg-slate-50 text-slate-600">{fmt(derived.vonCon)}</td>}
      <NumCell value={local.giaBan} onChange={v => upd('giaBan', v)} />
      <NumCell value={local.slBan} onChange={v => upd('slBan', v)} />
      {showCalculated && <td className="text-right bg-slate-50 text-slate-600">{fmt(derived.tongBan)}</td>}
      {showCalculated && <td className={`text-right bg-slate-50 font-medium ${derived.tongLai >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(derived.tongLai)}</td>}
      <NumCell value={local.slChi} onChange={v => upd('slChi', v)} />
      {showCalculated && <td className="text-right bg-slate-50 text-red-600">{fmt(derived.tongChi)}</td>}
      <td className="p-1"><input className={dateClass} value={local.date || ''} onChange={e => upd('date', e.target.value)} title={remain !== null ? `Còn ${remain} tháng` : ''} /></td>
      <NumCell value={local.baoDongMonths ?? 6} onChange={v => upd('baoDongMonths', v)} />
      <td><input className="cell-input" value={local.dienGiai || ''} onChange={e => upd('dienGiai', e.target.value)} /></td>
      <NumCell value={local.giamCuoc} onChange={v => upd('giamCuoc', v)} />
      <td><input className="cell-input" value={local.nhap || ''} onChange={e => upd('nhap', e.target.value)} /></td>
      <td className="text-center">
        <button onClick={del} className="text-slate-400 hover:text-red-600 p-1" title="Xoá">✕</button>
      </td>
    </tr>
  );
}

function NumInput({ value, onChange, placeholder }) {
  return (
    <td>
      <input
        type="number"
        step="any"
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        placeholder={placeholder}
        className="cell-input cell-input-num"
      />
    </td>
  );
}
function NumCell({ value, onChange }) {
  return (
    <td className="text-right">
      <input
        type="number"
        step="any"
        value={value ?? 0}
        onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className="cell-input cell-input-num"
      />
    </td>
  );
}
