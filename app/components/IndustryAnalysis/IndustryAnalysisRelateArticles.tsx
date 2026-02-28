'use client'

import { useState, useMemo } from 'react'
import type { summary__article, IndustryWithArticles } from '@/types'
import * as tools from '@/app/tools'
import Button from '@/app/widget/Button'
import Panel from '@/app/widget/Panel'

interface Props {
  industryDetail: IndustryWithArticles;
  onOpenLinkArticle: () => void;
  onAfterUnlink: () => void;
}

/* 文章按年份分组展示 */
export default function IndustryAnalysisRelateArticles({
  industryDetail,
  onOpenLinkArticle,
  onAfterUnlink,
}: Props) {
  // 年份折叠
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([new Date().getFullYear()]))

  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  // 关联文章按年份分组
  const articlesByYear = useMemo(() => {
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

  // 移除文章关联
  const handleUnlinkArticle = async (articleId: bigint) => {
    if (!confirm('确定要移除此文章的关联吗？')) return
    const response = await fetch(`/api/industries/${industryDetail.id}/articles`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: articleId.toString() }),
    })
    const data = await response.json()
    if (data.error) {
      alert(data.error)
      return
    }
    onAfterUnlink()
  }
  if (articlesByYear.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg flex flex-col items-center justify-center py-20">
        <div className="text-5xl mb-3">📭</div>
        <p className="text-slate-400">暂无关联文章</p>
        <Button size="small" className="mt-4" onClick={onOpenLinkArticle}>
          关联文章
        </Button>
      </div>
    )
  }

  return articlesByYear.map(([year, yearArticles]) => {
    const isExpanded = expandedYears.has(year)
    const yearLabel = year === 0 ? '未知年份' : `${year} 年`

    return (
      <Panel
        key={year}
        title={(
          <button onClick={() => toggleYear(year)}>
            <div className="flex items-center gap-3">
              <span className={`text-lg transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                ▶
              </span>
              <h3 className="text-xl font-bold text-slate-900">{yearLabel}</h3>
              <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                {yearArticles.length} 篇
              </span>
            </div>
          </button>)}
      >
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
      </Panel>
    )
  })
}
