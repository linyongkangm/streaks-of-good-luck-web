'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { summary__article, IndustryWithArticles } from '@/types'
import * as tools from '@/app/tools'
import Button from '@/app/widget/Button'
import Modal from '@/app/widget/Modal'
import Placeholder from '@/app/widget/Placeholder'
import IndustryAnalysisIndustryList from './IndustryAnalysisIndustryList'
import IndustryAnalysisIndustryInfo from './IndustryAnalysisIndustryInfo'
import IndustryAnalysisRelateArticles from './IndustryAnalysisRelateArticles'

export default function IndustryAnalysis() {
  const [selectedIndustryId, setSelectedIndustryId] = useState<number | null>(null)
  const [industryListRefreshKey, setIndustryListRefreshKey] = useState(0)
  const refreshIndustryList = useCallback(() => setIndustryListRefreshKey(k => k + 1), [])

  // 行业详情 + 关联文章
  const [industryDetail, setIndustryDetail] = useState<IndustryWithArticles | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // 关联文章弹窗
  const [showLinkArticle, setShowLinkArticle] = useState(false)
  const [articleSearchTitle, setArticleSearchTitle] = useState('')
  const [articleSearchResults, setArticleSearchResults] = useState<summary__article[]>([])
  const [searchingArticles, setSearchingArticles] = useState(false)

  // 年份折叠
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([new Date().getFullYear()]))

  // 加载行业详情（含关联文章）
  const fetchIndustryDetail = useCallback(async (id: number) => {
    setLoadingDetail(true)
    try {
      const response = await fetch(`/api/industries/${id}`)
      const data = await response.json()
      setIndustryDetail(data.data || null)
    } catch (error) {
      console.error('Failed to fetch industry detail:', error)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    if (selectedIndustryId) {
      fetchIndustryDetail(selectedIndustryId)
    } else {
      setIndustryDetail(null)
    }
  }, [selectedIndustryId, fetchIndustryDetail])

  // 关联文章按年份分组
  const articlesByYear = useMemo(() => {
    if (!industryDetail) return []
    const articles = industryDetail.relation__industry_articles.map(r => r.summary__article)
    const map = new Map<number, summary__article[]>()
    for (const article of articles) {
      const year = article.issue_date
        ? new Date(article.issue_date).getFullYear()
        : 0
      if (!map.has(year)) map.set(year, [])
      map.get(year)!.push(article)
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === 0) return 1
      if (b[0] === 0) return -1
      return b[0] - a[0]
    })
  }, [industryDetail])

  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  // 搜索文章（用于关联）
  const handleSearchArticles = async () => {
    if (!articleSearchTitle.trim()) return
    setSearchingArticles(true)
    try {
      const params = new URLSearchParams({ title: articleSearchTitle, limit: '20' })
      const response = await fetch(`/api/article-summaries?${params}`)
      const data = await response.json()
      setArticleSearchResults(data.data || [])
    } catch (error) {
      console.error('Failed to search articles:', error)
    } finally {
      setSearchingArticles(false)
    }
  }

  // 关联文章到行业
  const handleLinkArticle = async (articleId: bigint) => {
    if (!selectedIndustryId) return
    const response = await fetch(`/api/industries/${selectedIndustryId}/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: articleId.toString() }),
    })
    const data = await response.json()
    if (data.error) {
      alert(data.error)
      return
    }
    // 刷新详情
    await fetchIndustryDetail(selectedIndustryId)
    refreshIndustryList()
  }

  // 移除文章关联
  const handleUnlinkArticle = async (articleId: bigint) => {
    if (!selectedIndustryId) return
    if (!confirm('确定要移除此文章的关联吗？')) return
    const response = await fetch(`/api/industries/${selectedIndustryId}/articles`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: articleId.toString() }),
    })
    const data = await response.json()
    if (data.error) {
      alert(data.error)
      return
    }
    await fetchIndustryDetail(selectedIndustryId)
    refreshIndustryList()
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 120px)' }}>
        {/* 左侧 - 行业列表 */}
        <IndustryAnalysisIndustryList
          refreshKey={industryListRefreshKey}
          selectedIndustryId={selectedIndustryId}
          onSelectIndustry={setSelectedIndustryId}
        />

        {/* 右侧 - 行业资讯 */}
        <div className="flex-1 min-w-0">
          <Placeholder selected={!!selectedIndustryId} loading={loadingDetail} icon="👈" message="请从左侧选择一个行业">
            {industryDetail && (
              <div className="space-y-4">
                {/* 行业信息头 */}
                <IndustryAnalysisIndustryInfo
                  industryDetail={industryDetail}
                  onOpenLinkArticle={() => {
                    setArticleSearchTitle('')
                    setArticleSearchResults([])
                    setShowLinkArticle(true)
                  }}
                />

                {/* 文章按年份分组 */}
                <IndustryAnalysisRelateArticles
                  articlesByYear={articlesByYear}
                  expandedYears={expandedYears}
                  onToggleYear={toggleYear}
                  onUnlinkArticle={handleUnlinkArticle}
                  onOpenLinkArticle={() => {
                    setArticleSearchTitle('')
                    setArticleSearchResults([])
                    setShowLinkArticle(true)
                  }}
                />
              </div>
            )}
          </Placeholder>
        </div>
      </div>

      {/* 关联文章弹窗 */}
      <Modal
        open={showLinkArticle}
        onClose={() => setShowLinkArticle(false)}
        title="📎 关联文章"
        maxWidth="2xl"
      >
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="输入文章标题搜索..."
              value={articleSearchTitle}
              onChange={(e) => setArticleSearchTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchArticles()}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none text-slate-900"
            />
            <Button onClick={handleSearchArticles} size="small">搜索</Button>
          </div>
        </div>

        {searchingArticles ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-teal-500 border-t-transparent"></div>
          </div>
        ) : articleSearchResults.length > 0 ? (
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
            {articleSearchResults.map((article) => {
              const alreadyLinked = industryDetail?.relation__industry_articles.some(
                r => String(r.summary__article.id) === String(article.id)
              )
              return (
                <div key={String(article.id)} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{article.title}</p>
                    <div className="flex gap-2 mt-1">
                      {article.publication && (
                        <span className="text-xs text-blue-600">{article.publication}</span>
                      )}
                      {article.issue_date && (
                        <span className="text-xs text-slate-400">
                          {tools.toUTC(article.issue_date).toFormat(tools.DATE_FORMAT)}
                        </span>
                      )}
                    </div>
                  </div>
                  {alreadyLinked ? (
                    <span className="text-xs text-slate-400 flex-shrink-0">已关联</span>
                  ) : (
                    <Button
                      size="tiny"
                      look="success"
                      onClick={() => handleLinkArticle(article.id)}
                    >
                      关联
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            输入标题搜索文章后关联
          </div>
        )}
      </Modal>
    </div>
  )
}
