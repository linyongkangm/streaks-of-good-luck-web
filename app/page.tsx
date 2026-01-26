"use client";

import { useEffect, useState } from "react";
import type { info__stock_company, StockCompanyListResponse, info__tweet, TweetListResponse } from "@/types";

type TabType = 'companies' | 'tweets';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('companies');
  const [companies, setCompanies] = useState<info__stock_company[]>([]);
  const [tweets, setTweets] = useState<info__tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/stock-companies?limit=10');
        
        if (!response.ok) {
          throw new Error('获取数据失败');
        }

        const result: StockCompanyListResponse = await response.json();
        setCompanies(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  useEffect(() => {
    if (activeTab === 'tweets') {
      const fetchTweets = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await fetch('/api/info-tweets?limit=20');
          
          if (!response.ok) {
            throw new Error('获取推文失败');
          }

          const result: TweetListResponse = await response.json();
          setTweets(result.data);
        } catch (err) {
          setError(err instanceof Error ? err.message : '未知错误');
        } finally {
          setLoading(false);
        }
      };

      fetchTweets();
    }
  }, [activeTab]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black p-8">
      <main className="w-full max-w-6xl">
        <h1 className="text-3xl font-bold mb-8 text-center text-zinc-900 dark:text-zinc-50">
          数据展示
        </h1>

        {/* Tab 切换 */}
        <div className="flex gap-4 mb-6 justify-center">
          <button
            onClick={() => setActiveTab('companies')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'companies'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            股票公司
          </button>
          <button
            onClick={() => setActiveTab('tweets')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'tweets'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            推文信息
          </button>
        </div>

        {loading && (
          <div className="text-center text-zinc-600 dark:text-zinc-400">
            加载中...
          </div>
        )}

        {error && (
          <div className="text-center text-red-600 dark:text-red-400">
            错误: {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {activeTab === 'companies' && (
              <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                  <thead className="bg-zinc-50 dark:bg-zinc-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        代码
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        公司名称
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        行业
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        上市日期
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                    {companies.map((company) => (
                      <tr key={company.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {company.company_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300">
                          {company.company_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                          {company.industry || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                          {company.ipo_date ? new Date(company.ipo_date).toLocaleDateString('zh-CN') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'tweets' && (
              <div className="space-y-4">
                {tweets.map((tweet) => (
                  <div
                    key={tweet.id.toString()}
                    className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 mb-1">
                          {tweet.user_name}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {new Date(tweet.tweet_date).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {tweet.tweet_from}
                      </span>
                    </div>
                    
                    <p className="text-zinc-700 dark:text-zinc-300 mb-4 whitespace-pre-wrap">
                      {tweet.tweet_text}
                    </p>
                    
                    <div className="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <span>💬</span>
                        {tweet.reply_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>🔁</span>
                        {tweet.retweet_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>❤️</span>
                        {tweet.like_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>👁️</span>
                        {tweet.view_count}
                      </span>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                      <a
                        href={tweet.tweet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        查看原推文 →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && !error && activeTab === 'companies' && companies.length === 0 && (
          <div className="text-center text-zinc-600 dark:text-zinc-400">
            暂无公司数据
          </div>
        )}

        {!loading && !error && activeTab === 'tweets' && tweets.length === 0 && (
          <div className="text-center text-zinc-600 dark:text-zinc-400">
            暂无推文数据
          </div>
        )}
      </main>
    </div>
  );
}
