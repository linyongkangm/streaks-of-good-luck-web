'use client'

import { useState, useEffect } from 'react'
import type { summary__article } from '@/types'
import * as tools from '@/app/tools'
import * as ctools from '@/app/tools/ctools'
import Button from '@/app/widget/Button'
import ModalForm from '@/app/widget/ModalForm'
import { FormItem, FormLabel } from '@/app/widget/Form'
import { TextInput } from '@/app/widget/Input'
import Loading from '@/app/widget/Loading'
import Pagination from '@/app/widget/Pagination'
import Select from '@/app/widget/Select'
function appendPredictsSaved(articleId: string) {
  const predicts_saved = localStorage.getItem('PREDICTS_SAVED')?.split(',') || []
  predicts_saved.push(articleId)
  localStorage.setItem('PREDICTS_SAVED', predicts_saved.join(','))
  return predicts_saved
}

export default function ArticleAnalysis() {
  const [articles, setArticles] = useState<summary__article[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTitle, setSearchTitle] = useState('')
  const [searchTags, setSearchTags] = useState('')
  const [searchPublication, setSearchPublication] = useState('')
  const [searchContributor, setSearchContributor] = useState('')
  const [searchIssueDate, setSearchIssueDate] = useState('')
  const [publications, setPublications] = useState<string[]>([])
  const [reanalyzing, setReanalyzing] = useState<string | null>(null)
  const [extractingPredicts, setExtractingPredicts] = useState<string | null>(null)
  const [predictPreview, setPredictPreview] = useState<{
    article: summary__article;
    predicts: Array<{ interval_start: string; interval_end: string; content: string }>;
  } | null>(null)
  const [savingPredicts, setSavingPredicts] = useState(false)
  const [predictsSaved, setPredictsSaved] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('PREDICTS_SAVED')?.split(',') || []
    }
    return []
  })
  const [hoveredArticle, setHoveredArticle] = useState<summary__article | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [showAddArticle, setShowAddArticle] = useState(false)
  const [addArticleForm, setAddArticleForm] = useState({
    title: '',
    source_url: '',
    publication: '',
    issue_date: '',
    source_text: '',
    contributor: '',
  })

  useEffect(() => {
    fetchArticles()
  }, [page])

  useEffect(() => {
    fetchPublications()
  }, [])

  const fetchPublications = async () => {
    try {
      const response = await fetch('/api/publications')
      const result = await response.json()
      if (result.data) {
        setPublications(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch publications:', error)
    }
  }

  const fetchArticles = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (searchTitle) params.append('title', searchTitle)
      if (searchTags) params.append('tags', searchTags)
      if (searchPublication) params.append('publication', searchPublication)
      if (searchContributor) params.append('contributor', searchContributor)
      if (searchIssueDate) params.append('issue_date', searchIssueDate)

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

  const handleExtractPredicts = async (articleId: bigint) => {
    try {
      setExtractingPredicts(articleId.toString())
      const response = await fetch('/api/extract-predicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId.toString() }),
      })

      const data = await response.json()

      if (data.success) {
        if (data.predicts.length === 0) {
          appendPredictsSaved(articleId.toString())
        }
        setPredictPreview({
          article: data.article,
          predicts: data.predicts,
        })
      } else {
        alert(data.message || '提取预测失败，请稍后重试')
      }
    } catch (error) {
      console.error('Failed to extract predictions:', error)
      alert('提取预测失败，请稍后重试')
    } finally {
      setExtractingPredicts(null)
    }
  }

  const handleSavePredicts = async () => {
    if (!predictPreview) return

    try {
      setSavingPredicts(true)

      // 组合数据：将每个预测与文章信息结合
      const predictsToSave = predictPreview.predicts.map(predict => ({
        content: predict.content,
        proposed_at: predictPreview.article.issue_date || new Date().toISOString().split('T')[0],
        interval_start: predict.interval_start,
        interval_end: predict.interval_end,
        predictor: predictPreview.article.contributor || '未知',
        assoc_type: 'article',
        assoc_article_id: predictPreview.article.id,
      }))

      const response = await fetch('/api/batch-create-predicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predicts: predictsToSave }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`成功保存 ${data.count} 个预测`)
        setPredictPreview(null)


        setPredictsSaved(appendPredictsSaved(predictPreview.article.id.toString()))
      } else {
        alert(data.message || '保存预测失败，请稍后重试')
      }
    } catch (error) {
      console.error('Failed to save predictions:', error)
      alert('保存预测失败，请稍后重试')
    } finally {
      setSavingPredicts(false)
    }
  }

  const handleRemovePredict = (index: number) => {
    if (!predictPreview) return
    const newPredicts = predictPreview.predicts.filter((_, idx) => idx !== index)
    setPredictPreview({
      ...predictPreview,
      predicts: newPredicts,
    })
  }



  const handleAddArticle = async (_e: React.FormEvent, values: typeof addArticleForm) => {
    if (!values.title.trim() || !values.source_url.trim() || !values.source_text.trim()) {
      alert('请填写标题、来源链接和原文内容')
      return
    }

    const articleData = {
      title: values.title.trim(),
      source_url: values.source_url.trim(),
      source_text: values.source_text.trim(),
      publication: values.publication.trim() || null,
      contributor: values.contributor.trim() || null,
      issue_date: values.issue_date || null,
    }

    const response = await fetch('/api/process-articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles: [articleData] }),
    })

    const data = await response.json()

    if (data.successful > 0) {
      alert('文章新增成功，已生成摘要和标签')
      setShowAddArticle(false)
      setAddArticleForm({ title: '', source_url: '', publication: '', issue_date: '', source_text: '', contributor: '' })
      await fetchArticles()
    } else if (data.skipped > 0) {
      alert('该文章已存在（来源链接重复）')
    } else {
      alert('文章处理失败，请稍后重试')
    }
  }

  const handleReanalyze = async (article: summary__article) => {
    if (!article.source_text) {
      alert('该文章没有原文内容，无法重新分析')
      return
    }

    const confirmResult = confirm(`确定要重新分析文章 "${article.title}" 吗？这将覆盖现有的分析结果。`)
    if (!confirmResult) return

    try {
      setReanalyzing(article.id.toString())
      const response = await fetch('/api/update-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles: [{
            source_url: article.source_url,
            title: article.title,
            contributor: article.contributor,
            publication: article.publication,
            issue_date: article.issue_date,
            source_text: article.source_text,
          }]
        }),
      })

      const data = await response.json()

      if (data.success && data.successful > 0) {
        alert('重新分析成功！')
        await fetchArticles()
      } else {
        alert('重新分析失败，请稍后重试')
      }
    } catch (error) {
      console.error('Failed to reanalyze article:', error)
      alert('重新分析失败，请稍后重试')
    } finally {
      setReanalyzing(null)
    }
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          📄 文章分析
        </h2>

        {/* 搜索栏 */}
        <div className="flex gap-4" onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}>
          <div className="flex-1">
            <TextInput placeholder="🔍 搜索标题..." value={searchTitle} onChange={setSearchTitle} />
          </div>
          <div className="flex-1 min-w-[180px]">
            <Select
              options={[{ label: '全部刊物', value: '' }, ...publications.map(pub => ({ label: pub, value: pub }))]}
              value={searchPublication}
              onChange={setSearchPublication}
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <TextInput placeholder="👤 搜索作者/贡献者..." value={searchContributor} onChange={setSearchContributor} />
          </div>
          <div className="flex-1 min-w-[180px]">
            <TextInput placeholder="📅 发布日期 (YYYY-MM-DD)" value={searchIssueDate} onChange={setSearchIssueDate} />
          </div>
          <div className="flex-1">
            <TextInput placeholder="🏷️ 搜索标签..." value={searchTags} onChange={setSearchTags} />
          </div>
          <Button onClick={handleSearch}>搜索</Button>
          <Button onClick={() => setShowAddArticle(true)} look="success">＋ 新增文章</Button>
        </div>
        <div className="flex gap-4 mt-4">
          <Button onClick={async () => {
            await ctools.collectLatestQIUSHIArticles()
          }}>获取求是</Button>
          <Button onClick={async () => {
            await ctools.collectLatestWSJArticles()
          }}>获取WSJ</Button>
          <Button onClick={async () => {
            await ctools.collectLatestEconomistArticles()
          }}>获取Economist Weekly Edition</Button>
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
                  <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {article.title}
                  </a>
                </h3>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-wrap gap-3">
                    {
                      article.contributor && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          <span>👤</span>
                          {article.contributor}
                        </span>
                      )
                    }
                    {article.publication && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        <span>📰</span>
                        {article.publication}
                      </span>
                    )}
                    {article.issue_date && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        <span>📅</span>
                        {
                          tools.toUTC(article.issue_date).toFormat(tools.DATE_FORMAT)
                        }
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {
                      !predictsSaved.includes(article.id.toString()) ? (
                        <Button onClick={async () => { await handleExtractPredicts(article.id) }} size="small">
                          🔮 获取预测
                        </Button>
                      ) : null
                    }
                    <Button onClick={async () => { await handleReanalyze(article) }} look="danger" size="small">
                      🔄 重新分析
                    </Button>
                  </div>
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

                <p
                  className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap mb-4"
                // onMouseEnter={(e) => {
                //   if (article.source_text) {
                //     setHoveredArticle(article)
                //     const rect = e.currentTarget.getBoundingClientRect()
                //     setTooltipPosition({
                //       x: rect.left,
                //       y: rect.bottom + 10
                //     })
                //   }
                // }}
                // onMouseLeave={() => setHoveredArticle(null)}
                >
                  {article.summary}
                </p>
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
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-8" />

      {/* 预测预览弹窗 */}
      {predictPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* 弹窗头部 */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">🔮 预测提取结果</h3>
                  <p className="text-purple-100 text-sm">{predictPreview.article.title}</p>
                </div>
                <button
                  onClick={() => setPredictPreview(null)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>

            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* 文章信息 */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <h4 className="text-lg font-bold text-slate-900 mb-3">📋 文章信息</h4>
                <div className="space-y-2 text-sm">
                  {predictPreview.article.publication && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">📰 刊物：</span>
                      <span className="text-slate-900 font-medium">{predictPreview.article.publication}</span>
                    </div>
                  )}
                  {predictPreview.article.issue_date && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">📅 日期：</span>
                      <span className="text-slate-900 font-medium">
                        {new Date(predictPreview.article.issue_date).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  )}
                  {predictPreview.article.contributor && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">👤 贡献者：</span>
                      <span className="text-slate-900 font-medium">{predictPreview.article.contributor}</span>
                    </div>
                  )}
                  {predictPreview.article.tags && (
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500">🏷️ 标签：</span>
                      <div className="flex flex-wrap gap-2">
                        {predictPreview.article.tags.split(',').map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs font-medium"
                          >
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 预测列表 */}
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-4">
                  🎯 提取到的预测 ({predictPreview.predicts.length})
                </h4>
                {predictPreview.predicts.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <div className="text-4xl mb-2">🤷</div>
                    <p className="text-slate-500">未提取到预测</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {predictPreview.predicts.map((predict, idx) => (
                      <div
                        key={idx}
                        className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 text-sm text-slate-600">
                              <span className="font-medium">📅 时间区间：</span>
                              <span className="font-mono bg-white px-2 py-0.5 rounded">
                                {predict.interval_start}
                              </span>
                              <span className="text-slate-400">→</span>
                              <span className="font-mono bg-white px-2 py-0.5 rounded">
                                {predict.interval_end}
                              </span>
                              <Button onClick={() => handleRemovePredict(idx)} look="danger" size="tiny" className="ml-10">
                                ✕ 移除此预测
                              </Button>
                            </div>
                            <div className="text-slate-900 leading-relaxed">{predict.content}</div>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end gap-3">
              <Button look="cancel" size="small" onClick={() => setPredictPreview(null)}>关闭</Button>
              <Button
                size="small"
                onClick={handleSavePredicts}
                disabled={predictPreview.predicts.length === 0}
              >
                保存预测
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 原文悬浮提示 */}
      {hoveredArticle && hoveredArticle.source_text && (
        <div
          className="fixed z-[60] bg-white rounded-lg shadow-2xl border-2 border-slate-300 max-w-3xl max-h-[600px] overflow-y-auto"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: tooltipPosition.y > window.innerHeight / 2 ? 'translateY(calc(-100% - 20px))' : 'none'
          }}
        >
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-lg">
            <h4 className="font-bold text-lg">📄 文章原文</h4>
          </div>
          <div className="p-6">
            <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
              {hoveredArticle.source_text}
            </p>
          </div>
        </div>
      )}

      {/* 新增文章弹窗 */}
      <ModalForm
        open={showAddArticle}
        onClose={() => setShowAddArticle(false)}
        title="✍️ 新增文章"
        values={addArticleForm}
        onValuesChange={setAddArticleForm}
        onSubmit={handleAddArticle}
        submitText="提交并生成摘要"
        maxWidth="xl"
      >
        <FormLabel label="标题" required>
          <FormItem field="title">
            <TextInput placeholder="输入文章标题" />
          </FormItem>
        </FormLabel>
        <FormLabel label="来源链接" required>
          <FormItem field="source_url">
            <TextInput placeholder="输入文章来源 URL" />
          </FormItem>
        </FormLabel>
        <div className="grid grid-cols-2 gap-4">
          <FormLabel label="刊物">
            <FormItem field="publication">
              <TextInput placeholder="如：求是、WSJ、The Economist" />
            </FormItem>
          </FormLabel>
          <FormLabel label="发布日期">
            <FormItem field="issue_date">
              <TextInput placeholder="YYYY-MM-DD" />
            </FormItem>
          </FormLabel>
        </div>
        <FormLabel label="撰稿人/贡献者">
          <FormItem field="contributor">
            <TextInput placeholder="输入撰稿人或贡献者" />
          </FormItem>
        </FormLabel>
        <FormLabel label="原文内容" required>
          <div>
            <textarea
              value={addArticleForm.source_text}
              onChange={(e) => setAddArticleForm({ ...addArticleForm, source_text: e.target.value })}
              placeholder="粘贴文章原文内容..."
              rows={10}
              className="w-full px-4 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-slate-900 transition-all duration-200 resize-y"
            />
          </div>
        </FormLabel>
      </ModalForm>
    </div>
  )
}
