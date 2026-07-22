'use client';
import { useEffect, useState } from 'react';
import { useCurrentMonth } from '@/lib/useCurrentMonth';
import ProductTable from '@/components/ProductTable';

export default function ProductsPage() {
  const { monthId, months, reload } = useCurrentMonth();
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

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
      const res = await fetch(`/api/products?monthId=${monthId}`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }
  useEffect(() => { loadProducts(); }, [monthId]);

  const cat = categories.find(c => c.key === activeCat) || categories[0];
  const items = products.filter(p => p.categoryKey === activeCat);

  if (!months.length) {
    return <EmptyMonth />;
  }
  if (!monthId) return null;

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="scroll-x">
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
        />
      )}
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
