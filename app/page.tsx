"use client";

import { useState } from "react";
import IndustryAnalysis from "./components/IndustryAnalysis/IndustryAnalysis";
import TweetAnalysis from "./components/TweetAnalysis";
import ArticleAnalysis from "./components/ArticleAnalysis";
import PredictsList from "./components/Predicts/PredictsList";
import SecuritiesMetadata from "./components/SecuritiesMetadata/SecuritiesMetadata";
import useStoreArticle from "@/app/hooks/useStoreArticle";
import useExternalEvent from "@/app/hooks/useExternalEvent";

type TabType = 'industry' | 'tweet' | 'article' | 'predicts' | 'securities';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('tweet');
  const { articleResults, showArticlePopup, setShowArticlePopup, saveArticleDirectly, retryArticle } = useStoreArticle();
  useExternalEvent();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 标签页导航 */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-lg sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex px-6">
            {([
              { id: 'industry' as const, icon: '🏢', label: '行业分析' },
              { id: 'tweet' as const, icon: '💬', label: '推文分析' },
              { id: 'article' as const, icon: '📄', label: '文章分析' },
              { id: 'predicts' as const, icon: '📈', label: '预测记录' },
              { id: 'securities' as const, icon: '💼', label: '证券元数据' }
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
          { id: 'predicts' as const, component: PredictsList },
          { id: 'securities' as const, component: SecuritiesMetadata }
        ]).map(({ id, component: Component }) => (
          activeTab === id && <Component key={id} />
        ))}
      </div>

      {/* 弹窗：文章处理结果 */}
      {showArticlePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[500px] max-w-[90vw]">
            <h2 className="text-slate-600 text-lg font-bold mb-4">文章处理结果</h2>
            <ul className="mb-4 max-h-60 overflow-y-auto">
              {articleResults.map((item, idx) => (
                <li key={idx} className="flex justify-between items-center py-2 border-b last:border-b-0 gap-2">
                  <a className="text-slate-600 max-w-[300px] hover:underline flex-shrink truncate" title={item.title} href={item.source_url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={
                      item.status === '处理完成' || item.status === '直接保存成功'
                        ? 'text-green-600'
                        : item.status === '处理失败'
                          ? 'text-red-600'
                          : 'text-gray-500'
                    }>{item.status}</span>
                    {item.status === '处理失败' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveArticleDirectly(item)}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                          title="不生成摘要，直接保存原文"
                        >
                          直接保存
                        </button>
                        <button
                          onClick={() => retryArticle(item)}
                          className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition"
                          title="重新尝试处理"
                        >
                          重试
                        </button>
                      </div>
                    )}
                  </div>
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
    </div>
  );
}
