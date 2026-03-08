'use client'

import { useState, useEffect } from 'react'
import type { summary__tweet, info__tweet } from '@/types'
import * as ctools from '@/app/tools/ctools';
import { DATE_FORMAT, DATE_TIME_FORMAT, toBeijing, toEastern, toLuxon } from '../tools';
import Button from '@/app/widget/Button'
import { TextInput } from '@/app/widget/Input'
import DatePicker from '@/app/widget/DatePicker'
import Radio from '@/app/widget/Radio'
import Panel from '@/app/widget/Panel'
import Pagination from '@/app/widget/Pagination'
import Placeholder from '@/app/widget/Placeholder'
import { DateTime } from 'luxon';
import * as luxon from 'luxon';

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
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false)
  const [isSendingAll, setIsSendingAll] = useState(false)

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
      const data = await ctools.collectLatestTweets(selectedCollectFrom)
      if (data.success) {
        alert(`成功导入 ${data.successful} 条推文${data.failed > 0 ? `，${data.failed} 条失败` : ''}`)
        setTimeout(() => {
          fetchSummaries()
          fetchCollectFromList()
        }, 1000)
      } else {
        alert('导入失败，请查看控制台')
      }
    } catch (error) {
      console.error('Failed to fetch latest tweets:', error)
      alert('获取失败，请稍后重试')
    }
    setIsFetchingLatest(false)
  }

  const fetchLatestTweetsForAll = async () => {
    if (collectFromList.length === 0) {
      alert('暂无可抓取的推文来源')
      return
    }

    setIsFetchingLatest(true)
    let totalSuccessful = 0
    let totalFailed = 0
    const sourceErrors: string[] = []

    try {
      // 扩展抓取通过事件驱动，按来源串行执行更稳定。
      for (const collectFrom of collectFromList) {
        try {
          const data = await ctools.collectLatestTweets(collectFrom)
          totalSuccessful += Number(data.successful || 0)
          totalFailed += Number(data.failed || 0)
        } catch (error) {
          console.error(`Failed to fetch latest tweets for ${collectFrom}:`, error)
          sourceErrors.push(collectFrom)
        }
      }

      alert(
        `批量抓取完成\n` +
        `来源数: ${collectFromList.length}\n` +
        `成功导入: ${totalSuccessful} 条\n` +
        `失败导入: ${totalFailed} 条\n` +
        `来源失败: ${sourceErrors.length} 个`
      )

      setTimeout(() => {
        fetchSummaries()
        fetchCollectFromList()
      }, 1000)
    } catch (error) {
      console.error('Failed to fetch latest tweets for all collect_from:', error)
      alert('批量获取失败，请稍后重试')
    } finally {
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

  const analyzeAllToday = async () => {
    setIsAnalyzingAll(true)
    try {
      const response = await fetch('/api/generate-and-send-tweet-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          date: DateTime.now().setZone('America/New_York').toISODate(),
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert(`全部分析完成：已分析 ${data.generatedCount} 个来源`)
      } else {
        const generationFailCount = Array.isArray(data.generationFailed) ? data.generationFailed.length : 0
        alert(
          `${data.message || '全部分析执行失败'}\n` +
          `分析成功: ${data.generatedCount || 0}\n` +
          `分析失败: ${generationFailCount}`
        )
      }

      setPage(1)
      fetchSummaries()
    } catch (error) {
      console.error('Failed to analyze all sources for today:', error)
      alert('全部分析失败，请稍后重试')
    } finally {
      setIsAnalyzingAll(false)
    }
  }

  const sendAllToday = async () => {
    setIsSendingAll(true)
    try {
      const response = await fetch('/api/generate-and-send-tweet-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          date: DateTime.now().setZone('America/New_York').toISODate(),
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert(`全部发送完成：已发送 ${data.sentCount} 个来源`)
      } else {
        const sendFailCount = Array.isArray(data.sendFailed) ? data.sendFailed.length : 0
        alert(
          `${data.message || '全部发送执行失败'}\n` +
          `发送成功: ${data.sentCount || 0}\n` +
          `发送失败: ${sendFailCount}`
        )
      }

      setPage(1)
      fetchSummaries()
    } catch (error) {
      console.error('Failed to send all sources for today:', error)
      alert('全部发送失败，请稍后重试')
    } finally {
      setIsSendingAll(false)
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
      <Panel title="推文来源筛选" className='mb-4'>
        <div className="flex-1">
          <div className="flex flex-wrap gap-2 mb-4">
            <Radio
              value={selectedCollectFrom}
              onChange={(value) => {
                setSelectedCollectFrom(value)
                setPage(1)
              }}
              options={[
                { label: '全部', value: 'all' },
                ...collectFromList.map(item => ({ label: item, value: item }))
              ]}
            />
            <Button
              onClick={selectedCollectFrom === 'all' ? fetchLatestTweetsForAll : fetchLatestTweets}
              disabled={isFetchingLatest}
              size="small"
              look="success"
            >
              {isFetchingLatest ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  获取中...
                </>
              ) : (
                <>
                  <span className="mr-2">🔄</span>
                  {selectedCollectFrom === 'all' ? '获取全部CollectFrom的推文' : '获取最新推文'}
                </>
              )}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={analyzeAllToday}
              disabled={isAnalyzingAll || isSendingAll}
              size="small"
              look="primary"
            >
              {isAnalyzingAll ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent inline-block mr-2"></div>
                  执行中...
                </>
              ) : (
                <>全部分析</>
              )}
            </Button>
            <Button
              onClick={sendAllToday}
              disabled={isAnalyzingAll || isSendingAll}
              size="small"
              look="success"
            >
              {isSendingAll ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent inline-block mr-2"></div>
                  发送中...
                </>
              ) : (
                <>全部发送</>
              )}
            </Button>
            {/* 增加 CollectFrom 输入框 */}
            <div className="flex gap-2 mr-16">
              <TextInput
                value={newCollectFrom}
                onChange={(value) => setNewCollectFrom(value)}
                placeholder="输入新的推文来源 (如: https://x.com/username)"
                className="flex-1 text-sm"
              />
              <Button
                onClick={handleAddCollectFrom}
                disabled={isAddingCollectFrom || !newCollectFrom.trim()}
                size="small"
                look="primary"
              >
                增加来源
              </Button>
            </div>

            {/* 日期选择和生成分析 */}
            {selectedCollectFrom !== 'all' && (
              <div className="flex gap-2">
                <DatePicker
                  mode="date"
                  value={selectedDate ? DateTime.fromISO(selectedDate) : undefined}
                  onChange={(value) => setSelectedDate(value.toISODate() || '')}
                  placeholder="选择日期"
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={generateAnalysisForDate}
                  disabled={isGeneratingAnalysis || !selectedDate}
                  size="small"
                  look="danger"
                >
                  {isGeneratingAnalysis ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent inline-block mr-2"></div>
                      生成中...
                    </>
                  ) : (
                    <>✨ 生成分析</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

      </Panel>

      <div className="grid grid-cols-12 gap-6">
        {/* 左侧：推文摘要列表 */}
        <div className="col-span-4">
          <Panel title={
            <span>
              推文摘要
              {selectedCollectFrom !== 'all' && (
                <span className="text-sm text-slate-500 font-normal ml-2">
                  ({selectedCollectFrom})
                </span>
              )}
            </span>
          }>

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
                        {toLuxon(summary.date).startOf('day').toISODate()}
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
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </Panel>
        </div>

        {/* 右侧：相关推文 */}
        <div className="col-span-8">
          <Placeholder
            selected={!!selectedSummary}
            loading={tweetsLoading}
            icon="💬"
            message="请从左侧选择一个推文摘要"
          >
            <div className="space-y-6">
              <Panel
                title={
                  <span className='text-white'>{`${selectedSummary?.collect_from} ${selectedSummary && toLuxon(selectedSummary?.date).toFormat(DATE_FORMAT)}的推文摘要`}</span>
                }
                className="bg-gradient-to-br from-blue-500 to-indigo-600 ">
                <p className="text-white/95 whitespace-pre-wrap leading-relaxed">
                  {selectedSummary?.summary}
                </p>
              </Panel>
              <Panel title="相关推文">
                <div className="space-y-4 max-h-[calc(100vh-450px)] overflow-y-auto scrollbar-thin pr-2">
                  {relatedTweets.map((tweet) => (
                    <div key={tweet.id} className="border-2 border-slate-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all bg-gradient-to-br from-white to-slate-50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-semibold text-slate-900">{tweet.user_name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <time dateTime={toLuxon(tweet.tweet_date).toISO() as string} >
                                🕐
                                <span className='mr-4'>
                                  {toEastern(tweet.tweet_date).toFormat(DATE_TIME_FORMAT)}
                                </span>
                                <span>
                                  {toBeijing(tweet.tweet_date).toFormat(DATE_TIME_FORMAT)}
                                </span>
                              </time>
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
              </Panel>
            </div>
          </Placeholder>
        </div>
      </div>
    </div>
  )
}
