'use client';
import { useEffect, useState } from 'react';
import { useCurrentMonth } from '@/lib/useCurrentMonth';

export default function HistoryPage() {
  const { monthId, months } = useCurrentMonth();
  const [selectedMonth, setSelectedMonth] = useState(monthId || 'all');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (monthId && selectedMonth === 'all') {
      setSelectedMonth(monthId);
    }
  }, [monthId]);

  async function loadLogs() {
    setLoading(true);
    try {
      const q = selectedMonth && selectedMonth !== 'all' ? `?monthId=${selectedMonth}` : '';
      const res = await fetch(`/api/history${q}`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [selectedMonth]);

  async function handleClearHistory() {
    if (!confirm('Bạn có chắc chắn muốn xoá toàn bộ lịch sử chỉnh sửa? Thao tác này không thể hoàn tác.')) return;
    await fetch('/api/history', { method: 'DELETE' });
    loadLogs();
  }

  const actionMeta = {
    CREATE_PRODUCT: { label: 'Thêm sản phẩm', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '➕' },
    UPDATE_PRODUCT: { label: 'Sửa sản phẩm', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '✏️' },
    DELETE_PRODUCT: { label: 'Xoá sản phẩm', color: 'bg-red-50 text-red-700 border-red-200', icon: '🗑️' },
    CREATE_DEBT: { label: 'Thêm nợ', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '💳' },
    UPDATE_DEBT: { label: 'Sửa nợ', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: '📝' },
    DELETE_DEBT: { label: 'Xoá nợ', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: '🗑️' },
    SCAN_BILL: { label: 'Quét ảnh AI', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '📷' },
    CARRY_OVER: { label: 'Kết chuyển', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: '🔄' },
    OTHER: { label: 'Hoạt động', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: '📌' },
  };

  const filteredLogs = logs.filter(l => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (l.targetName && l.targetName.toLowerCase().includes(s)) ||
      (l.details && l.details.toLowerCase().includes(s))
    );
  });

  function formatTime(dateStr) {
    if (!dateStr) return '';
    if (!mounted) return '...';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước (${timeStr})`;
    if (diffHours < 24 && d.getDate() === now.getDate()) return `Hôm nay ${timeStr}`;
    if (diffDays === 1) return `Hôm qua ${timeStr}`;
    return `${dateFormatted} lúc ${timeStr}`;
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>🕒</span> Lịch sử chỉnh sửa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Xem lại tất cả các hoạt động thêm, sửa, xoá sản phẩm và nợ của bạn và mẹ
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white font-medium"
          >
            <option value="all">Tất cả các tháng</option>
            {months.map(m => (
              <option key={m._id} value={m._id}>{m.label}</option>
            ))}
          </select>

          <button
            onClick={loadLogs}
            className="btn-ghost text-xs py-1.5 px-3 border border-slate-200"
            title="Tải lại lịch sử"
          >
            🔄 Làm mới
          </button>

          {logs.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-xs text-slate-400 hover:text-red-600 px-2 py-1"
              title="Xoá nhật ký"
            >
              Xoá lịch sử
            </button>
          )}
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-2">
        <span className="text-slate-400">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm kiếm theo tên sản phẩm, khách nợ hoặc nội dung sửa đổi..."
          className="w-full text-xs outline-none bg-transparent"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
        )}
      </div>

      {/* Log list */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            ⏳ Đang tải lịch sử...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <div className="text-3xl">📭</div>
            <p className="text-sm font-medium">Chưa có lịch sử hoạt động nào</p>
            <p className="text-xs text-slate-400">
              Mọi thay đổi khi thêm, sửa, xoá sản phẩm sẽ tự động xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const meta = actionMeta[log.action] || actionMeta.OTHER;
              return (
                <div key={log._id} className="p-3.5 md:p-4 hover:bg-slate-50/70 transition-colors flex items-start gap-3">
                  <div className="text-xl shrink-0 mt-0.5">{meta.icon}</div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>
                        {meta.label}
                      </span>
                      {log.targetName && (
                        <span className="font-bold text-slate-800 text-sm truncate max-w-md">
                          {log.targetName}
                        </span>
                      )}
                      {log.monthId?.label && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          📅 {log.monthId.label}
                        </span>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-xs text-slate-600 bg-slate-50/80 rounded-lg p-2 border border-slate-100">
                        {log.details}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {formatTime(log.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
