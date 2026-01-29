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

  // 新增：collect_from 筛选
  const [collectFromList, setCollectFromList] = useState<string[]>([])
  const [selectedCollectFrom, setSelectedCollectFrom] = useState<string>('all')
  const [isFetchingLatest, setIsFetchingLatest] = useState(false)
  const [newCollectFrom, setNewCollectFrom] = useState<string>('')
  const [isAddingCollectFrom, setIsAddingCollectFrom] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false)

  useEffect(() => {
    fetchCollectFromList()
  }, [])

  useEffect(() => {
    fetchSummaries()
  }, [page, selectedCollectFrom])

  const fetchCollectFromList = async () => {
    try {
      const response = await fetch('/api/tweet-summaries?collect_from_only=true')
      const data = await response.json()
      setCollectFromList(data.data || [])
    } catch (error) {
      console.error('Failed to fetch collect_from list:', error)
    }
  }

  const handleAddCollectFrom = () => {
    const trimmedInput = newCollectFrom.trim()
    
    if (!trimmedInput) {
      alert('请输入有效的推文来源')
      return
    }

    if (collectFromList.includes(trimmedInput)) {
      alert('该推文来源已存在')
      return
    }

    setIsAddingCollectFrom(true)
    // 添加到列表
    setCollectFromList([...collectFromList, trimmedInput])
    // 选中新添加的来源
    setSelectedCollectFrom(trimmedInput)
    // 清空输入框
    setNewCollectFrom('')
    setIsAddingCollectFrom(false)
  }

  const fetchSummaries = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (selectedCollectFrom !== 'all') {
        params.append('collect_from', selectedCollectFrom)
      }

      const response = await fetch(`/api/tweet-summaries?${params}`)
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

  const fetchLatestTweets = async () => {
    setIsFetchingLatest(true)
    try {
      const callbackCode = 'CALLBACK_GET_LATEST_TWEETS_' + Math.random().toString(36).substring(2)
      document.addEventListener(callbackCode, async (event: any) => {
        // tweetRecords结构示例
        // [{
        //     "tweetID": "2015568895512629468",
        //     "userName": "@XFreeze",
        //     "tweetDate": "2026-01-25T23:34:06.000Z",
        //     "tweetText": "ELON MUSK: MAKE LIFE MULTI-PLANETARY WITH THE KEY THRESHOLD TO SUSTAIN EVEN WITHOUT SUPPLY SHIPS FROM EARTH\n\n\"The goal is to make life multi-planetary. The key threshold for that is if the supply ships from Earth stop coming for any reason, Mars does not die out\n\nThat is the",
        //     "replyCount": "549",
        //     "retweetCount": "785",
        //     "likeCount": "3,704",
        //     "viewCount": "61万",
        //     "tweetUrl": "https://x.com/elonmusk/status/2015568895512629468",
        //     "tweetFrom": "Retweet",
        //     "collectFrom": "https://x.com/elonmusk"
        // }]
        console.log('Latest tweets fetched:', event.detail.records);
        const records = event.detail.records;
        // 批量创建推文
        if (records && records.length > 0) {
          try {
            const response = await fetch('/api/batch-create-tweets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tweetRecords: records }),
            })
            const data = await response.json()

            if (data.success) {
              alert(`成功导入 ${data.successful} 条推文${data.failed > 0 ? `，${data.failed} 条失败` : ''}`)
              // 刷新摘要列表
              document.dispatchEvent(new CustomEvent('MARK_TWEET_RECORDED', {
                detail: {
                  tweetIDs: data.successfulTweetIds || [],
                  collect_from: selectedCollectFrom,
                }
              }))

              setTimeout(() => {
                fetchSummaries()
                fetchCollectFromList()
              }, 1000)
            } else {
              alert('导入失败，请查看控制台')
            }
          } catch (error) {
            console.error('Failed to batch create tweets:', error)
            alert('导入失败，请稍后重试')
          } finally {
            setIsFetchingLatest(false)
          }
        } else {
          alert('未获取到推文数据')
          setIsFetchingLatest(false)
        }
      }, { once: true });
      document.dispatchEvent(new CustomEvent('GET_LATEST_TWEETS', {
        detail: {
          collect_from: selectedCollectFrom,
          callbackCode
        }
      }))
    } catch (error) {
      console.error('Failed to fetch latest tweets:', error)
      alert('获取失败，请稍后重试')
      setIsFetchingLatest(false)
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

  const generateAnalysisForDate = async () => {
    if (!selectedDate) {
      alert('请选择一个日期')
      return
    }

    if (selectedCollectFrom === 'all') {
      alert('请先选择一个推文来源')
      return
    }

    setIsGeneratingAnalysis(true)
    try {
      const response = await fetch('/api/generate-tweet-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collect_from: selectedCollectFrom,
          date: selectedDate,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`成功生成 ${data.count} 条推文的分析`)
        // 刷新摘要列表
        setPage(1)
        fetchSummaries()
      } else {
        alert(data.message || '生成分析失败，请稍后重试')
      }
    } catch (error) {
      console.error('Failed to generate analysis:', error)
      alert('生成分析失败，请稍后重试')
    } finally {
      setIsGeneratingAnalysis(false)
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
    <div className="p-6 max-w-[1800px] mx-auto">
      {/* 顶部筛选栏 */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              推文来源筛选
            </label>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => {
                  setSelectedCollectFrom('all')
                  setPage(1)
                }}
                className={`px-4 py-2 rounded-lg transition-all ${selectedCollectFrom === 'all'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                全部
              </button>
              {collectFromList.map((collectFrom) => (
                <button
                  key={collectFrom}
                  onClick={() => {
                    setSelectedCollectFrom(collectFrom)
                    setPage(1)
                  }}
                  className={`px-4 py-2 rounded-lg transition-all ${selectedCollectFrom === collectFrom
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  {collectFrom}
                </button>
              ))}
            </div>

            {/* 增加 CollectFrom 输入框 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCollectFrom}
                onChange={(e) => setNewCollectFrom(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCollectFrom()
                  }
                }}
                placeholder="输入新的推文来源 (如: https://x.com/username)"
                className="text-slate-900 flex-1 px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all text-sm"
              />
              <button
                onClick={handleAddCollectFrom}
                disabled={isAddingCollectFrom || !newCollectFrom.trim()}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                增加来源
              </button>
            </div>

            {/* 日期选择和生成分析 */}
            {selectedCollectFrom !== 'all' && (
              <div className="flex gap-2 mt-4">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-slate-900 flex-1 px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all text-sm"
                />
                <button
                  onClick={generateAnalysisForDate}
                  disabled={isGeneratingAnalysis || !selectedDate}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isGeneratingAnalysis ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent inline-block mr-2"></div>
                      生成中...
                    </>
                  ) : (
                    <>✨ 生成分析</>
                  )}
                </button>
              </div>
            )}
            <div></div>
          </div>
          {
            /* 获取最新推文按钮 */
            selectedCollectFrom !== 'all' && (<button
              onClick={fetchLatestTweets}
              disabled={isFetchingLatest}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              {isFetchingLatest ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  获取中...
                </>
              ) : (
                <>
                  <span>🔄</span>
                  获取最新推文
                </>
              )}
            </button>)
          }

        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 左侧：推文摘要列表 */}
        <div className="col-span-4">
          <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              推文摘要
              {selectedCollectFrom !== 'all' && (
                <span className="text-sm text-slate-500 font-normal ml-2">
                  ({selectedCollectFrom})
                </span>
              )}
            </h2>
            <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto scrollbar-thin pr-2">
              {summaries.map((summary) => (
                <button
                  key={summary.id}
                  onClick={() => fetchRelatedTweets(summary)}
                  className={`w-full text-left p-4 rounded-lg transition-all duration-200 border-2 ${selectedSummary?.id === summary.id
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
    </div>
  )
}
