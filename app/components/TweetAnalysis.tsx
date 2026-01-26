'use client'

import { useState, useEffect } from 'react'
import type { summary__tweet, info__tweet } from '@/types'

export default function TweetAnalysis() {
  const [summaries, setSummaries] = useState<summary__tweet[]>([])
  const [selectedSummary, setSelectedSummary] = useState<summary__tweet | null>(null)
  const [relatedTweets, setRelatedTweets] = useState<info__tweet[]>([])
  const [loading, setLoading] = useState(true)
  const [tweetsLoading, setTweetsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchSummaries()
  }, [page])

  const fetchSummaries = async () => {
    try {
      const response = await fetch(`/api/tweet-summaries?page=${page}&limit=20`)
      const data = await response.json()
      setSummaries(data.data || [])
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Failed to fetch tweet summaries:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRelatedTweets = async (summary: summary__tweet) => {
    setSelectedSummary(summary)
    setTweetsLoading(true)
    try {
      const dateStr = new Date(summary.date).toISOString().split('T')[0]
      const response = await fetch(
        `/api/tweets-by-summary?collect_from=${encodeURIComponent(summary.collect_from)}&date=${dateStr}`
      )
      const data = await response.json()
      setRelatedTweets(data.data || [])
    } catch (error) {
      console.error('Failed to fetch related tweets:', error)
    } finally {
      setTweetsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-12 gap-6 p-6 max-w-[1800px] mx-auto">
      {/* 左侧：推文摘要列表 */}
      <div className="col-span-4">
        <div className="bg-white rounded-xl shadow-lg p-6 sticky">
          <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            推文摘要
          </h2>
          <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto scrollbar-thin pr-2">
            {summaries.map((summary) => (
              <button
                key={summary.id}
                onClick={() => fetchRelatedTweets(summary)}
                className={`w-full text-left p-4 rounded-lg transition-all duration-200 border-2 ${
                  selectedSummary?.id === summary.id
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-lg">💬</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-800 truncate">
                      {summary.collect_from}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <span>📅</span>
                      {new Date(summary.date).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                  {summary.summary}
                </div>
              </button>
            ))}
          </div>

          {/* 分页 */}
          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-200">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg text-slate-900 border-2 border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              ←
            </button>
            <span className="px-4 py-2 text-sm font-medium text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg text-slate-900 border-2 border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* 右侧：相关推文 */}
      <div className="col-span-8">
        {tweetsLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : selectedSummary ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">💬</span>
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-2">{selectedSummary.collect_from}</h3>
                  <div className="text-sm opacity-90 flex items-center gap-2">
                    <span>📅</span>
                    {new Date(selectedSummary.date).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
              <p className="text-white/95 whitespace-pre-wrap leading-relaxed">
                {selectedSummary.summary}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                <span>相关推文</span>
                <span className="text-lg text-slate-500 font-normal">({relatedTweets.length})</span>
              </h3>
              <div className="space-y-4 max-h-[calc(100vh-450px)] overflow-y-auto scrollbar-thin pr-2">
                {relatedTweets.map((tweet) => (
                  <div key={tweet.id} className="border-2 border-slate-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all bg-gradient-to-br from-white to-slate-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{tweet.user_name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <span>🕐UTC 协调世界时</span>
                            {new Date(tweet.tweet_date).toISOString().replace('T', ' ').split('.')[0]}
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                        {tweet.tweet_from}
                      </span>
                    </div>
                    <p className="text-sm mb-4 whitespace-pre-wrap leading-relaxed text-slate-700">
                      {tweet.tweet_text}
                    </p>
                    <div className="flex gap-6 text-xs text-slate-600 mb-3">
                      <span className="flex items-center gap-1">💬 {tweet.reply_count}</span>
                      <span className="flex items-center gap-1">🔄 {tweet.retweet_count}</span>
                      <span className="flex items-center gap-1">❤️ {tweet.like_count}</span>
                      <span className="flex items-center gap-1">👁️ {tweet.view_count}</span>
                    </div>
                    <a
                      href={tweet.tweet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm group"
                    >
                      查看推文
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </a>
                  </div>
                ))}
                {relatedTweets.length === 0 && (
                  <p className="text-center text-slate-500 py-8">暂无相关推文</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-xl shadow-lg">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-slate-500 text-lg">请从左侧选择一个推文摘要</p>
          </div>
        )}
      </div>
    </div>
  )
}
