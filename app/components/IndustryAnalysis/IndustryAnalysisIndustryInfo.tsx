'use client'

import type { IndustryWithArticles } from '@/types'
import Button from '@/app/widget/Button'
import Panel from '@/app/widget/Panel'

interface IndustryAnalysisIndustryInfoProps {
  industryDetail: IndustryWithArticles
  onOpenLinkArticle: () => void
}

export default function IndustryAnalysisIndustryInfo({
  industryDetail,
  onOpenLinkArticle,
}: IndustryAnalysisIndustryInfoProps) {
  return (
    <Panel
      title={`${industryDetail.name} (${industryDetail.relation__industry_articles.length}篇关联文章)`}
      headerAction={<Button size="small" onClick={onOpenLinkArticle}>＋ 关联文章</Button>}>
    </Panel>
  )
}
