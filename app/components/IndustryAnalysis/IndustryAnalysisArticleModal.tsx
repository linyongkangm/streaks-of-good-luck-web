'use client'

import { useState, useEffect } from 'react'
import type { summary__article, IndustryWithArticles, MilestoneWithRelations } from '@/types'
import * as tools from '@/app/tools'
import Button from '@/app/widget/Button'
import Modal from '@/app/widget/Modal'
import IndustryAnalysisMilestoneModal from './IndustryAnalysisMilestoneModal'
import { DateTime } from 'luxon'

interface Props {
  open: boolean
  onClose: () => void
  industryDetail: IndustryWithArticles | null
  onAfterLink: () => void
}

/* 关联文章弹窗 */
export default function IndustryAnalysisArticleModal({
  open,
  onClose,
  industryDetail,
  onAfterLink,
}: Props) {
  const [articleSearchTitle, setArticleSearchTitle] = useState('')
  const [articleSearchResults, setArticleSearchResults] = useState<summary__article[]>([])
  const [searchingArticles, setSearchingArticles] = useState(false)
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false)
  const [milestoneInitialValues, setMilestoneInitialValues] = useState<Partial<MilestoneWithRelations> | null>(null)

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
    if (!industryDetail) return
    const response = await fetch(`/api/industries/${industryDetail.id}/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: articleId.toString() }),
    })
    const data = await response.json()
    if (data.error) {
      alert(data.error)
      return
    }
    onAfterLink()
  }

  // 自动搜索包含行业名的文章
  useEffect(() => {
    if (open && industryDetail?.name) {
      handleAutoSearchArticles()
    }
  }, [open, industryDetail?.name])

  const handleAutoSearchArticles = async () => {
    if (!industryDetail?.name) return
    setSearchingArticles(true)
    try {
      const params = new URLSearchParams({ tags: industryDetail.name, limit: '100' })
      const response = await fetch(`/api/article-summaries?${params}`)
      const data = await response.json()
      // 过滤：只保留未关联的文章（服务端已按tags包含行业名进行过滤）
      const filtered = (data.data || []).filter((article: summary__article) => {
        const alreadyLinked = industryDetail?.relation__industry_articles.some(
          r => String(r.summary__article.id) === String(article.id)
        )
        return !alreadyLinked
      })
      setArticleSearchResults(filtered)
      setArticleSearchTitle(industryDetail.name)
    } catch (error) {
      console.error('Failed to auto search articles:', error)
    } finally {
      setSearchingArticles(false)
    }
  }

  const handleClose = () => {
    setArticleSearchTitle('')
    setArticleSearchResults([])
    setMilestoneModalOpen(false)
    setMilestoneInitialValues(null)
    onClose()
  }

  // 生成事件（打开事件编辑弹窗）
  const handleGenerateEvent = (article: summary__article) => {
    setMilestoneInitialValues({
      title: article.title,
      description: article.summary || '',
      milestone_date: article.issue_date ?? undefined,
      keyword: '',
    })
    setMilestoneModalOpen(true)
  }

  // 事件创建成功后的处理
  const handleMilestoneSuccess = async () => {
    setMilestoneModalOpen(false)
    setMilestoneInitialValues(null)
    onAfterLink()
  }

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
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
                ) : (<>
                  <Button
                    size="tiny"
                    look="primary"
                    onClick={() => handleGenerateEvent(article)}
                  >
                    生成事件
                  </Button>
                  <Button
                    size="tiny"
                    look="success"
                    onClick={() => handleLinkArticle(article.id)}
                  >
                    关联
                  </Button>
                </>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400 text-sm">
          {articleSearchTitle ? '未找到相关文章' : '打开弹窗时自动搜索包含行业名的文章'}
        </div>
      )}
      </Modal>

      {/* 生成事件弹窗 */}
      <IndustryAnalysisMilestoneModal
        open={milestoneModalOpen}
        onClose={() => {
          setMilestoneModalOpen(false)
          setMilestoneInitialValues(null)
        }}
        onSuccess={handleMilestoneSuccess}
        industryId={industryDetail?.id}
        initialValues={milestoneInitialValues}
      />
    </>
  )
}
