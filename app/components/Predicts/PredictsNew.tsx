"use client";
import { useState } from 'react';

export default function PredictsNew({ onSuccess, onCancel }: { onSuccess?: () => void, onCancel?: () => void }) {
  const [form, setForm] = useState({
    content: '',
    proposed_at: new Date().toISOString().slice(0, 10),
    predictor: '', // 新增字段
    interval_start: '',
    interval_end: '',
    assoc_type: '',
    assoc_article_id: '',
    assoc_link: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!form.predictor || !form.content || !form.proposed_at || !form.interval_start || !form.interval_end) {
      setError('请填写所有必填项'); setLoading(false); return;
    }
    if (form.interval_end < form.interval_start) {
      setError('结束时间不能早于开始时间'); setLoading(false); return;
    }
    if (form.assoc_type === 'article' && !form.assoc_article_id) {
      setError('请选择关联文章'); setLoading(false); return;
    }
    if (form.assoc_type === 'link' && !form.assoc_link) {
      setError('请填写关联链接'); setLoading(false); return;
    }
    const res = await fetch('/api/predicts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        assoc_article_id: form.assoc_type === 'article' ? Number(form.assoc_article_id) : undefined,
        assoc_link: form.assoc_type === 'link' ? form.assoc_link : undefined,
      }),
    });
    if (res.ok) {
      if (onSuccess) onSuccess();
    } else {
      const data = await res.json();
      setError(data.error || '提交失败');
    }
    setLoading(false);
  };

  return (
    <form className="max-w-xl mx-auto" onSubmit={handleSubmit}>
      <h2 className="text-gray-600 text-xl font-bold mb-4">新建预测</h2>
      <div className="mb-3">
        <label className="text-gray-600 block mb-1 font-medium">预测者 *</label>
        <input type="text" name="predictor" className="text-gray-600 w-full border rounded p-2" value={form.predictor} onChange={handleChange} required />
      </div>
      <div className="mb-3">
        <label className="text-gray-600 block mb-1 font-medium">预测内容 *</label>
        <textarea name="content" className="text-gray-600 w-full border rounded p-2" rows={3} value={form.content} onChange={handleChange} required />
      </div>
      <div className="mb-3">
        <label className="text-gray-600 block mb-1 font-medium">预测提出时间 *</label>
        <input type="date" name="proposed_at" className="text-gray-600 w-full border rounded p-2" value={form.proposed_at} onChange={handleChange} required />
      </div>
      <div className="mb-3 flex gap-2">
        <div className="flex-1">
          <label className="text-gray-600 block mb-1 font-medium">区间开始 *</label>
          <input type="date" name="interval_start" className="text-gray-600 w-full border rounded p-2" value={form.interval_start} onChange={handleChange} required />
        </div>
        <div className="flex-1">
          <label className="text-gray-600 block mb-1 font-medium">区间结束 *</label>
          <input type="date" name="interval_end" className="text-gray-600 w-full border rounded p-2" value={form.interval_end} onChange={handleChange} required />
        </div>
      </div>
      <div className="mb-3">
        <label className="text-gray-600 block mb-1 font-medium">关联类型</label>
        <select name="assoc_type" className="text-gray-600 w-full border rounded p-2" value={form.assoc_type} onChange={handleChange}>
          <option value="">无</option>
          <option value="article">文章</option>
          <option value="link">链接</option>
        </select>
      </div>
      {form.assoc_type === 'article' && (
        <div className="mb-3">
          <label className="text-gray-900 block mb-1 font-medium">关联文章ID *</label>
          <input type="number" name="assoc_article_id" className="text-gray-900 w-full border rounded p-2" value={form.assoc_article_id} onChange={handleChange} required />
        </div>
      )}
      {form.assoc_type === 'link' && (
        <div className="mb-3">
          <label className="text-gray-900 block mb-1 font-medium">关联链接 *</label>
          <input type="url" name="assoc_link" className="text-gray-900 w-full border rounded p-2" value={form.assoc_link} onChange={handleChange} required />
        </div>
      )}
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div className="flex gap-2 justify-center">
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" disabled={loading}>{loading ? '提交中...' : '提交'}</button>
        <button type="button" className="ml-2 bg-gray-300 text-gray-900 px-4 py-2 rounded hover:bg-gray-400" onClick={onCancel} disabled={loading}>取消</button>
      </div>
    </form>
  );
}
