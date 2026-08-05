'use client';
import { useState, useEffect, useRef } from 'react';
import { CATEGORIES } from '@/lib/categories';

export default function AiBillScannerModal({ isOpen, onClose, monthId, currentCategoryKey, onImportSuccess }) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState([]);
  const [supplier, setSupplier] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('GEMINI_API_KEY') || '';
    setApiKey(savedKey);
  }, []);

  useEffect(() => {
    function handlePaste(e) {
      if (!isOpen) return;
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;
      for (let i = 0; i < clipboardItems.length; i++) {
        if (clipboardItems[i].type.indexOf('image') !== -1) {
          const file = clipboardItems[i].getAsFile();
          handleSelectFile(file);
          break;
        }
      }
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSelectFile(file) {
    if (!file) return;
    setImageFile(file);
    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleScan() {
    if (!imagePreview) {
      setErrorMsg('Vui lòng chọn ảnh trước');
      return;
    }
    setScanning(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/ai/scan-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          mimeType: imageFile?.type || 'image/jpeg',
          userApiKey: apiKey.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'NEED_API_KEY') {
          setShowKeyInput(true);
          setErrorMsg(data.message || 'Cần có Google Gemini API Key để quét ảnh.');
        } else {
          setErrorMsg(data.message || 'Lỗi quét ảnh. Vui lòng thử lại.');
        }
        setScanning(false);
        return;
      }

      if (data.apiKey) {
        localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
      }

      setSupplier(data.supplier || '');
      const parsedItems = (data.items || []).map((it, idx) => ({
        id: idx + 1,
        selected: true,
        ten: it.ten || '',
        sl: Number(it.sl) || 1,
        giaMua: Number(it.giaMua) || 0,
        categoryKey: it.categoryKey || currentCategoryKey || 'tap_hoa',
        loaiHang: it.loaiHang || '',
        nhap: it.nhap || data.supplier || '',
        dienGiai: it.dienGiai || '',
      }));

      setItems(parsedItems);
      if (parsedItems.length === 0) {
        setErrorMsg('Không tìm thấy sản phẩm nào trong ảnh. Bạn hãy kiểm tra lại ảnh nhé.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Không thể kết nối đến máy chủ.');
    } finally {
      setScanning(false);
    }
  }

  function handleUpdateItem(id, field, value) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  }

  function handleToggleAll(selected) {
    setItems(prev => prev.map(it => ({ ...it, selected })));
  }

  async function handleImport() {
    const selectedItems = items.filter(it => it.selected && it.ten.trim());
    if (selectedItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm để nhập.');
      return;
    }

    setSaving(true);
    try {
      const payload = selectedItems.map(it => ({
        monthId,
        categoryKey: it.categoryKey,
        ten: it.ten.trim(),
        loaiHang: it.loaiHang.trim(),
        sl: it.sl,
        slCon: it.sl,
        giaMua: it.giaMua,
        giaBan: 0,
        slBan: 0,
        slChi: 0,
        date: '',
        baoDongMonths: 12,
        nhap: it.nhap.trim() || supplier.trim(),
        dienGiai: it.dienGiai.trim(),
      }));

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthId, items: payload }),
      });

      if (!res.ok) throw new Error('Không thể lưu sản phẩm');

      if (apiKey) {
        localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
      }

      alert(`Đã thêm thành công ${payload.length} sản phẩm vào bảng!`);
      onImportSuccess();
      onClose();
    } catch (err) {
      alert('Lỗi lưu dữ liệu: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-700 to-brand-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📷</span>
            <div>
              <h3 className="text-lg font-bold">Quét ảnh đơn hàng / Bill bằng AI</h3>
              <p className="text-xs text-brand-100">Tự động nhận diện Tên sản phẩm, Số lượng, Giá nhập và Gợi ý danh mục</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl font-bold p-1 leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold">{errorMsg}</p>
                {errorMsg.includes('API Key') && (
                  <p className="text-xs mt-1 text-red-600">
                    Bạn có thể lấy Google Gemini API Key miễn phí trong 10 giây tại{' '}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-bold">
                      Google AI Studio (Nhấn vào đây)
                    </a>.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Optional API Key Input */}
          {(showKeyInput || !apiKey) && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-900">🔑 Google Gemini API Key (Miễn phí):</span>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-brand-600 font-medium hover:underline">
                  Lấy Key miễn phí tại đây ↗
                </a>
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Dán mã API Key (AIzaSy...)"
                className="w-full bg-white border border-amber-300 rounded px-2.5 py-1.5 text-xs font-mono"
              />
            </div>
          )}

          {/* Upload Area */}
          {!items.length && (
            <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 text-center bg-slate-50 transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={e => handleSelectFile(e.target.files?.[0])}
                className="hidden"
              />

              {imagePreview ? (
                <div className="space-y-4">
                  <div className="max-h-64 overflow-hidden rounded-xl border border-slate-200 inline-block shadow-md">
                    <img src={imagePreview} alt="Preview" className="max-h-64 w-auto object-contain mx-auto" />
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-ghost text-sm py-2 px-4"
                    >
                      🔄 Chọn ảnh khác
                    </button>
                    <button
                      type="button"
                      disabled={scanning}
                      onClick={handleScan}
                      className="btn !bg-gradient-to-r from-brand-600 to-indigo-600 !text-white font-bold py-2.5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      {scanning ? '⏳ Đang phân tích ảnh...' : '⚡ Bắt đầu phân tích ảnh'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 py-4">
                  <div className="text-4xl">📸</div>
                  <div>
                    <p className="text-base font-semibold text-slate-700">Tải ảnh hoặc Chụp ảnh đơn hàng / Bill</p>
                    <p className="text-xs text-slate-500 mt-1">Hỗ trợ ảnh chụp điện thoại, ảnh màn hình Zalo, Facebook, giỏ hàng Shopee, TikTok...</p>
                  </div>
                  <div className="pt-2 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn font-semibold py-2 px-5"
                    >
                      📁 Chọn ảnh từ thiết bị
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">💡 Mẹo: Bạn cũng có thể bấm <b>Ctrl + V</b> để dán trực tiếp ảnh vừa chụp màn hình</p>
                </div>
              )}
            </div>
          )}

          {/* Results Table */}
          {items.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">
                    🎉 Đã tìm thấy {items.length} sản phẩm:
                  </span>
                  <span className="text-xs text-slate-500">
                    ({items.filter(i => i.selected).length} đã chọn)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <label className="text-slate-600">Nơi nhập chung:</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={e => {
                      setSupplier(e.target.value);
                      setItems(prev => prev.map(it => ({ ...it, nhap: e.target.value })));
                    }}
                    placeholder="Mã đơn / Nơi nhập"
                    className="border border-slate-300 rounded px-2 py-1 text-xs w-32 font-medium"
                  />
                  <button
                    onClick={() => { setItems([]); setImagePreview(''); }}
                    className="btn-ghost text-xs py-1 px-2.5 text-slate-500"
                  >
                    📷 Quét ảnh khác
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[50vh] overflow-y-auto">
                <table className="tbl text-xs w-full">
                  <thead className="sticky top-0 bg-slate-100 shadow-sm z-10">
                    <tr>
                      <th className="w-8 text-center">
                        <input
                          type="checkbox"
                          checked={items.length > 0 && items.every(i => i.selected)}
                          onChange={e => handleToggleAll(e.target.checked)}
                        />
                      </th>
                      <th className="min-w-[200px]">Tên sản phẩm</th>
                      <th className="w-16 text-right">SL</th>
                      <th className="w-20 text-right">Giá nhập</th>
                      <th className="min-w-[150px]">Danh mục</th>
                      <th className="w-24">Loại hàng</th>
                      <th className="w-24">Nơi nhập</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id} className={`hover:bg-slate-50 ${!it.selected ? 'opacity-40 bg-slate-50' : ''}`}>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={it.selected}
                            onChange={e => handleUpdateItem(it.id, 'selected', e.target.checked)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={it.ten}
                            onChange={e => handleUpdateItem(it.id, 'ten', e.target.value)}
                            className="cell-input font-medium"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={it.sl}
                            onChange={e => handleUpdateItem(it.id, 'sl', Number(e.target.value || 1))}
                            className="cell-input text-right font-semibold"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={it.giaMua}
                            onChange={e => handleUpdateItem(it.id, 'giaMua', Number(e.target.value || 0))}
                            className="cell-input text-right font-semibold text-brand-700"
                          />
                        </td>
                        <td>
                          <select
                            value={it.categoryKey}
                            onChange={e => handleUpdateItem(it.id, 'categoryKey', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs"
                          >
                            {CATEGORIES.map(c => (
                              <option key={c.key} value={c.key}>{c.name}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={it.loaiHang}
                            onChange={e => handleUpdateItem(it.id, 'loaiHang', e.target.value)}
                            placeholder="vd: KCN, TPCN"
                            className="cell-input"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={it.nhap}
                            onChange={e => handleUpdateItem(it.id, 'nhap', e.target.value)}
                            placeholder="Nơi nhập"
                            className="cell-input"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <button onClick={onClose} className="btn-ghost">Đóng</button>
          {items.length > 0 && (
            <button
              onClick={handleImport}
              disabled={saving || items.filter(i => i.selected).length === 0}
              className="btn !bg-green-600 hover:!bg-green-700 !text-white font-bold py-2 px-6 rounded-xl shadow-md flex items-center gap-2"
            >
              {saving ? '⏳ Đang lưu...' : `✅ Nhập ${items.filter(i => i.selected).length} sản phẩm vào bảng`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
