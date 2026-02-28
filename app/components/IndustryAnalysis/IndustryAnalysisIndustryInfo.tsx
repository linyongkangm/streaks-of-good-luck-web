'use client'

import type { IndustryWithArticles } from '@/types'
import Button from '@/app/widget/Button'

interface IndustryAnalysisIndustryInfoProps {
  industryDetail: IndustryWithArticles
  onOpenLinkArticle: () => void
}

export default function IndustryAnalysisIndustryInfo({
  industryDetail,
  onOpenLinkArticle,
}: IndustryAnalysisIndustryInfoProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-slate-900">
          {industryDetail.name}
        </h2>
        <Button size="small" onClick={onOpenLinkArticle}>
          ＋ 关联文章
        </Button>
      </div>
      {industryDetail.description && (
        <p className="text-slate-500 text-sm">{industryDetail.description}</p>
      )}
      <p className="text-slate-400 text-xs mt-2">
        共 {industryDetail.relation__industry_articles.length} 篇关联文章
      </p>
    </div>
  )
}
