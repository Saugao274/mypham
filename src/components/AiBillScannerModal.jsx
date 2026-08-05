'use client';
import { useState, useEffect, useRef } from 'react';
import { CATEGORIES } from '@/lib/categories';

export default function AiBillScannerModal({ isOpen, onClose, monthId, currentCategoryKey, onImportSuccess, initialImageFile = null }) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState([]);
  const [supplier, setSupplier] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasServerKey, setHasServerKey] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('GEMINI_API_KEY') || '';
    setApiKey(savedKey);

    fetch('/api/ai/scan-bill')
      .then(r => r.json())
      .then(data => {
        if (data.configured) {
          setHasServerKey(true);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (initialImageFile && isOpen) {
      processFileAndAutoScan(initialImageFile);
    }
  }, [initialImageFile, isOpen]);

  // Support paste (Ctrl+V) anywhere inside the window when modal is open
  useEffect(() => {
    function handlePaste(e) {
      if (!isOpen) return;
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;
      for (let i = 0; i < clipboardItems.length; i++) {
        if (clipboardItems[i].type.indexOf('image') !== -1) {
          const file = clipboardItems[i].getAsFile();
          if (file) {
            processFileAndAutoScan(file);
          }
          break;
        }
      }
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, apiKey]);

  if (!isOpen) return null;

  async function processFileAndAutoScan(file) {
    if (!file) return;
    setImageFile(file);
    setErrorMsg('');
    try {
      const compressed = await compressImageFile(file);
      if (!compressed) return;
      setImagePreview(compressed.dataUrl);
      // Auto trigger scan for instant speed
      triggerScan(compressed.dataUrl, compressed.mimeType);
    } catch (err) {
      console.error(err);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        triggerScan(e.target.result, file.type || 'image/jpeg');
      };
      reader.readAsDataURL(file);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        processFileAndAutoScan(file);
      } else {
        setErrorMsg('Vui lòng kéo file hình ảnh (PNG, JPG, JPEG, WEBP...)');
      }
    }
  }

  async function triggerScan(base64Data, mime) {
    const activeKey = apiKey.trim() || localStorage.getItem('GEMINI_API_KEY') || '';
    setScanning(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/ai/scan-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: mime,
          userApiKey: activeKey,
        }),
      });

      if (res.status === 401) {
        setErrorMsg('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        setScanning(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'NEED_API_KEY' || data.error === 'INVALID_API_KEY') {
          setShowKeyInput(true);
          setErrorMsg(data.message || 'Mã API Key chưa đúng hoặc chưa được nhập.');
        } else {
          setErrorMsg(data.message || 'Lỗi quét ảnh. Vui lòng thử lại.');
        }
        setScanning(false);
        return;
      }

      if (activeKey) {
        localStorage.setItem('GEMINI_API_KEY', activeKey);
      }

      const defaultSupplier = (data.supplier || '').trim();
      setSupplier(defaultSupplier);
      const parsedItems = (data.items || []).map((it, idx) => ({
        id: idx + 1,
        selected: true,
        ten: it.ten || '',
        sl: Number(it.sl) || 1,
        giaMua: Number(it.giaMua) || 0,
        categoryKey: it.categoryKey || currentCategoryKey || 'tap_hoa',
        loaiHang: it.loaiHang || '',
        nhap: (it.nhap || defaultSupplier || '').trim(),
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
      const payload = selectedItems.map(it => {
        const itemNhap = (it.nhap || '').trim() || (supplier || '').trim();
        return {
          monthId,
          categoryKey: it.categoryKey || currentCategoryKey || 'tap_hoa',
          ten: it.ten.trim(),
          loaiHang: (it.loaiHang || '').trim(),
          sl: Number(it.sl) || 1,
          slCon: Number(it.sl) || 1,
          giaMua: Number(it.giaMua) || 0,
          giaBan: 0,
          slBan: 0,
          slChi: 0,
          date: '',
          baoDongMonths: 12,
          nhap: itemNhap,
          dienGiai: (it.dienGiai || '').trim(),
        };
      });

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthId, items: payload }),
      });

      if (res.status === 401) {
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        window.location.href = '/login';
        return;
      }

      if (!res.ok) throw new Error('Không thể lưu sản phẩm');

      if (apiKey) {
        localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
      }

      const firstCatKey = payload[0]?.categoryKey;
      alert(`Đã thêm thành công ${payload.length} sản phẩm vào bảng! Cột Nơi nhập đã được lưu đầy đủ.`);
      if (onImportSuccess) onImportSuccess(firstCatKey);
      onClose();
    } catch (err) {
      alert('Lỗi lưu dữ liệu: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 md:p-6 overflow-y-auto"
    >
      <div className={`bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border transition-all ${
        isDragging ? 'border-brand-500 ring-4 ring-brand-300 scale-[1.01]' : 'border-slate-200'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-700 via-indigo-700 to-brand-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📷</span>
            <div>
              <h3 className="text-lg font-bold">Quét ảnh đơn hàng / Bill bằng AI</h3>
              <p className="text-xs text-brand-100">Kéo thả ảnh, dán ảnh (Ctrl+V) hoặc chọn file để AI tự quét ngay</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl font-bold p-1 leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Drag Overlay visual hint */}
          {isDragging && (
            <div className="p-4 bg-brand-50 border-2 border-dashed border-brand-500 rounded-xl text-center text-brand-700 font-bold animate-pulse">
              📥 Thả ảnh vào đây để phân tích tự động ngay lập tức!
            </div>
          )}

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

          {/* API Key Input */}
          {(showKeyInput || (!apiKey && !hasServerKey)) && (
            <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl text-xs space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <span>🔑</span> Nhập mã Google Gemini API Key (Miễn phí 100%):
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-brand-600 text-white font-bold px-2.5 py-1 rounded-md text-[11px] hover:bg-brand-700 shadow-sm"
                >
                  👉 Bấm vào đây để lấy Key miễn phí ↗
                </a>
              </div>
              <p className="text-slate-600 text-[11px]">
                (Chỉ cần đăng nhập tài khoản Google của bạn &rarr; Bấm nút <b>&quot;Create API key&quot;</b> &rarr; Copy dán vào ô bên dưới)
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apiKey}
                  onChange={e => {
                    setApiKey(e.target.value);
                    localStorage.setItem('GEMINI_API_KEY', e.target.value.trim());
                  }}
                  placeholder="Dán mã API Key bắt đầu bằng AIzaSy..."
                  className="flex-1 bg-white border border-amber-400 rounded-lg px-3 py-1.5 text-xs font-mono font-medium focus:ring-2 focus:ring-brand-500"
                />
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => triggerScan(imagePreview, imageFile?.type || 'image/jpeg')}
                    className="btn !bg-amber-700 !text-white font-bold py-1.5 px-3 rounded-lg text-xs hover:!bg-amber-800 shrink-0"
                  >
                    ⚡ Thử quét lại
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Scanning Progress */}
          {scanning && (
            <div className="p-8 text-center bg-brand-50/50 border border-brand-200 rounded-2xl space-y-3">
              <div className="inline-block animate-spin text-4xl">⚡</div>
              <p className="text-base font-bold text-brand-800">Đang phân tích hình ảnh và trích xuất sản phẩm...</p>
              <p className="text-xs text-brand-600">AI đang đọc Tên SP, Số lượng trong vòng tròn xanh, Giá nhập và gợi ý Danh mục...</p>
            </div>
          )}

          {/* Upload Dropzone */}
          {!scanning && items.length === 0 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging ? 'border-brand-600 bg-brand-50 scale-[1.02]' : 'border-slate-300 hover:border-brand-500 bg-slate-50 hover:bg-slate-100/70'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={e => processFileAndAutoScan(e.target.files?.[0])}
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
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="btn-ghost text-sm py-2 px-4"
                    >
                      🔄 Kéo hoặc Chọn ảnh khác
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); triggerScan(imagePreview, imageFile?.type || 'image/jpeg'); }}
                      className="btn !bg-brand-600 !text-white font-bold py-2 px-6 rounded-xl shadow"
                    >
                      ⚡ Quét lại
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 py-4">
                  <div className="text-5xl animate-bounce">📥</div>
                  <div>
                    <p className="text-lg font-bold text-slate-800">Kéo & Thả ảnh vào đây</p>
                    <p className="text-xs text-slate-500 mt-1">Hoặc bấm vào để chọn ảnh từ máy tính / điện thoại</p>
                  </div>
                  <div className="pt-2 flex justify-center gap-2">
                    <span className="btn font-semibold py-2 px-6 shadow-sm">
                      📁 Chọn ảnh từ thiết bị
                    </span>
                  </div>
                  <div className="pt-2 text-xs text-slate-500 font-medium">
                    ⚡ <b>Mẹo cực nhanh:</b> Chụp màn hình xong bấm <b>Ctrl + V</b> để quét ngay!
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results Table */}
          {!scanning && items.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">
                    🎉 Đã tìm thấy {items.length} sản phẩm:
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    ({items.filter(i => i.selected).length} đã chọn)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <label className="text-slate-600 font-medium">Nơi nhập chung:</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={e => {
                      setSupplier(e.target.value);
                      setItems(prev => prev.map(it => ({ ...it, nhap: e.target.value })));
                    }}
                    placeholder="Mã đơn / Nơi nhập"
                    className="border border-slate-300 rounded px-2 py-1 text-xs w-32 font-semibold"
                  />
                  <button
                    onClick={() => { setItems([]); setImagePreview(''); }}
                    className="btn-ghost text-xs py-1 px-2.5 text-slate-500 border border-slate-200"
                  >
                    📷 Kéo ảnh khác
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
                            className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs font-medium"
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
              className="btn !bg-green-600 hover:!bg-green-700 !text-white font-bold py-2.5 px-6 rounded-xl shadow-md flex items-center gap-2 text-sm"
            >
              {saving ? '⏳ Đang lưu...' : `✅ Nhập ${items.filter(i => i.selected).length} sản phẩm vào bảng`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function compressImageFile(file, maxDim = 1600, quality = 0.85) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ dataUrl, mimeType: 'image/jpeg' });
      };
      img.onerror = () => {
        resolve({ dataUrl: e.target.result, mimeType: file.type || 'image/jpeg' });
      };
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
