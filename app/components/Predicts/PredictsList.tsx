"use client";
import { useState, useEffect } from "react";
import PredictsNew from "./PredictsNew";
import PredictDetail from "./PredictDetail";
import type { info__predict } from '@/types'

function statusBadge(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    implemented: { label: "实现", color: "green" },
    not_implemented: { label: "无实现", color: "red" },
    partial: { label: "部分实现", color: "yellow" },
    not_due: { label: "未到时间", color: "gray" },
    delayed: { label: "延期", color: "orange" },
  };
  const { label, color } = map[status] || { label: status, color: "gray" };
  return <span className={`px-2 py-1 rounded text-xs bg-${color}-100 text-${color}-800`}>{label}</span>;
}

export default function PredictsList() {
  const [predicts, setPredicts] = useState<info__predict[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [detailId, setDetailId] = useState<String | null>(null);

  const fetchPredicts = async () => {
    setLoading(true);
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const res = await fetch(`/api/predicts?month=${month}`);
    if (res.ok) {
      setPredicts(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPredicts();
  }, []);
  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={() => setShowNew(true)}>
          新增预测
        </button>
      </div>
      {loading ? (
        <div className="text-gray-400">加载中...</div>
      ) : predicts.length === 0 ? (
        <div className="text-gray-500">本月暂无预测</div>
      ) : (
        predicts.map((p) => (
          <div key={p.id} className="border rounded p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex-1">
              <div className="text-gray-900 font-medium mb-1 line-clamp-2">
                {p.predictor}: {p.content}</div>
              <div className="text-sm text-gray-500 mb-1">
                区间：{new Date(p.interval_start).toISOString().slice(0, 10)} — {new Date(p.interval_end).toISOString().slice(0, 10)}
              </div>
              <div className="text-sm text-gray-500 mb-1">
                提出时间：{new Date(p.proposed_at).toISOString().slice(0, 16).replace("T", " ")}
              </div>
              <div className="text-sm text-gray-500">
                关联：
                {p.assoc_type === "article" && (p as any).summary__article ? (
                  <span className="text-blue-600 hover:underline cursor-pointer" onClick={() => window.open(`/articles/${p.assoc_article_id}`)}>{(p as any).summary__article.title}</span>
                ) : p.assoc_type === "link" && p.assoc_link ? (
                  <a href={p.assoc_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">链接</a>
                ) : (
                  <span className="text-gray-400">无</span>
                )}
              </div>
            </div>
            <div className="text-gray-900 flex flex-col items-end gap-2 min-w-[120px]">
              {statusBadge(p.verify_status)}
              <button className="text-blue-600 hover:underline text-xs" onClick={() => setDetailId(String(p.id))}>查看详情</button>
            </div>
          </div>
        ))
      )}
      {/* 新建弹窗 */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[400px] max-w-[90vw]">
            <PredictsNew onSuccess={() => { setShowNew(false); fetchPredicts(); }} onCancel={() => setShowNew(false)} />
          </div>
        </div>
      )}
      {/* 详情弹窗 */}
      {detailId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[400px] max-w-[90vw]">
            <PredictDetail id={detailId} />
            <button className="mt-4 w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => setDetailId(null)}>关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}
