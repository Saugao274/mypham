'use client';
import { useEffect, useState } from 'react';
import { useCurrentMonth } from '@/lib/useCurrentMonth';

export default function ContentGeneratorPage() {
  const { monthId, reload } = useCurrentMonth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  const [theme, setTheme] = useState('Gợi ý quà tặng 20/10');
  const [tone, setTone] = useState('Hấp dẫn, thân thiện, nhiều emoji');
  const [referenceData, setReferenceData] = useState('');
  
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestedImages, setSuggestedImages] = useState([]);

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    if (!monthId) return;
    setLoading(true);
    fetch(`/api/products?monthId=${monthId}&t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        const inStock = (Array.isArray(data) ? data : []).filter(p => (p.slCon || 0) > 0);
        setProducts(inStock);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [monthId]);

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleGenerate = async () => {
    if (selectedIds.size === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm để lên bài!');
      return;
    }
    
    const selectedProducts = products.filter(p => selectedIds.has(p._id));
    setIsGenerating(true);
    setGeneratedContent('');
    setSuggestedImages([]);
    
    try {
      const res = await fetch('/api/ai/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: selectedProducts, theme, tone, referenceData })
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedContent(data.content);
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (err) {
      alert('Lỗi kết nối AI!');
    } finally {
      setIsGenerating(false);
    }
  };

  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleSuggest = async () => {
    if (!products.length) return;
    setIsSuggesting(true);
    try {
      const res = await fetch('/api/ai/suggest-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products, theme })
      });
      const data = await res.json();
      if (res.ok && data.ids) {
        setSelectedIds(new Set(data.ids));
      } else {
        alert('Lỗi: ' + (data.error || 'Không thể gợi ý'));
      }
    } catch (err) {
      alert('Lỗi kết nối AI!');
    } finally {
      setIsSuggesting(false);
    }
  };

  const [isLookingUp, setIsLookingUp] = useState(false);
  const handleLookupInfo = async () => {
    if (selectedIds.size === 0) return alert('Vui lòng chọn ít nhất 1 sản phẩm để tra cứu!');
    setIsLookingUp(true);
    
    try {
      const names = [];
      for (const id of selectedIds) {
        const p = products.find(x => x._id === id);
        if (p) names.push(p.ten);
      }
      
      const res = await fetch('/api/ai/product-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productNames: names })
      });
      const data = await res.json();
      
      if (res.ok && data.info) {
        setReferenceData(prev => (prev ? prev + '\n\n' + data.info : data.info));
        alert('Đã lấy xong công dụng các sản phẩm!');
      } else {
        alert('Lỗi: ' + (data.error || 'Tra cứu thất bại'));
      }
    } catch (err) {
      alert('Lỗi khi tra cứu thông tin!');
    } finally {
      setIsLookingUp(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent);
    alert('Đã copy bài viết!');
  };

  if (!monthId) return <div className="p-8 text-center">Vui lòng chọn tháng hoạt động trước.</div>;

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[70vh]">
      {/* Cột trái: Chọn sản phẩm */}
      <div className="w-full md:w-1/3 bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[80vh]">
        <h2 className="text-lg font-bold text-slate-800 mb-2">1. Chọn sản phẩm</h2>
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs text-slate-500">Các sản phẩm đang còn trong kho</p>
          <button 
            onClick={handleSuggest}
            disabled={isSuggesting || !products.length}
            className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-1 rounded hover:bg-indigo-100 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {isSuggesting ? 'Đang nghĩ...' : '🤖 AI gợi ý SP'}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-100 rounded-lg p-2 space-y-2">
          {loading ? (
            <div className="text-sm text-center text-slate-400 py-4">Đang tải...</div>
          ) : products.length === 0 ? (
            <div className="text-sm text-center text-slate-400 py-4">Không có SP tồn kho</div>
          ) : (
            products.map(p => (
              <div 
                key={p._id}
                onClick={() => toggleSelect(p._id)}
                className={`p-2 rounded-md border text-sm cursor-pointer transition-all flex justify-between items-center ${
                  selectedIds.has(p._id) ? 'bg-brand-50 border-brand-500 text-brand-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="font-medium truncate pr-2">{p.ten}</div>
                <div className="text-xs shrink-0 bg-white px-2 py-0.5 rounded-full border">Còn {p.slCon}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cột phải: Cấu hình AI & Kết quả */}
      <div className="w-full md:w-2/3 bg-white border border-slate-200 rounded-xl p-6 flex flex-col h-[80vh]">
        <h2 className="text-lg font-bold text-slate-800 mb-4">2. Viết bài với AI 🤖</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Chủ đề bài đăng</label>
            <input 
              type="text" 
              value={theme}
              onChange={e => setTheme(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="VD: Quà 20/10, Sale cuối tháng..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Văn phong</label>
            <input 
              type="text" 
              value={tone}
              onChange={e => setTone(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Hài hước, chuyên gia, thả thính..."
            />
          </div>
        </div>

        <div className="mb-4 relative">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-semibold text-slate-600">
              Nội dung tham khảo (Copy/Paste hoặc dùng AI tìm kiếm)
            </label>
            <button 
              onClick={handleLookupInfo}
              disabled={isLookingUp || selectedIds.size === 0}
              className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-1 rounded hover:bg-emerald-100 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isLookingUp ? 'Đang tra cứu...' : '🔍 Dùng AI tra cứu công dụng'}
            </button>
          </div>
          <textarea
            value={referenceData}
            onChange={e => setReferenceData(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none custom-scrollbar"
            rows="4"
            placeholder="Bạn có thể copy thông tin từ hãng dán vào đây, HOẶC bấm nút 'Dùng AI tra cứu' ở trên để tự động lấy công dụng của các SP đã chọn bên trái..."
          ></textarea>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={isGenerating || selectedIds.size === 0}
          className="w-full py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 mb-6 flex justify-center items-center gap-2"
        >
          {isGenerating ? (
            <span className="animate-pulse">Đang viết bài & tư vấn... ✍️</span>
          ) : (
            <>Tạo Bài Đăng Kèm Tư Vấn ✨</>
          )}
        </button>

        {/* Kết quả content */}
        <div className="flex-1 flex flex-col relative">
          <label className="block text-sm font-bold text-slate-700 mb-2">3. Kết quả bài viết & Hình ảnh</label>
          <textarea 
            className="flex-1 w-full border border-slate-300 rounded-lg p-4 text-sm resize-none focus:outline-brand-500 custom-scrollbar bg-slate-50 min-h-[300px]"
            value={generatedContent}
            onChange={e => setGeneratedContent(e.target.value)}
            placeholder="Nội dung bài viết sẽ xuất hiện ở đây..."
          ></textarea>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-3 gap-3">
            <div className="flex flex-wrap gap-2 flex-1 max-h-28 overflow-y-auto custom-scrollbar pr-2">
              {Array.from(selectedIds).map(id => {
                const p = products.find(x => x._id === id);
                if (!p) return null;
                return (
                  <a
                    key={id}
                    href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(p.ten)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-100 flex items-center gap-1 font-medium whitespace-nowrap"
                    title={`Tìm ảnh cho ${p.ten}`}
                  >
                    🔍 {p.ten.length > 15 ? p.ten.substring(0, 15) + '...' : p.ten}
                  </a>
                );
              })}
            </div>
            
            <button 
              onClick={copyToClipboard}
              className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors shrink-0"
            >
              📋 Copy Bài
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
