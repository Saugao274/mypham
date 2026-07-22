'use client';
import { useState, useRef, useEffect } from 'react';

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

export default function ProductTable({ monthId, category, items, loading, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState(makeEmpty());

  function makeEmpty() {
    return {
      ten: '', loaiHang: '', sl: 0, giaMua: 0, giaBan: 0, slCon: 0,
      slBan: 0, slChi: 0, giamCuoc: 0, date: '', dienGiai: '', nhap: '',
    };
  }

  async function saveNew() {
    if (!newRow.ten.trim()) return;
    const body = { ...newRow, monthId, categoryKey: category.key };
    // slCon mặc định = sl nếu chưa nhập
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

  // Totals
  const totals = items.reduce((acc, p) => {
    const c = computeDerived(p);
    acc.tongVon += c.tongVon; acc.vonCon += c.vonCon;
    acc.tongBan += c.tongBan; acc.tongLai += c.tongLai; acc.tongChi += c.tongChi;
    return acc;
  }, { tongVon: 0, vonCon: 0, tongBan: 0, tongLai: 0, tongChi: 0 });

  const showLoai = category.hasLoaiHang;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-semibold text-brand-700">{category.name}</h2>
          <p className="text-xs text-slate-500">{items.length} sản phẩm · Bấm trực tiếp vào ô để sửa</p>
        </div>
        <button className="btn" onClick={() => setAdding(v => !v)}>
          {adding ? 'Đóng' : '+ Thêm sản phẩm'}
        </button>
      </div>

      <div className="scroll-x">
        <table className="tbl">
          <thead>
            <tr>
              <th>TT</th>
              <th className="min-w-[180px]">Tên SP</th>
              {showLoai && <th>Loại hàng</th>}
              <th className="text-right">SL</th>
              <th className="text-right">Giá mua</th>
              <th className="text-right bg-slate-50">Tổng vốn</th>
              <th className="text-right">SL còn</th>
              <th className="text-right bg-slate-50">Vốn còn</th>
              <th className="text-right">Giá bán</th>
              <th className="text-right">SL bán</th>
              <th className="text-right bg-slate-50">Tổng bán</th>
              <th className="text-right bg-slate-50">Tổng lãi</th>
              <th className="text-right">SL chi</th>
              <th className="text-right bg-slate-50">Tổng chi</th>
              <th>Date</th>
              <th className="min-w-[160px]">Diễn giải</th>
              <th className="text-right">Giảm / cước</th>
              <th>Nhập</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {adding && (
              <NewRow row={newRow} setRow={setNewRow} showLoai={showLoai} onSave={saveNew} onCancel={() => { setAdding(false); setNewRow(makeEmpty()); }} />
            )}
            {items.map((p, i) => (
              <EditableRow key={p._id} index={i + 1} product={p} showLoai={showLoai} onChanged={onChanged} />
            ))}
            {!items.length && !adding && (
              <tr><td colSpan={showLoai ? 19 : 18} className="text-center text-slate-400 py-6">
                {loading ? 'Đang tải…' : 'Chưa có sản phẩm nào — bấm "Thêm sản phẩm" để bắt đầu'}
              </td></tr>
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="font-semibold bg-brand-50/50">
                <td colSpan={showLoai ? 5 : 4} className="text-right pr-2">Tổng:</td>
                <td className="text-right">{fmt(totals.tongVon)}</td>
                <td></td>
                <td className="text-right">{fmt(totals.vonCon)}</td>
                <td></td>
                <td></td>
                <td className="text-right">{fmt(totals.tongBan)}</td>
                <td className="text-right text-green-700">{fmt(totals.tongLai)}</td>
                <td></td>
                <td className="text-right text-red-700">{fmt(totals.tongChi)}</td>
                <td colSpan={5}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function NewRow({ row, setRow, showLoai, onSave, onCancel }) {
  const upd = (k, v) => setRow(r => ({ ...r, [k]: v }));
  return (
    <tr className="bg-amber-50/40">
      <td>➕</td>
      <td><input autoFocus className="cell-input" value={row.ten} onChange={e => upd('ten', e.target.value)} placeholder="Tên sản phẩm" /></td>
      {showLoai && <td><input className="cell-input" value={row.loaiHang} onChange={e => upd('loaiHang', e.target.value)} /></td>}
      <NumInput value={row.sl} onChange={v => upd('sl', v)} />
      <NumInput value={row.giaMua} onChange={v => upd('giaMua', v)} />
      <td className="text-right text-slate-400 bg-slate-50">{fmt(round2((row.sl || 0) * (row.giaMua || 0)))}</td>
      <NumInput value={row.slCon} onChange={v => upd('slCon', v)} placeholder={String(row.sl || 0)} />
      <td className="text-right text-slate-400 bg-slate-50">{fmt(round2((row.slCon || 0) * (row.giaMua || 0)))}</td>
      <NumInput value={row.giaBan} onChange={v => upd('giaBan', v)} />
      <NumInput value={row.slBan} onChange={v => upd('slBan', v)} />
      <td className="text-right text-slate-400 bg-slate-50">{fmt(round2((row.slBan || 0) * (row.giaBan || 0)))}</td>
      <td className="text-right text-slate-400 bg-slate-50"></td>
      <NumInput value={row.slChi} onChange={v => upd('slChi', v)} />
      <td className="text-right text-slate-400 bg-slate-50">{fmt(round2((row.slChi || 0) * (row.giaMua || 0)))}</td>
      <td><input className="cell-input" value={row.date} onChange={e => upd('date', e.target.value)} placeholder="mm/yy" /></td>
      <td><input className="cell-input" value={row.dienGiai} onChange={e => upd('dienGiai', e.target.value)} /></td>
      <NumInput value={row.giamCuoc} onChange={v => upd('giamCuoc', v)} />
      <td><input className="cell-input" value={row.nhap} onChange={e => upd('nhap', e.target.value)} /></td>
      <td>
        <div className="flex gap-1">
          <button className="text-green-600 hover:text-green-800 font-bold" onClick={onSave} title="Lưu">✓</button>
          <button className="text-slate-500 hover:text-red-600" onClick={onCancel} title="Huỷ">✕</button>
        </div>
      </td>
    </tr>
  );
}

function EditableRow({ index, product, showLoai, onChanged }) {
  const [local, setLocal] = useState(product);
  useEffect(() => { setLocal(product); }, [product._id, product.updatedAt]);
  const savingRef = useRef(null);
  const derived = computeDerived(local);

  function upd(k, v) {
    const next = { ...local, [k]: v };
    setLocal(next);
    if (savingRef.current) clearTimeout(savingRef.current);
    savingRef.current = setTimeout(() => save(next), 500);
  }

  async function save(next) {
    const fields = ['ten','loaiHang','sl','giaMua','giaBan','slCon','slBan','slChi','giamCuoc','date','dienGiai','nhap'];
    const payload = {};
    for (const f of fields) payload[f] = next[f];
    await fetch(`/api/products/${product._id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    onChanged();
  }

  async function del() {
    if (!confirm(`Xoá "${local.ten}"?`)) return;
    await fetch(`/api/products/${product._id}`, { method: 'DELETE' });
    onChanged();
  }

  return (
    <tr>
      <td className="text-slate-400 text-center">{index}</td>
      <td><input className="cell-input" value={local.ten} onChange={e => upd('ten', e.target.value)} /></td>
      {showLoai && <td><input className="cell-input" value={local.loaiHang || ''} onChange={e => upd('loaiHang', e.target.value)} /></td>}
      <NumCell value={local.sl} onChange={v => upd('sl', v)} />
      <NumCell value={local.giaMua} onChange={v => upd('giaMua', v)} />
      <td className="text-right bg-slate-50 text-slate-600">{fmt(derived.tongVon)}</td>
      <NumCell value={local.slCon} onChange={v => upd('slCon', v)} />
      <td className="text-right bg-slate-50 text-slate-600">{fmt(derived.vonCon)}</td>
      <NumCell value={local.giaBan} onChange={v => upd('giaBan', v)} />
      <NumCell value={local.slBan} onChange={v => upd('slBan', v)} />
      <td className="text-right bg-slate-50 text-slate-600">{fmt(derived.tongBan)}</td>
      <td className={`text-right bg-slate-50 font-medium ${derived.tongLai >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(derived.tongLai)}</td>
      <NumCell value={local.slChi} onChange={v => upd('slChi', v)} />
      <td className="text-right bg-slate-50 text-red-600">{fmt(derived.tongChi)}</td>
      <td><input className="cell-input" value={local.date || ''} onChange={e => upd('date', e.target.value)} /></td>
      <td><input className="cell-input" value={local.dienGiai || ''} onChange={e => upd('dienGiai', e.target.value)} /></td>
      <NumCell value={local.giamCuoc} onChange={v => upd('giamCuoc', v)} />
      <td><input className="cell-input" value={local.nhap || ''} onChange={e => upd('nhap', e.target.value)} /></td>
      <td>
        <button onClick={del} className="text-slate-400 hover:text-red-600" title="Xoá">✕</button>
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
