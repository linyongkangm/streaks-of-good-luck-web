"use client";
import { useState, useEffect } from "react";
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { type PredictDetail } from '@/types';

async function fetchPredict(id: String) {
  const res = await fetch(`/api/predicts/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export default function PredictDetail({ id }: { id: String }) {
  const [predict, setPredict] = useState<PredictDetail | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetchPredict(id).then(data => {
      setPredict(data);
      setLoading(false);
    });
  }, [id]);
  console.log(id, predict);
  if (loading) return <div>Loading...</div>;
  if (!predict) return notFound();
  return (
    <div className="bg-white rounded shadow p-6">
      <h2 className="text-slate-600 text-xl font-bold mb-2">预测详情</h2>
      <div className="text-slate-600 mb-2"><span className="font-semibold">内容：</span>{predict.content}</div>
      <div className="text-slate-600 mb-2"><span className="font-semibold">提出时间：</span>{new Date(predict.proposed_at).toISOString().slice(0, 16).replace('T', ' ')}</div>
      <div className="text-slate-600 mb-2"><span className="font-semibold">区间：</span>{new Date(predict.interval_start).toISOString().slice(0, 10)} — {new Date(predict.interval_end).toISOString().slice(0, 10)}</div>
      <div className="text-slate-600 mb-2"><span className="font-semibold">验证状态：</span>{predict.verify_status}</div>
      {predict.verify_status === 'delayed' && predict.delayed_note && (
        <div className="text-slate-600 mb-2"><span className="font-semibold">延期备注：</span>{predict.delayed_note}</div>
      )}
      <div className="text-slate-600 mb-2"><span className="font-semibold">关联：</span>
        {predict.assoc_type === 'article' && predict.summary__article ? (
          <Link href={`/articles/${predict.assoc_article_id}`} className="text-blue-600 hover:underline">{predict.summary__article.title}</Link>
        ) : predict.assoc_type === 'link' && predict.assoc_link ? (
          <a href={predict.assoc_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">链接</a>
        ) : (
          <span className="text-gray-400">无</span>
        )}
      </div>
    </div>
  );
}
