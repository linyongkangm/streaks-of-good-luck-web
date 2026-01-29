'use client'

import { useState, useEffect } from 'react'
import type { summary__article } from '@/types'

export default function ArticleAnalysis() {
  const [articles, setArticles] = useState<summary__article[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTitle, setSearchTitle] = useState('')
  const [searchTags, setSearchTags] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchArticles()
  }, [page])

  const fetchArticles = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (searchTitle) params.append('title', searchTitle)
      if (searchTags) params.append('tags', searchTags)

      const response = await fetch(`/api/article-summaries?${params}`)
      const data = await response.json()
      setArticles(data.data || [])
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Failed to fetch articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchArticles()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const processArticles = async (articleRecords: any[]) => {
    try {
      setIsProcessing(true)
      const response = await fetch('/api/process-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles: articleRecords }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`成功处理 ${data.successful} 篇文章${data.failed > 0 ? `，${data.failed} 篇失败` : ''}`)
        setPage(1)
        fetchArticles()
        document.dispatchEvent(new CustomEvent('MARK_RECORDED_SCRAPINGS', {
          detail: {
            host: 'https://www.qstheory.cn',
            flags: (data.successfulSourceUrls || []).concat(data.existingSourceUrls || [])
          }
        }))
      } else {
        alert(data.message || '处理文章失败，请稍后重试')
      }
    } catch (error) {
      console.error('Failed to process articles:', error)
      alert('处理文章失败，请稍后重试')
    } finally {
      setIsProcessing(false)
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
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          📄 文章分析
        </h2>

        {/* 搜索栏 */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜索标题..."
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-slate-900 w-full px-4 py-3 pl-10 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          </div>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜索标签..."
              value={searchTags}
              onChange={(e) => setSearchTags(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-slate-900 w-full px-4 py-3 pl-10 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🏷️</span>
          </div>
          <button
            onClick={handleSearch}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium"
          >
            搜索
          </button>
          <button
            onClick={() => {
              const callbackCode = 'CALLBACK_REDIRECT_SCRAPING_' + Math.random().toString(36).substring(2)
              document.addEventListener(callbackCode, (e: any) => {
                // {
                //   source_url: '原链接',
                //   title: '标题',
                //   contributor : '作者',
                //   publication: "求是",
                //   issue_date: '2026-01-01',
                //   source_text: '原文'
                // }
                console.log('Redirect scraping completed.', e.detail.records)
                if (e.detail.records && e.detail.records.length > 0) {
                  processArticles(e.detail.records)
                } else {
                  alert('未获取到文章数据')
                }
              }, { once: true })
              document.dispatchEvent(new CustomEvent('REDIRECT_SCRAPING', {
                detail: {
                  target: 'https://www.qstheory.cn/20251231/2d916da295774130ac2fb223fd208895/c.html',
                  callbackCode
                }
              }))
            }}
            disabled={isProcessing}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                处理中...
              </>
            ) : (
              '获取'
            )}
          </button>
        </div>
      </div>

      {/* 文章列表 */}
      <div className="space-y-4">
        {articles.map((article) => (
          <div
            key={article.id}
            className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-xl transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl">
                📄
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 mb-3 hover:text-blue-600 transition-colors">
                  {article.title}
                </h3>

                <div className="flex flex-wrap gap-3 mb-3">
                  {article.publication && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      <span>📰</span>
                      {article.publication}
                    </span>
                  )}
                  {article.issue_date && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      <span>📅</span>
                      {new Date(article.issue_date).toLocaleDateString('zh-CN')}
                    </span>
                  )}
                </div>

                {article.tags && (
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {article.tags.split(',').map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-md font-medium hover:bg-slate-200 transition-colors"
                      >
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap mb-4">
                  {article.summary}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <a
                    href={article.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm group"
                  >
                    查看原文
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}

        {articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-lg">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-slate-500 text-lg">暂无文章</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-5 py-2.5 rounded-lg text-slate-900 border-2 border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all font-medium"
          >
            ← 上一页
          </button>
          <div className="flex items-center gap-2">
            <span className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium shadow-md">
              {page}
            </span>
            <span className="text-slate-500">/ {totalPages}</span>
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-5 py-2.5 rounded-lg text-slate-900 border-2 border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all font-medium"
          >
            下一页 →
          </button>
        </div>
      )}
    </div>
  )
}
