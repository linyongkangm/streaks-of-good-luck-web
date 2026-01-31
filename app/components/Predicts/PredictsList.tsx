"use client";
import { useState, useEffect } from "react";
import PredictsNew from "./PredictsNew";
import type { info__predict } from '@/types'

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    implemented: { label: "✓ 实现", className: "bg-green-100 text-green-800" },
    not_implemented: { label: "✗ 无实现", className: "bg-red-100 text-red-800" },
    partial: { label: "⚡ 部分实现", className: "bg-yellow-100 text-yellow-800" },
    not_due: { label: "⏳ 未到时间", className: "bg-gray-100 text-gray-700" },
    delayed: { label: "⏰ 延期", className: "bg-orange-100 text-orange-800" },
  };
  const { label, className } = map[status] || { label: status, className: "bg-gray-100 text-gray-700" };
  return <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${className}`}>{label}</span>;
}

export default function PredictsList() {
  const [predicts, setPredicts] = useState<info__predict[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [detailId, setDetailId] = useState<String | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [yearStats, setYearStats] = useState<Record<number, number>>({});
  const [monthStats, setMonthStats] = useState<Record<string, number>>({});

  const fetchPredicts = async () => {
    setLoading(true);
    const month = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
    const res = await fetch(`/api/predicts?month=${month}`);
    if (res.ok) {
      setPredicts(await res.json());
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const res = await fetch('/api/predictions/stats');
    if (res.ok) {
      const data = await res.json();
      setYearStats(data.years);
      setMonthStats(data.months);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchPredicts();
  }, [selectedYear, selectedMonth]);
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">📊 预测管理</h1>
          <div className="flex items-center gap-2">
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {Object.keys(yearStats).sort((a, b) => Number(b) - Number(a)).map(year => (
                <option key={year} value={year}>
                  {year}年 ({yearStats[Number(year)]})
                </option>
              ))}
            </select>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                const monthKey = `${selectedYear}-${String(month).padStart(2, '0')}`;
                const count = monthStats[monthKey] || 0;
                return (
                  <option key={month} value={month}>
                    {month}月 ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <button 
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-medium flex items-center gap-2 whitespace-nowrap"
          onClick={() => setShowNew(true)}
        >
          <span className="text-lg">+</span>
          新增预测
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : predicts.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-600 text-lg font-medium mb-2">{selectedYear}年{selectedMonth}月暂无预测</p>
          <p className="text-gray-500 text-sm">点击右上角按钮创建第一个预测</p>
        </div>
      ) : (
        <div className="space-y-4">
          {predicts.map((p) => (
            <div 
              key={p.id} 
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-200 group"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="flex-1 space-y-3">
                  {/* 预测者和内容 */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-600 mb-1 font-medium">{p.predictor || '未知'}</div>
                      <div className="text-gray-900 font-medium text-base leading-relaxed">{p.content}</div>
                    </div>
                  </div>

                  {/* 时间信息 */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="text-blue-500">📅</span>
                      <span className="text-gray-500">区间:</span>
                      <span className="font-medium">
                        {new Date(p.interval_start).toISOString().slice(0, 10)}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium">
                        {new Date(p.interval_end).toISOString().slice(0, 10)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="text-green-500">🕐</span>
                      <span className="text-gray-500">提出:</span>
                      <span className="font-medium">
                        {new Date(p.proposed_at).toISOString().slice(0, 16).replace("T", " ")}
                      </span>
                    </div>
                  </div>

                  {/* 关联信息 */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-purple-500">🔗</span>
                    <span className="text-gray-500">关联:</span>
                    {p.assoc_type === "article" && (p as any).summary__article ? (
                      <button
                        className="text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center gap-1"
                        onClick={() => window.open(`/articles/${p.assoc_article_id}`)}
                      >
                        {(p as any).summary__article.title}
                        <span className="text-xs">↗</span>
                      </button>
                    ) : p.assoc_type === "link" && p.assoc_link ? (
                      <a 
                        href={p.assoc_link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center gap-1"
                      >
                        外部链接
                        <span className="text-xs">↗</span>
                      </a>
                    ) : (
                      <span className="text-gray-400">无</span>
                    )}
                  </div>
                </div>

                {/* 右侧状态和操作 */}
                <div className="flex lg:flex-col items-center lg:items-end gap-3 lg:min-w-[140px]">
                  {statusBadge(p.verify_status)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* 新建弹窗 */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slideUp">
            <PredictsNew 
              onSuccess={() => { setShowNew(false); fetchPredicts(); }} 
              onCancel={() => setShowNew(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
