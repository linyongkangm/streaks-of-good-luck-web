"use client";

import { useState } from "react";
import IndustryAnalysis from "./components/IndustryAnalysis";
import TweetAnalysis from "./components/TweetAnalysis";
import ArticleAnalysis from "./components/ArticleAnalysis";

type TabType = 'industry' | 'tweet' | 'article';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('industry');

  return (
    <div className="min-h-screen">
      {/* 标签页导航 */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex">
          <button
            onClick={() => setActiveTab('industry')}
            className={`px-6 py-4 font-medium transition ${
              activeTab === 'industry'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            行业分析
          </button>
          <button
            onClick={() => setActiveTab('tweet')}
            className={`px-6 py-4 font-medium transition ${
              activeTab === 'tweet'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            推文分析
          </button>
          <button
            onClick={() => setActiveTab('article')}
            className={`px-6 py-4 font-medium transition ${
              activeTab === 'article'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            文章分析
          </button>
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
