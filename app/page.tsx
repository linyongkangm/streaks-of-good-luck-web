"use client";

import { useState } from "react";
import IndustryAnalysis from "./components/IndustryAnalysis";
import TweetAnalysis from "./components/TweetAnalysis";
import ArticleAnalysis from "./components/ArticleAnalysis";

type TabType = 'industry' | 'tweet' | 'article';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('industry');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 标签页导航 */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-lg sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-6 py-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              数据分析平台
            </h1>
          </div>
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab('industry')}
              className={`px-6 py-3 font-medium transition-all relative ${
                activeTab === 'industry'
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="relative z-10">🏢 行业分析</span>
              {activeTab === 'industry' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('tweet')}
              className={`px-6 py-3 font-medium transition-all relative ${
                activeTab === 'tweet'
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="relative z-10">💬 推文分析</span>
              {activeTab === 'tweet' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('article')}
              className={`px-6 py-3 font-medium transition-all relative ${
                activeTab === 'article'
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="relative z-10">📄 文章分析</span>
              {activeTab === 'article' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div>
        {activeTab === 'industry' && <IndustryAnalysis />}
        {activeTab === 'tweet' && <TweetAnalysis />}
        {activeTab === 'article' && <ArticleAnalysis />}
      </div>
    </div>
  );
}
