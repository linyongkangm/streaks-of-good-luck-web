'use client'

import { useState, useEffect, useCallback } from 'react'
import type { IndustryWithArticles } from '@/types'
import Placeholder from '@/app/widget/Placeholder'
import IndustryAnalysisIndustryList from './IndustryAnalysisIndustryList'
import IndustryAnalysisIndustryInfo from './IndustryAnalysisIndustryInfo'
import IndustryAnalysisRelateArticles from './IndustryAnalysisRelateArticles'
import IndustryAnalysisArticleModal from './IndustryAnalysisArticleModal'
import IndustryAnalysisTimeLine from './IndustryAnalysisTimeLine'
import IndustryAnalysisCoreStats from './IndustryAnalysisCoreStats'
export default function IndustryAnalysis() {
  const [selectedIndustryId, setSelectedIndustryId] = useState<number | null>(null)
  const [industryListRefreshKey, setIndustryListRefreshKey] = useState(0)
  const refreshIndustryList = useCallback(() => setIndustryListRefreshKey(k => k + 1), [])

  // 行业详情 + 关联文章
  const [industryDetail, setIndustryDetail] = useState<IndustryWithArticles | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // 关联文章弹窗
  const [showLinkArticle, setShowLinkArticle] = useState(false)

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

  // 刷新详情和列表
  const refreshAfterChange = useCallback(async () => {
    if (selectedIndustryId) {
      await fetchIndustryDetail(selectedIndustryId)
      refreshIndustryList()
    }
  }, [selectedIndustryId, fetchIndustryDetail, refreshIndustryList])

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
            {industryDetail && selectedIndustryId && (
              <div className="space-y-4">
                {/* 行业信息头 */}
                <IndustryAnalysisIndustryInfo
                  industryDetail={industryDetail}
                  onOpenLinkArticle={() => setShowLinkArticle(true)}
                />
                
                {/* 核心统计和统计口径 */}
                <IndustryAnalysisCoreStats industryId={selectedIndustryId} />
                
                {/* 行业里程碑时间轴 */}
                <IndustryAnalysisTimeLine industryId={selectedIndustryId} />
                
                {/* 文章按年份分组 */}
                <IndustryAnalysisRelateArticles
                  industryDetail={industryDetail}
                  onOpenLinkArticle={() => setShowLinkArticle(true)}
                  onAfterUnlink={refreshAfterChange}
                />
              </div>
            )}
          </Placeholder>
        </div>
      </div>

      {/* 关联文章弹窗 */}
      <IndustryAnalysisArticleModal
        open={showLinkArticle}
        onClose={() => setShowLinkArticle(false)}
        industryDetail={industryDetail}
        onAfterLink={refreshAfterChange}
      />
    </div>
  )
}
