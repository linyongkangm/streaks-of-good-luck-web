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

  if (loading) {
    return <div className="p-6">加载中...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">文章分析</h2>

      {/* 搜索栏 */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="搜索标题..."
          value={searchTitle}
          onChange={(e) => setSearchTitle(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded"
        />
        <input
          type="text"
          placeholder="搜索标签..."
          value={searchTags}
          onChange={(e) => setSearchTags(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded"
        />
        <button
          onClick={handleSearch}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          搜索
        </button>
      </div>

      {/* 文章列表 */}
      <div className="space-y-4">
        {articles.map((article) => (
          <div key={article.id} className="border border-gray-200 rounded p-6 hover:shadow-lg transition">
            <h3 className="text-lg font-semibold mb-2">{article.title}</h3>
            
            <div className="flex gap-4 text-sm text-gray-600 mb-3">
              {article.publication && (
                <span>出版物: {article.publication}</span>
              )}
              {article.issue_date && (
                <span>发布日期: {new Date(article.issue_date).toLocaleDateString()}</span>
              )}
            </div>

            {article.tags && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {article.tags.split(',').map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                  >
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}

            <p className="text-sm mb-4 whitespace-pre-wrap line-clamp-4">
              {article.summary}
            </p>

            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline text-sm"
            >
              查看原文 →
            </a>

            <div className="text-xs text-gray-400 mt-3">
              创建时间: {new Date(article.create_time).toLocaleString()}
            </div>
          </div>
        ))}

        {articles.length === 0 && (
          <p className="text-center text-gray-500 py-10">暂无文章</p>
        )}
      </div>

      {/* 分页 */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-50"
        >
          上一页
        </button>
        <span className="px-4 py-2">
          第 {page} / {totalPages} 页
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-50"
        >
          下一页
        </button>
      </div>
    </div>
  )
}
