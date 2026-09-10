'use client';
import { useEffect, useState } from 'react';

const fmt = n => (n || n === 0) ? Number(n).toLocaleString('vi-VN') : '';
const fmtMoney = n => (n || n === 0) ? (Number(n) * 1000).toLocaleString('vi-VN') : '';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    fetch('/api/customers?t=' + Date.now())
      .then(r => r.json())
      .then(data => {
        setCustomers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span>👥</span> Thống kê Khách hàng
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Dữ liệu được trích xuất tự động từ cột "Diễn giải" của tất cả sản phẩm.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Sidebar: List of customers */}
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col h-[600px]">
            <input 
              type="text" 
              placeholder="Tìm khách hàng..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 mb-4"
            />
            
            {loading ? (
              <div className="text-center text-sm text-slate-500 py-10">Đang tải dữ liệu...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-10">Không tìm thấy khách hàng nào.</div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                {filtered.map((c, idx) => {
                  const isSelected = selectedCustomer?.name === c.name;
                  return (
                    <div 
                      key={idx}
                      onClick={() => setSelectedCustomer(c)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors flex justify-between items-center ${
                        isSelected ? 'bg-brand-50 border border-brand-200' : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <span className={`font-medium ${isSelected ? 'text-brand-700' : 'text-slate-700'}`}>
                        {c.name}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                        {fmtMoney(c.totalSpent)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Content: Customer Details */}
        <div className="w-full md:w-2/3">
          {selectedCustomer ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Khách hàng: <span className="text-brand-600">{selectedCustomer.name}</span></h2>
                  <p className="text-sm text-slate-500 mt-1">Đã mua tổng cộng {selectedCustomer.purchases.length} mã sản phẩm.</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Tổng chi tiêu</div>
                  <div className="text-2xl font-bold text-emerald-600">{fmtMoney(selectedCustomer.totalSpent)} ₫</div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 sticky top-0 shadow-sm">
                    <tr className="text-slate-600">
                      <th className="p-4 font-semibold w-1/3">Tên sản phẩm</th>
                      <th className="p-4 font-semibold w-1/6">Tháng</th>
                      <th className="p-4 font-semibold text-right w-1/6">SL</th>
                      <th className="p-4 font-semibold text-right w-1/6">Đơn giá</th>
                      <th className="p-4 font-semibold text-right w-1/6">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedCustomer.purchases.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-4 font-medium text-slate-800">{p.productName}</td>
                        <td className="p-4 text-slate-500">
                          {p.monthLabel}
                          {p.date && <div className="text-xs text-slate-400">Ngày: {p.date}</div>}
                        </td>
                        <td className="p-4 text-right font-medium text-slate-700">{fmt(p.qty)}</td>
                        <td className="p-4 text-right text-slate-600">{fmtMoney(p.price)}</td>
                        <td className="p-4 text-right font-semibold text-emerald-600">{fmtMoney(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-full min-h-[600px] flex flex-col items-center justify-center text-slate-400">
              <span className="text-5xl mb-4">👈</span>
              <p>Chọn một khách hàng ở danh sách bên trái để xem chi tiết.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
