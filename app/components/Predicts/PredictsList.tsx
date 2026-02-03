"use client";
import { useState, useEffect } from "react";
import PredictsNew from "./PredictsNew";
import type { PredictDetail, ObservationDetail } from '@/types'
import * as tools from '@/app/tools'
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
  const [predicts, setPredicts] = useState<PredictDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [yearStats, setYearStats] = useState<Record<number, number>>({});
  const [monthStats, setMonthStats] = useState<Record<string, number>>({});
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [delayedNote, setDelayedNote] = useState('');
  const [expandedPredict, setExpandedPredict] = useState<string | null>(null);
  const [observations, setObservations] = useState<Record<string, ObservationDetail[]>>({});
  const [showObservationForm, setShowObservationForm] = useState<string | null>(null);
  const [newObservation, setNewObservation] = useState({ observation_date: '', content: '' });

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

  const handleStatusChange = async (predictId: bigint, newStatus: string) => {
    if (newStatus === 'delayed') {
      setEditingStatus(String(predictId));
      setDelayedNote('');
      return;
    }

    try {
      const res = await fetch(`/api/predicts/${predictId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verify_status: newStatus }),
      });

      if (res.ok) {
        fetchPredicts();
      } else {
        const error = await res.json();
        alert(error.error || '更新失败');
      }
    } catch (error) {
      alert('更新失败');
    }
  };

  const handleDelayedSubmit = async (predictId: bigint) => {
    if (!delayedNote.trim()) {
      alert('请填写延期说明');
      return;
    }

    try {
      const res = await fetch(`/api/predicts/${predictId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verify_status: 'delayed',
          delayed_note: delayedNote,
        }),
      });

      if (res.ok) {
        setEditingStatus(null);
        setDelayedNote('');
        fetchPredicts();
      } else {
        const error = await res.json();
        alert(error.error || '更新失败');
      }
    } catch (error) {
      alert('更新失败');
    }
  };

  const fetchObservations = async (predictId: bigint) => {
    try {
      const res = await fetch(`/api/predicts/${predictId}/observations`);
      if (res.ok) {
        const data = await res.json();
        setObservations(prev => ({ ...prev, [String(predictId)]: data }));
      }
    } catch (error) {
      console.error('获取观察记录失败:', error);
    }
  };

  const handleToggleExpand = async (predictId: bigint) => {
    const predictIdStr = String(predictId);
    if (expandedPredict === predictIdStr) {
      setExpandedPredict(null);
    } else {
      setExpandedPredict(predictIdStr);
      if (!observations[predictIdStr]) {
        await fetchObservations(predictId);
      }
    }
  };

  const handleCreateObservation = async (predictId: bigint) => {
    if (!newObservation.observation_date || !newObservation.content.trim()) {
      alert('请填写完整的观察记录');
      return;
    }

    try {
      const res = await fetch(`/api/predicts/${predictId}/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newObservation),
      });

      if (res.ok) {
        setShowObservationForm(null);
        setNewObservation({ observation_date: '', content: '' });
        await fetchObservations(predictId);
      } else {
        const error = await res.json();
        alert(error.error || '创建失败');
      }
    } catch (error) {
      alert('创建失败');
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
            <button
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white-700 px-3 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-medium flex items-center gap-2 whitespace-nowrap"
              onClick={() => setShowNew(true)}
            >
              <span className="text-lg">+</span>
              新增预测
            </button>
          </div>
        </div>

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
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all duration-200 group"
            >
              <div className="px-6 py-2">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="flex-1">
                  {/* 预测者和内容 */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-600 mb-1 font-medium">{p.predictor || '未知'}</div>
                      <div className="text-gray-600 font-medium text-base leading-relaxed">{p.content}</div>
                    </div>
                  </div>

                  {/* 时间信息 */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="text-blue-500">📅</span>
                      <span className="text-gray-500">区间:</span>
                      <span className="font-medium">
                        {tools.toUTC(p.interval_start).toFormat(tools.DATE_FORMAT)}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium">
                        {tools.toUTC(p.interval_end).toFormat(tools.DATE_FORMAT)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="text-green-500">🕐</span>
                      <span className="text-gray-500">提出:</span>
                      <span className="font-medium">
                        {tools.toUTC(p.proposed_at).toFormat(tools.DATE_FORMAT)}
                      </span>
                    </div>
                    {/* 关联信息 */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-purple-500">🔗</span>
                      <span className="text-gray-500">关联:</span>
                      {p.assoc_type === "article" && p.summary__article ? (
                        <button
                          className="text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center gap-1"
                          onClick={() => window.open(p?.summary__article?.source_url, '_blank')}
                        >
                          {p.summary__article.title}
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


                </div>

                {/* 右侧状态和操作 */}
                <div className="flex lg:flex-col items-center lg:items-end gap-3 lg:min-w-[220px]">
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => handleToggleExpand(p.id)}
                      className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                    >
                      {expandedPredict === String(p.id) ? '收起' : '展开'}
                      <span className="text-xs">{expandedPredict === String(p.id) ? '▲' : '▼'}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowObservationForm(String(p.id));
                        setNewObservation({ 
                          observation_date: new Date().toISOString().slice(0, 16), 
                          content: '' 
                        });
                      }}
                      className="flex-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                    >
                      记录
                    </button>
                  </div>
                  {editingStatus === String(p.id) ? (
                    <div className="flex flex-col gap-2 w-full">
                      <textarea
                        value={delayedNote}
                        onChange={(e) => setDelayedNote(e.target.value)}
                        placeholder="请填写延期说明..."
                        className="text-gray-500 w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelayedSubmit(p.id)}
                          className="flex-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 transition-colors"
                        >
                          确认
                        </button>
                        <button
                          onClick={() => setEditingStatus(null)}
                          className="flex-1 px-3 py-1.5 bg-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-400 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 w-full">
                      <select
                        value={p.verify_status}
                        onChange={(e) => handleStatusChange(p.id, e.target.value)}
                        className="text-gray-500 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer hover:border-blue-400"
                      >
                        <option value="not_due">⏳ 未到时间</option>
                        <option value="implemented">✓ 实现</option>
                        <option value="not_implemented">✗ 无实现</option>
                        <option value="partial">⚡ 部分实现</option>
                        <option value="delayed">⏰ 延期</option>
                      </select>
                      {p.verify_status === 'delayed' && p.delayed_note && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-gray-700">
                          <div className="font-medium text-orange-800 mb-1">延期说明：</div>
                          <div className="text-gray-600">{p.delayed_note}</div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
              </div>

              {/* 观察记录区域 */}
              {expandedPredict === String(p.id) && (
                <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                  <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <span className="text-purple-500">📋</span>
                    观察记录
                    {observations[String(p.id)] && observations[String(p.id)].length > 0 && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        {observations[String(p.id)].length}
                      </span>
                    )}
                  </div>
                  
                  {/* 创建观察记录表单 */}
                  {showObservationForm === String(p.id) && (
                    <div className="bg-white border border-green-200 rounded-lg p-4 mb-4 shadow-sm">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            记录时间
                          </label>
                          <input
                            type="date"
                            value={newObservation.observation_date}
                            onChange={(e) => setNewObservation(prev => ({ ...prev, observation_date: e.target.value }))}
                            className="text-gray-700 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            记录内容
                          </label>
                          <textarea
                            value={newObservation.content}
                            onChange={(e) => setNewObservation(prev => ({ ...prev, content: e.target.value }))}
                            placeholder="请输入观察内容..."
                            className="text-gray-700 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                            rows={4}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCreateObservation(p.id)}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                          >
                            提交记录
                          </button>
                          <button
                            onClick={() => setShowObservationForm(null)}
                            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-400 transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 观察记录列表 */}
                  {observations[String(p.id)] && observations[String(p.id)].length > 0 ? (
                    <div className="space-y-3">
                      {observations[String(p.id)].map((obs) => (
                        <div
                          key={obs.id}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="text-blue-500">🕐</span>
                              <span className="font-medium">
                                {tools.toUTC(obs.observation_date).toFormat('yyyy-MM-dd')}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {obs.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      暂无观察记录
                    </div>
                  )}
                </div>
              )}
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
