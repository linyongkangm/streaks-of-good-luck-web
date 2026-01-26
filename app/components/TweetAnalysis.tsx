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
    return <div className="p-6">加载中...</div>
  }

  return (
    <div className="grid grid-cols-12 gap-6 p-6">
      {/* 左侧：推文摘要列表 */}
      <div className="col-span-4 space-y-2">
        <h2 className="text-xl font-bold mb-4">推文摘要</h2>
        <div className="space-y-3 max-h-[75vh] overflow-y-auto">
          {summaries.map((summary) => (
            <button
              key={summary.id}
              onClick={() => fetchRelatedTweets(summary)}
              className={`w-full text-left p-4 rounded border transition ${
                selectedSummary?.id === summary.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <div className="font-semibold text-sm text-gray-700 mb-1">
                {summary.collect_from}
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {new Date(summary.date).toLocaleDateString()}
              </div>
              <div className="text-sm line-clamp-3">{summary.summary}</div>
            </button>
          ))}
        </div>

        {/* 分页 */}
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            上一页
          </button>
          <span className="px-4 py-2">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>

      {/* 右侧：相关推文 */}
      <div className="col-span-8">
        {tweetsLoading ? (
          <div>加载推文中...</div>
        ) : selectedSummary ? (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <h3 className="font-bold mb-2">{selectedSummary.collect_from}</h3>
              <div className="text-sm text-gray-600 mb-2">
                {new Date(selectedSummary.date).toLocaleDateString()}
              </div>
              <p className="whitespace-pre-wrap">{selectedSummary.summary}</p>
            </div>

            <h3 className="text-lg font-semibold">相关推文 ({relatedTweets.length})</h3>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {relatedTweets.map((tweet) => (
                <div key={tweet.id} className="border border-gray-200 rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold">{tweet.user_name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(tweet.tweet_date).toLocaleString()}
                    </div>
                  </div>
                  <p className="text-sm mb-3 whitespace-pre-wrap">{tweet.tweet_text}</p>
                  <div className="flex gap-4 text-xs text-gray-600">
                    <span>💬 {tweet.reply_count}</span>
                    <span>🔄 {tweet.retweet_count}</span>
                    <span>❤️ {tweet.like_count}</span>
                    <span>👁️ {tweet.view_count}</span>
                  </div>
                  <a
                    href={tweet.tweet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-xs mt-2 inline-block"
                  >
                    查看推文
                  </a>
                </div>
              ))}
              {relatedTweets.length === 0 && (
                <p className="text-gray-500">暂无相关推文</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-20">
            请从左侧选择一个推文摘要
          </div>
        )}
      </div>
    </div>
  )
}
