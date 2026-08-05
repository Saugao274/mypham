'use client';
import { useState, useRef, useEffect, useMemo } from 'react';

function suggestCategory(name, items) {
  if (!name || !items || !items.length) return "";
  const lowerName = name.toLowerCase().trim();
  const typedWords = lowerName.split(/\s+/);
  
  let bestMatch = null;
  let maxMatchedWords = 0;
  
  for (const item of items) {
    if (!item.ten || !item.loaiHang) continue;
    const itemWords = item.ten.toLowerCase().trim().split(/\s+/);
    let matchCount = 0;
    while (matchCount < typedWords.length && matchCount < itemWords.length && typedWords[matchCount] === itemWords[matchCount]) {
      matchCount++;
    }
    if (matchCount > maxMatchedWords) {
      maxMatchedWords = matchCount;
      bestMatch = item.loaiHang;
    }
  }

  const keywords = {
    "dầu gội": "Tóc", "dầu xả": "Tóc",
    "kem đr": "Kem đánh răng", "kđr": "Kem đánh răng", "kdr": "Kem đánh răng",
    "st": "Sữa tắm", "sữa tắm": "Sữa tắm",
    "ddvs": "Cơ thể", "cơ thể": "Cơ thể",
    "chăn lạnh": "Linh tinh", "gối": "Linh tinh", "kim vụn": "Thực phẩm", "ngũ cốc": "Thực phẩm", "kẹo": "Thực phẩm",
    "kem nền": "Makeup", "phấn": "Makeup", "makeup": "Makeup",
    "son": "Son", "kem": "Kem",
    "srm": "Sữa rửa mặt", "sữa rửa mặt": "Sữa rửa mặt",
    "tdc": "Tẩy da chết", "tẩy da chết": "Tẩy da chết",
    "tt": "Nước tẩy trang", "tẩy trang": "Nước tẩy trang",
    "nhh": "Nước hoa hồng", "nước hoa hồng": "Nước hoa hồng",
    "xk": "Xịt khoáng", "xịt khoáng": "Xịt khoáng"
  };

  let kwMatch = "";
  let matchedKw = "";
  for (const [kw, cat] of Object.entries(keywords)) {
    const regex = new RegExp(`(^|\\s)${kw}(\\s|$)`);
    if (regex.test(lowerName)) {
      kwMatch = cat;
      matchedKw = kw;
      break;
    }
  }

  if (kwMatch) {
    if (maxMatchedWords >= 2) return bestMatch;
    
    const exactExisting = items.find(item => item.loaiHang?.toLowerCase() === kwMatch.toLowerCase());
    const kwRegex = new RegExp(`(^|\\s)${matchedKw}(\\s|$)`);
    const existingWithKw = items.find(item => item.ten && kwRegex.test(item.ten.toLowerCase()));
    
    if (existingWithKw && existingWithKw.loaiHang) return existingWithKw.loaiHang;
    if (exactExisting) return exactExisting.loaiHang;
    return kwMatch;
  }

  if (maxMatchedWords >= 1) return bestMatch;

  return "";
}

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
  const [hideExtra, setHideExtra] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('MYPHAM_HIDE_EXTRA_COLS');
    if (saved !== null) {
      setHideExtra(saved === 'true');
    }
  }, []);

  const toggleHideExtra = () => {
    setHideExtra(prev => {
      const next = !prev;
      localStorage.setItem('MYPHAM_HIDE_EXTRA_COLS', String(next));
      return next;
    });
  };

  function makeEmpty() {
    return {
      ten: '', loaiHang: '', sl: 0, giaMua: 0, giaBan: 0, slCon: 0,
      slBan: 0, slChi: 0, giamCuoc: 0, date: '', baoDongMonths: 12, dienGiai: '', nhap: '',
    };
  }

  async function saveNew(isAutoSave) {
    if (!newRow.ten.trim()) {
      if (isAutoSave === true) {
        setAdding(false);
        setNewRow(makeEmpty());
      }
      return;
    }
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

  const showLoai = category?.hasLoaiHang;
  const totalCols = (showLoai ? 1 : 0) + (showCalculated ? 5 : 0) + (hideExtra ? 0 : 4) + 10;

  function renderTh(k, label, className = '') {
    return (
      <th key={k} className={`cursor-pointer hover:bg-slate-100 select-none ${className}`} onClick={() => handleSort(k)}>
        <div className="flex items-center justify-between gap-1">
          <span>{label}</span>
          {sortConfig.key === k && (
            <span className="text-[10px] text-brand-600">{sortConfig.dir === 'asc' ? '▲' : '▼'}</span>
          )}
        </div>
      </th>
    );
  }

  function renderFilter(k, placeholder = 'Lọc...') {
    return (
      <input
        className="w-full text-xs border border-slate-300 rounded px-1 py-0.5 font-normal"
        placeholder={placeholder}
        value={filters[k] || ''}
        onChange={e => handleFilter(k, e.target.value)}
      />
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-slate-100 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-brand-700">{category.name}</h2>
          <p className="text-xs text-slate-500">{items.length} sản phẩm · Bấm vào tiêu đề cột để sắp xếp</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className={`text-xs py-1 px-2.5 rounded-md border font-medium transition-all ${
              hideExtra
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm hover:bg-amber-600'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
            onClick={toggleHideExtra}
            title="Ẩn/hiện các cột: Báo động, Diễn giải, Giảm/cước, Nhập"
          >
            {hideExtra ? '👁️ Hiện lại cột phụ' : '🕶️ Ẩn cột phụ (Báo động, Diễn giải...)'}
          </button>
          <button className="btn-ghost text-xs py-1 px-2" onClick={() => setShowCalculated(v => !v)}>
            {showCalculated ? "Ẩn cột tính toán" : "Hiện cột tính toán"}
          </button>
          <button className="btn text-xs py-1 px-3" onClick={() => setAdding(v => !v)}>
            {adding ? 'Đóng' : '+ Thêm sản phẩm'}
          </button>
        </div>
      </div>

      <div className="scroll-x">
        <table className="tbl text-sm">
          <thead>
            <tr>
              {renderTh('index', 'TT', 'w-12 text-center')}
              {renderTh('ten', 'Tên SP', 'min-w-[180px]')}
              {showLoai && renderTh('loaiHang', 'Loại hàng')}
              {renderTh('sl', 'SL', 'text-right min-w-[65px]')}
              {renderTh('giaMua', 'Giá mua', 'text-right min-w-[75px]')}
              {showCalculated && <th className="text-right bg-slate-50 min-w-[90px]">Tổng vốn</th>}
              {renderTh('slCon', 'SL còn', 'text-right min-w-[70px]')}
              {showCalculated && <th className="text-right bg-slate-50 min-w-[90px]">Vốn còn</th>}
              {renderTh('giaBan', 'Giá bán', 'text-right min-w-[75px]')}
              {renderTh('slBan', 'SL bán', 'text-right min-w-[70px]')}
              {showCalculated && <th className="text-right bg-slate-50 min-w-[90px]">Tổng bán</th>}
              {showCalculated && <th className="text-right bg-slate-50 min-w-[90px]">Tổng lãi</th>}
              {renderTh('slChi', 'SL chi', 'text-right min-w-[70px]')}
              {showCalculated && <th className="text-right bg-slate-50 min-w-[90px]">Tổng chi</th>}
              {renderTh('date', 'Date', 'min-w-[80px]')}
              {!hideExtra && renderTh('baoDongMonths', 'Báo động', 'text-center min-w-[70px] text-[11px] leading-tight')}
              {!hideExtra && renderTh('dienGiai', 'Diễn giải', 'min-w-[160px]')}
              {!hideExtra && renderTh('giamCuoc', 'Giảm/cước', 'text-right min-w-[80px]')}
              {!hideExtra && renderTh('nhap', 'Nhập', 'min-w-[100px]')}
              <th></th>
            </tr>
            <tr className="bg-slate-50/50">
              <td className="px-1 py-1">{renderFilter('index')}</td>
              <td className="px-1 py-1">{renderFilter('ten')}</td>
              {showLoai && <td className="px-1 py-1">{renderFilter('loaiHang')}</td>}
              <td className="px-1 py-1">{renderFilter('sl')}</td>
              <td className="px-1 py-1">{renderFilter('giaMua')}</td>
              {showCalculated && <td className="bg-slate-50"></td>}
              <td className="px-1 py-1">{renderFilter('slCon')}</td>
              {showCalculated && <td className="bg-slate-50"></td>}
              <td className="px-1 py-1">{renderFilter('giaBan')}</td>
              <td className="px-1 py-1">{renderFilter('slBan')}</td>
              {showCalculated && <td className="bg-slate-50"></td>}
              {showCalculated && <td className="bg-slate-50"></td>}
              <td className="px-1 py-1">{renderFilter('slChi')}</td>
              {showCalculated && <td className="bg-slate-50"></td>}
              <td className="px-1 py-1">{renderFilter('date')}</td>
              {!hideExtra && <td></td>}
              {!hideExtra && <td className="px-1 py-1">{renderFilter('dienGiai')}</td>}
              {!hideExtra && <td className="px-1 py-1">{renderFilter('giamCuoc')}</td>}
              {!hideExtra && <td className="px-1 py-1">{renderFilter('nhap')}</td>}
              <td></td>
            </tr>
          </thead>
          <tbody>
            {adding && (
              <NewRow items={items} row={newRow} setRow={setNewRow} showLoai={showLoai} showCalculated={showCalculated} hideExtra={hideExtra} totalCols={totalCols} onSave={saveNew} onCancel={() => { setAdding(false); setNewRow(makeEmpty()); }} />
            )}
            {processedItems.map((p) => (
              <EditableRow key={p._id} index={p._originalIndex} product={p} showLoai={showLoai} showCalculated={showCalculated} hideExtra={hideExtra} onChanged={onChanged} onRowChange={onRowChange} />
            ))}
            {!processedItems.length && !adding && (
              <tr><td colSpan={totalCols} className="text-center text-slate-400 py-6">
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
                <td colSpan={hideExtra ? 2 : 6}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function NewRow({ items, row, setRow, showLoai, showCalculated, hideExtra, totalCols, onSave, onCancel }) {
  const trRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (trRef.current && !trRef.current.contains(e.target)) {
        onSave(true);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onSave]);

  const duplicateMatches = useMemo(() => {
    const t = (row.ten || '').trim().toLowerCase();
    if (!t || t.length < 2) return [];
    return (items || []).filter(p => (p.ten || '').trim().toLowerCase() === t);
  }, [row.ten, items]);

  const upd = (k, v) => setRow(r => {
    let next = { ...r, [k]: v };
    if (k === 'ten' && v && !r.loaiHang) {
      const sug = suggestCategory(v, items);
      if (sug) next.loaiHang = sug;
    }
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
    <>
      <tr ref={trRef} className="bg-amber-50/40">
        <td className="text-center">➕</td>
        <td>
          <AutoTextArea autoFocus className="font-medium" value={row.ten} onChange={v => upd('ten', v)} placeholder="Tên sản phẩm" />
        </td>
        {showLoai && <td><AutoTextArea value={row.loaiHang} onChange={v => upd('loaiHang', v)} /></td>}
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
        {!hideExtra && <NumInput value={row.baoDongMonths} onChange={v => upd('baoDongMonths', v)} />}
        {!hideExtra && <td><AutoTextArea value={row.dienGiai} onChange={v => upd('dienGiai', v)} /></td>}
        {!hideExtra && <NumInput value={row.giamCuoc} onChange={v => upd('giamCuoc', v)} />}
        {!hideExtra && <td><AutoTextArea value={row.nhap} onChange={v => upd('nhap', v)} /></td>}
        <td>
          <div className="flex gap-1 justify-center">
            <button className="text-green-600 hover:text-green-800 font-bold px-1" onClick={onSave} title="Lưu">✓</button>
            <button className="text-slate-500 hover:text-red-600 px-1" onClick={onCancel} title="Huỷ">✕</button>
          </div>
        </td>
      </tr>
      {duplicateMatches.length > 0 && (
        <tr className="bg-amber-100/90 border-b border-amber-300 text-amber-900 text-xs">
          <td colSpan={totalCols} className="py-2 px-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base">⚠️</span>
              <span className="font-semibold">Đã có sản phẩm này trong danh sách:</span>
              {duplicateMatches.map((m, idx) => (
                <span key={m._id || idx} className="bg-white/90 border border-amber-300 rounded px-2 py-0.5 font-medium shadow-sm">
                  &ldquo;{m.ten}&rdquo; (Giá mua: {fmt(m.giaMua)} · Nơi nhập: {m.nhap || 'Trống'} · SL còn: {m.slCon || 0})
                </span>
              ))}
              <span className="text-amber-800 italic ml-1">(Bạn vẫn có thể tiếp tục nhập nếu khác giá hoặc nơi nhập)</span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function EditableRow({ index, product, showLoai, showCalculated, hideExtra, onChanged, onRowChange }) {
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
  const threshold = local.baoDongMonths ?? 12;
  let dateClass = "cell-input text-center font-medium";
  if (remain !== null) {
    if (remain <= 6) dateClass += " !bg-red-500 !text-white !border-red-600";
    else if (remain <= threshold) dateClass += " !bg-orange-400 !text-white !border-orange-500";
  }

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="text-slate-400 text-center font-medium">{index}</td>
      <td><AutoTextArea className="font-medium" value={local.ten} onChange={v => upd('ten', v)} /></td>
      {showLoai && <td><AutoTextArea value={local.loaiHang || ''} onChange={v => upd('loaiHang', v)} /></td>}
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
      {!hideExtra && <NumCell value={local.baoDongMonths ?? 12} onChange={v => upd('baoDongMonths', v)} />}
      {!hideExtra && <td><AutoTextArea value={local.dienGiai || ''} onChange={v => upd('dienGiai', v)} /></td>}
      {!hideExtra && <NumCell value={local.giamCuoc} onChange={v => upd('giamCuoc', v)} />}
      {!hideExtra && <td><AutoTextArea value={local.nhap || ''} onChange={v => upd('nhap', v)} /></td>}
      <td className="text-center">
        <button onClick={del} className="text-slate-400 hover:text-red-600 p-1" title="Xoá">✕</button>
      </td>
    </tr>
  );
}

function NumInput({ value, onChange, placeholder }) {
  const [text, setText] = useState(value === null || value === undefined ? '' : String(value));
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setText(value === null || value === undefined ? '' : String(value));
    }
  }, [value]);

  return (
    <td>
      <input
        type="number"
        step="any"
        value={text}
        onFocus={e => {
          isFocused.current = true;
          e.target.select();
        }}
        onChange={e => {
          const val = e.target.value;
          setText(val);
          onChange(val === '' ? 0 : Number(val));
        }}
        onBlur={() => {
          isFocused.current = false;
          if (text === '') {
            setText(value === null || value === undefined ? '' : String(value));
          } else {
            setText(String(Number(text) || 0));
          }
        }}
        placeholder={placeholder}
        className="cell-input cell-input-num"
      />
    </td>
  );
}

function AutoTextArea({ value, onChange, placeholder, className = "", autoFocus }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      onFocus={e => e.target.select()}
      placeholder={placeholder}
      className={`cell-input resize-none overflow-hidden min-h-[32px] leading-[1.3] ${className}`}
      rows={1}
      autoFocus={autoFocus}
    />
  );
}

function NumCell({ value, onChange }) {
  const [text, setText] = useState(value === null || value === undefined ? '' : String(value));
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setText(value === null || value === undefined ? '' : String(value));
    }
  }, [value]);

  return (
    <td className="text-right">
      <input
        type="number"
        step="any"
        value={text}
        onFocus={e => {
          isFocused.current = true;
          e.target.select();
        }}
        onChange={e => {
          const val = e.target.value;
          setText(val);
          onChange(val === '' ? 0 : Number(val));
        }}
        onBlur={() => {
          isFocused.current = false;
          if (text === '') {
            setText(value === null || value === undefined ? '' : String(value));
          } else {
            setText(String(Number(text) || 0));
          }
        }}
        className="cell-input cell-input-num"
      />
    </td>
  );
}
