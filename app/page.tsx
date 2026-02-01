"use client";

import { useEffect, useState } from "react";
import IndustryAnalysis from "./components/IndustryAnalysis";
import TweetAnalysis from "./components/TweetAnalysis";
import ArticleAnalysis from "./components/ArticleAnalysis";
import PredictsList from "./components/Predicts/PredictsList";

type ArticleProcessResult = {
  title: string;
  status: string;
  source_url: string;
};
type TabType = 'industry' | 'tweet' | 'article' | 'predicts';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('tweet');
  const [articleResults, setArticleResults] = useState<ArticleProcessResult[]>([]);
  const [showArticlePopup, setShowArticlePopup] = useState(false);
  useEffect(() => {
    console.log('Setting up spider event listener');
    const handler = async (e: Event) => {
      console.log('spider event received:', e);
      const detail = (e as CustomEvent).detail;
      setShowArticlePopup(true);
      // Set initial status to '处理中...'
      const initialResults: ArticleProcessResult[] = detail.records.map((rec: any) => ({
        title: rec.title || '无标题',
        status: '处理中...',
        source_url: rec.source_url,
      }));
      setArticleResults((preResults) => {
        return preResults.concat(initialResults);
      });
      try {
        const response = await fetch('/api/process-articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articles: detail.records }),
        });
        const result = await response.json();
        console.log('Article processing result:', result);
        initialResults.forEach((item) => {
          item.status = '处理失败';
        });
        const successfulSourceUrls = result.successfulSourceUrls || [];
        const existingSourceUrls = result.existingSourceUrls || [];
        initialResults.forEach((item) => {
          if (successfulSourceUrls.includes(item.source_url)) {
            item.status = '处理完成';
          } else if (existingSourceUrls.includes(item.source_url)) {
            item.status = '已存在，无需处理';
          }
        });
      } catch (err) {
        initialResults.forEach((item) => {
          item.status = '处理失败';
        });
      }
      setArticleResults((preResults) => [...preResults]);
    };
    document.addEventListener('STORE_ARTICLE', handler);
    return () => document.removeEventListener('STORE_ARTICLE', handler);
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 弹窗：文章处理结果 */}
      {showArticlePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[500px] max-w-[90vw]">
            <h2 className="text-slate-600 text-lg font-bold mb-4">文章处理结果</h2>
            <ul className="mb-4 max-h-60 overflow-y-auto">
              {articleResults.map((item, idx) => (
                <li key={idx} className="flex justify-between items-center py-1 border-b last:border-b-0">
                  <span className="text-slate-600 max-w-[400px]" title={item.title}>{item.title}</span>
                  <span className={
                    item.status === '处理完成'
                      ? 'text-green-600'
                      : item.status === '处理失败'
                        ? 'text-red-600'
                        : 'text-gray-500'
                  }>{item.status}</span>
                </li>
              ))}
            </ul>
            <button
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              onClick={() => setShowArticlePopup(false)}
            >
              确定
            </button>
          </div>
        </div>
      )}

      {/* 标签页导航 */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-lg sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex px-6">
            {([
              { id: 'industry' as const, icon: '🏢', label: '行业分析' },
              { id: 'tweet' as const, icon: '💬', label: '推文分析' },
              { id: 'article' as const, icon: '📄', label: '文章分析' },
              { id: 'predicts' as const, icon: '📈', label: '预测记录' }
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium transition-all relative ${activeTab === tab.id
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <span className="relative z-10">{tab.icon} {tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div>
        {([
          { id: 'industry' as const, component: IndustryAnalysis },
          { id: 'tweet' as const, component: TweetAnalysis },
          { id: 'article' as const, component: ArticleAnalysis },
          { id: 'predicts' as const, component: PredictsList }
        ]).map(({ id, component: Component }) => (
          activeTab === id && <Component key={id} />
        ))}
      </div>
    </div>
  );
}
