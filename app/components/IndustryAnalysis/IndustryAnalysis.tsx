'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { summary__article, IndustryWithCount, IndustryWithArticles } from '@/types'
import * as tools from '@/app/tools'
import Button from '@/app/widget/Button'
import ModalForm from '@/app/widget/ModalForm'
import { FormItem, FormLabel } from '@/app/widget/Form'
import { TextInput } from '@/app/widget/Input'
import Modal from '@/app/widget/Modal'
import Placeholder from '@/app/widget/Placeholder'
import IndustryAnalysisIndustryList from './IndustryAnalysisIndustryList'
import IndustryAnalysisIndustryInfo from './IndustryAnalysisIndustryInfo'

export default function IndustryAnalysis() {
  // 行业列表
  const [industries, setIndustries] = useState<IndustryWithCount[]>([])
  const [loadingIndustries, setLoadingIndustries] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [selectedIndustryId, setSelectedIndustryId] = useState<number | null>(null)

  // 行业详情 + 关联文章
  const [industryDetail, setIndustryDetail] = useState<IndustryWithArticles | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // 新建/编辑行业弹窗
  const [showIndustryForm, setShowIndustryForm] = useState(false)
  const [editingIndustry, setEditingIndustry] = useState<IndustryWithCount | null>(null)
  const [industryForm, setIndustryForm] = useState({ name: '', description: '' })

  // 关联文章弹窗
  const [showLinkArticle, setShowLinkArticle] = useState(false)
  const [articleSearchTitle, setArticleSearchTitle] = useState('')
  const [articleSearchResults, setArticleSearchResults] = useState<summary__article[]>([])
  const [searchingArticles, setSearchingArticles] = useState(false)

  // 年份折叠
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([new Date().getFullYear()]))

  // 加载行业列表
  const fetchIndustries = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchName) params.append('name', searchName)
      const response = await fetch(`/api/industries?${params}`)
      const data = await response.json()
      setIndustries(data.data || [])
    } catch (error) {
      console.error('Failed to fetch industries:', error)
    } finally {
      setLoadingIndustries(false)
    }
  }, [searchName])

  useEffect(() => {
    fetchIndustries()
  }, [fetchIndustries])

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

  // 新建/编辑行业提交
  const handleSubmitIndustry = async (_e: React.FormEvent, values: typeof industryForm) => {
    if (!values.name.trim()) {
      alert('请填写行业名称')
      return
    }

    const url = editingIndustry
      ? `/api/industries/${editingIndustry.id}`
      : '/api/industries'
    const method = editingIndustry ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: values.name.trim(), description: values.description.trim() || null }),
    })

    const data = await response.json()
    if (data.error) {
      alert(data.error)
      return
    }

    setShowIndustryForm(false)
    setEditingIndustry(null)
    setIndustryForm({ name: '', description: '' })
    await fetchIndustries()
  }

  // 删除行业
  const handleDeleteIndustry = async (industry: IndustryWithCount) => {
    if (!confirm(`确定要删除行业「${industry.name}」吗？关联的文章不会被删除。`)) return

    const response = await fetch(`/api/industries/${industry.id}`, { method: 'DELETE' })
    const data = await response.json()
    if (data.error) {
      alert(data.error)
      return
    }

    if (selectedIndustryId === industry.id) {
      setSelectedIndustryId(null)
    }
    await fetchIndustries()
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
    await fetchIndustries()
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
    await fetchIndustries()
  }

  // 打开编辑弹窗
  const openEditForm = (industry: IndustryWithCount) => {
    setEditingIndustry(industry)
    setIndustryForm({ name: industry.name, description: industry.description || '' })
    setShowIndustryForm(true)
  }

  // 打开新建弹窗
  const openCreateForm = () => {
    setEditingIndustry(null)
    setIndustryForm({ name: '', description: '' })
    setShowIndustryForm(true)
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 120px)' }}>
        {/* 左侧 - 行业列表 */}
        <IndustryAnalysisIndustryList
          industries={industries}
          loading={loadingIndustries}
          searchName={searchName}
          onSearchNameChange={setSearchName}
          onSearch={fetchIndustries}
          selectedIndustryId={selectedIndustryId}
          onSelectIndustry={setSelectedIndustryId}
          onCreateIndustry={openCreateForm}
          onEditIndustry={openEditForm}
          onDeleteIndustry={handleDeleteIndustry}
        />

        {/* 右侧 - 行业资讯 */}
        <div className="flex-1 min-w-0">
          <Placeholder selected={!!selectedIndustryId} loading={loadingDetail} icon="👈" message="请从左侧选择一个行业">
          {industryDetail ? (
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
              {articlesByYear.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg flex flex-col items-center justify-center py-20">
                  <div className="text-5xl mb-3">📭</div>
                  <p className="text-slate-400">暂无关联文章</p>
                  <Button size="small" className="mt-4" onClick={() => {
                    setArticleSearchTitle('')
                    setArticleSearchResults([])
                    setShowLinkArticle(true)
                  }}>
                    关联文章
                  </Button>
                </div>
              ) : (
                articlesByYear.map(([year, yearArticles]) => {
                  const isExpanded = expandedYears.has(year)
                  const yearLabel = year === 0 ? '未知年份' : `${year} 年`

                  return (
                    <div key={year} className="bg-white rounded-xl shadow-lg overflow-hidden">
                      <button
                        onClick={() => toggleYear(year)}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-lg transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                            ▶
                          </span>
                          <h3 className="text-xl font-bold text-slate-900">{yearLabel}</h3>
                          <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                            {yearArticles.length} 篇
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100">
                          <div className="divide-y divide-slate-100">
                            {yearArticles.map((article) => (
                              <div
                                key={String(article.id)}
                                className="group px-6 py-4 hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex items-start gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h4 className="text-base font-semibold text-slate-900 hover:text-teal-600 transition-colors">
                                        <a
                                          href={article.source_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="hover:underline"
                                        >
                                          {article.title}
                                        </a>
                                      </h4>
                                      <button
                                        onClick={() => handleUnlinkArticle(article.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-red-400 hover:text-red-600 flex-shrink-0"
                                        title="移除关联"
                                      >
                                        ✕
                                      </button>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-2">
                                      {article.issue_date && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                          📅 {tools.toUTC(article.issue_date).toFormat(tools.DATE_FORMAT)}
                                        </span>
                                      )}
                                      {article.publication && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                          📰 {article.publication}
                                        </span>
                                      )}
                                      {article.contributor && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                          👤 {article.contributor}
                                        </span>
                                      )}
                                      {article.tags && article.tags.split(',').map((tag, idx) => (
                                        <span
                                          key={idx}
                                          className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium"
                                        >
                                          #{tag.trim()}
                                        </span>
                                      ))}
                                    </div>

                                    {article.summary && (
                                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                                        {article.summary.length > 200
                                          ? article.summary.substring(0, 200) + '...'
                                          : article.summary}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          ) : null}
          </Placeholder>
        </div>
      </div>

      {/* 新建/编辑行业弹窗 */}
      <ModalForm
        open={showIndustryForm}
        onClose={() => { setShowIndustryForm(false); setEditingIndustry(null) }}
        title={editingIndustry ? '✏️ 编辑行业' : '🏭 新建行业'}
        values={industryForm}
        onValuesChange={setIndustryForm}
        onSubmit={handleSubmitIndustry}
        submitText={editingIndustry ? '保存' : '新建'}
        maxWidth="md"
      >
        <FormLabel label="行业名称" required>
          <FormItem field="name">
            <TextInput placeholder="输入行业名称" />
          </FormItem>
        </FormLabel>
        <FormLabel label="描述">
          <FormItem field="description">
            <TextInput placeholder="输入行业描述（可选）" />
          </FormItem>
        </FormLabel>
      </ModalForm>

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
