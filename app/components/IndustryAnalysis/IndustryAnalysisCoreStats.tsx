'use client'

import { useState, useEffect } from 'react'
import Panel from '@/app/widget/Panel'
import Select from '@/app/widget/Select'
import Button from '@/app/widget/Button'
import Loading from '@/app/widget/Loading'
import IndustryAnalysisCoreStatsCard from './IndustryAnalysisCoreStatsCard'
import IndustryAnalysisCoreStatsTemplateModal from './IndustryAnalysisCoreStatsTemplateModal'
import IndustryAnalysisCoreDataModal from './IndustryAnalysisCoreDataModal'
import IndustryAnalysisCoreStatsCalibrationModal from './IndustryAnalysisCoreStatsCalibrationModal'
import type {
  IndustryTemplateRelation,
  IndustryCalibrationRelation,
  info__core_data
} from '@/types'

interface Props {
  industryId: number
}

interface CalibrationOption {
  label: string
  value: number
}

export default function IndustryAnalysisCoreStats({ industryId }: Props) {
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<IndustryTemplateRelation[]>([])
  const [coreDataList, setCoreDataList] = useState<info__core_data[]>([])
  const [calibrations, setCalibrations] = useState<IndustryCalibrationRelation[]>([])
  const [selectedCalibrationId, setSelectedCalibrationId] = useState<number | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showCalibrationModal, setShowCalibrationModal] = useState(false)
  const [showCoreDataModal, setShowCoreDataModal] = useState(false)
  const [coreDataTemplate, setCoreDataTemplate] = useState<IndustryTemplateRelation | null>(null)
  const [coreDataIndustryId, setCoreDataIndustryId] = useState<number>(industryId)

  // 加载行业数据
  useEffect(() => {
    loadIndustryData()
  }, [industryId])

  const loadIndustryData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/industries/${industryId}`)
      const result = await response.json()

      if (result.data) {
        setTemplates(result.data.relation__industry_or_company_core_statistic_template || [])
        setCoreDataList(result.data.info__core_data || [])
        setCalibrations(result.data.relation__industry_or_company_calibration_industry || [])

        // 默认选择第一个口径
        if (result.data.relation__industry_or_company_calibration_industry?.length > 0) {
          const firstCalibration = result.data.relation__industry_or_company_calibration_industry[0]
          setSelectedCalibrationId(firstCalibration.calibration_id)
        }
      }
    } catch (error) {
      console.error('Failed to load industry data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 获取唯一的口径列表
  const calibrationOptions: CalibrationOption[] = Array.from(
    new Map(
      calibrations.map(c => [
        c.calibration_id,
        { label: c.info__calibration.name, value: c.calibration_id }
      ])
    ).values()
  )

  // 根据选中的口径获取子行业列表
  const subIndustries = selectedCalibrationId
    ? calibrations
      .filter(c => c.calibration_id === selectedCalibrationId)
      .map(c => c.sub_industry)
    : []

  const openCoreDataModal = (template: IndustryTemplateRelation, targetIndustryId: number) => {
    setCoreDataTemplate(template)
    setCoreDataIndustryId(targetIndustryId)
    setShowCoreDataModal(true)
  }

  return (
    <>
      <Panel
        title="核心统计"
        headerAction={
          <div className="flex items-center gap-3">
            {calibrationOptions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 whitespace-nowrap">统计口径：</span>
                <Select<number>
                  options={calibrationOptions}
                  value={selectedCalibrationId ?? undefined}
                  onChange={(value: number) => setSelectedCalibrationId(value)}
                  placeholder="选择口径..."
                  className="w-48"
                />
              </div>
            )}
            <Button look="primary" size="small" onClick={() => setShowTemplateModal(true)}>
              + 关联模板
            </Button>
            <Button look="primary" size="small" onClick={() => setShowCalibrationModal(true)}>
              + 关联口径
            </Button>

          </div>
        }
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <Loading />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            暂无核心统计模板，请先关联模板
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">当前行业</h3>
              <div className="space-y-2">
                {templates.map(template => {
                  const relatedDataList = coreDataList.filter(
                    cd => cd.table === template.info__core_statistic_template.relate_table &&
                      cd.industry_id === industryId
                  )
                  return (
                    <IndustryAnalysisCoreStatsCard
                      key={template.id}
                      template={template.info__core_statistic_template}
                      customName={template.rename}
                      coreDataList={relatedDataList}
                      industryId={industryId}
                      onAddData={() => openCoreDataModal(template, industryId)}
                      onUnlink={loadIndustryData}
                    />
                  )
                })}
              </div>
            </div>

            {/* 如果选择了口径，按子行业分组显示 */}
            {selectedCalibrationId && subIndustries.length > 0 && (
              <div className="space-y-6">
                {subIndustries.map(subIndustry => (
                  <div key={subIndustry.id}>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      {subIndustry.name}
                    </h3>
                    <div className="space-y-2">
                      {templates.map(template => {
                        const relatedDataList = coreDataList.filter(
                          cd => cd.table === template.info__core_statistic_template.relate_table &&
                            cd.industry_id === subIndustry.id
                        )
                        return (
                          <IndustryAnalysisCoreStatsCard
                            key={`${subIndustry.id}-${template.id}`}
                            template={template.info__core_statistic_template}
                            customName={template.rename}
                            coreDataList={relatedDataList}
                            industryId={subIndustry.id}
                            onAddData={() => openCoreDataModal(template, subIndustry.id)}
                            onUnlink={loadIndustryData}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 如果选择了口径但没有子行业 */}
            {selectedCalibrationId && subIndustries.length === 0 && (
              <div className="text-gray-500 text-center py-8">
                该口径下暂无子行业数据
              </div>
            )}
          </div>
        )}
      </Panel>

      <IndustryAnalysisCoreStatsTemplateModal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        industryId={industryId}
        onAfterLink={loadIndustryData}
      />

      <IndustryAnalysisCoreStatsCalibrationModal
        open={showCalibrationModal}
        onClose={() => setShowCalibrationModal(false)}
        industryId={industryId}
        onAfterLink={loadIndustryData}
      />

      <IndustryAnalysisCoreDataModal
        open={showCoreDataModal}
        onClose={() => {
          setShowCoreDataModal(false)
          setCoreDataTemplate(null)
        }}
        industryId={coreDataIndustryId}
        templateRelation={coreDataTemplate}
        onAfterSave={loadIndustryData}
      />
    </>
  )
}
