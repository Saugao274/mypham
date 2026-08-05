'use client';
import { useEffect, useState } from 'react';
import { useCurrentMonth } from '@/lib/useCurrentMonth';
import ProductTable from '@/components/ProductTable';
import AiBillScannerModal from '@/components/AiBillScannerModal';

export default function ProductsPage() {
  const { monthId, months, reload } = useCurrentMonth();
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [droppedFile, setDroppedFile] = useState(null);
  const [isPageDragging, setIsPageDragging] = useState(false);

  useEffect(() => { reload(); }, []);
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(list => {
      setCategories(list);
      setActiveCat(prev => prev || list[0]?.key);
    });
  }, []);

  async function loadProducts() {
    if (!monthId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products?monthId=${monthId}&t=${Date.now()}`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }
  useEffect(() => { loadProducts(); }, [monthId]);

  // Global Paste (Ctrl+V) anywhere on the Products page
  useEffect(() => {
    function handleGlobalPaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setDroppedFile(file);
            setScannerOpen(true);
          }
          break;
        }
      }
    }
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  function handlePageDragOver(e) {
    e.preventDefault();
    setIsPageDragging(true);
  }

  function handlePageDragLeave(e) {
    e.preventDefault();
    if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
      setIsPageDragging(false);
    }
  }

  function handlePageDrop(e) {
    e.preventDefault();
    setIsPageDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setDroppedFile(file);
        setScannerOpen(true);
      }
    }
  }

  const cat = categories.find(c => c.key === activeCat) || categories[0];
  const items = products.filter(p => p.categoryKey === activeCat);

  if (!months.length) {
    return <EmptyMonth />;
  }
  if (!monthId) return null;

  return (
    <div
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
      className="space-y-4 relative min-h-[70vh]"
    >
      {/* Global Drag Drop Hint */}
      {isPageDragging && (
        <div className="fixed inset-0 z-40 bg-brand-600/80 backdrop-blur-sm flex flex-col items-center justify-center text-white border-4 border-dashed border-white m-4 rounded-3xl animate-pulse pointer-events-none">
          <span className="text-6xl mb-3">📥</span>
          <span className="text-2xl font-bold">Thả ảnh đơn hàng vào đây</span>
          <span className="text-sm opacity-90 mt-1">AI sẽ tự động đọc Tên SP, Số lượng và Giá mua ngay lập tức!</span>
        </div>
      )}

      {/* Action Bar with AI Scanner */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-white border border-slate-200 p-2.5 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">📦 Quản lý sản phẩm</span>
          <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">
            {products.length} tổng SP
          </span>
          <span className="hidden md:inline-block text-[11px] text-slate-400">
            (💡 Kéo thả ảnh hoặc bấm Ctrl+V vào trang để quét nhanh)
          </span>
        </div>
        <button
          onClick={() => { setDroppedFile(null); setScannerOpen(true); }}
          className="btn !bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 !text-white font-bold py-1.5 px-3.5 rounded-lg shadow hover:shadow-md flex items-center gap-1.5 text-xs transition-all"
        >
          <span className="text-base leading-none">📷</span> Quét ảnh đơn hàng (AI)
        </button>
      </div>

      {/* Category tabs */}
      <div className="overflow-x-auto pb-2 -mx-3 px-3 md:mx-0 md:px-0">
        <div className="flex gap-1.5 min-w-max px-3 md:px-0">
          {categories.map(c => {
            const count = products.filter(p => p.categoryKey === c.key).length;
            const active = c.key === activeCat;
            return (
              <button key={c.key} onClick={() => setActiveCat(c.key)}
                className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap font-medium border ${active
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-brand-50'}`}>
                {c.name} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {cat && (
        <ProductTable
          monthId={monthId}
          category={cat}
          items={items}
          loading={loading}
          onChanged={loadProducts}
          onRowChange={(id, nextData) => {
            setProducts(prev => prev.map(p => p._id === id ? { ...p, ...nextData } : p));
          }}
        />
      )}

      <AiBillScannerModal
        isOpen={scannerOpen}
        onClose={() => { setScannerOpen(false); setDroppedFile(null); }}
        monthId={monthId}
        currentCategoryKey={activeCat}
        onImportSuccess={loadProducts}
        initialImageFile={droppedFile}
      />
    </div>
  );
}

function EmptyMonth() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
      <div className="text-lg font-semibold mb-1">Chưa có tháng nào</div>
      <p className="text-sm text-slate-500 mb-4">
        Tạo tháng mới hoặc import từ file Excel / Google Sheet ở mục
        <a href="/dashboard/manage" className="text-brand-600 hover:underline"> Tháng / Nhập / Xuất</a>.
      </p>
    </div>
  );
}
