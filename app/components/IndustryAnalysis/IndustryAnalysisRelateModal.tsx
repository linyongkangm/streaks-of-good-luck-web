'use client'

import { useState } from 'react'
import type { summary__article, IndustryWithArticles } from '@/types'
import * as tools from '@/app/tools'
import Button from '@/app/widget/Button'
import Modal from '@/app/widget/Modal'

interface Props {
  open: boolean
  onClose: () => void
  industryDetail: IndustryWithArticles | null
  onLinkArticle: (articleId: bigint) => Promise<void>
}

/* 关联文章弹窗 */
export default function IndustryAnalysisRelateModal({
  open,
  onClose,
  industryDetail,
  onLinkArticle,
}: Props) {
  const [articleSearchTitle, setArticleSearchTitle] = useState('')
  const [articleSearchResults, setArticleSearchResults] = useState<summary__article[]>([])
  const [searchingArticles, setSearchingArticles] = useState(false)

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

  const handleClose = () => {
    setArticleSearchTitle('')
    setArticleSearchResults([])
    onClose()
  }

  return (
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
                ) : (
                  <Button
                    size="tiny"
                    look="success"
                    onClick={() => onLinkArticle(article.id)}
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
  )
}
