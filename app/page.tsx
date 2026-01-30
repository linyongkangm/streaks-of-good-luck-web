"use client";

import { useEffect, useState } from "react";
import IndustryAnalysis from "./components/IndustryAnalysis";
import TweetAnalysis from "./components/TweetAnalysis";
import ArticleAnalysis from "./components/ArticleAnalysis";

type TabType = 'industry' | 'tweet' | 'article';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('industry');
  useEffect(() => {
    console.log('Home component mounted, setting up event listeners.');
    document.addEventListener('STORE_ARTICLE', async (e) => {
      const detail = (e as CustomEvent).detail;
      const response = await fetch('/api/process-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles: detail.records }),
      })
      console.log('Articles processed:', await response.json());
    });
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 标签页导航 */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-lg sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex px-6">
            {[
              { id: 'industry' as const, icon: '🏢', label: '行业分析' },
              { id: 'tweet' as const, icon: '💬', label: '推文分析' },
              { id: 'article' as const, icon: '📄', label: '文章分析' }
            ].map((tab) => (
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
        {[
          { id: 'industry' as const, component: IndustryAnalysis },
          { id: 'tweet' as const, component: TweetAnalysis },
          { id: 'article' as const, component: ArticleAnalysis }
        ].map(({ id, component: Component }) => (
          activeTab === id && <Component key={id} />
        ))}
      </div>
    </div>
  );
}
