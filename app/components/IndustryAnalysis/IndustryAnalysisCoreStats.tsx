'use client'

import { useState, useEffect } from 'react'
import Panel from '@/app/widget/Panel'
import Select from '@/app/widget/Select'
import Loading from '@/app/widget/Loading'
import IndustryAnalysisCoreStatsCard from './IndustryAnalysisCoreStatsCard'
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

  // 获取子行业的核心数据
  const getSubIndustryCoreData = (subIndustryId: number) => {
    return coreDataList.filter(cd => cd.industry_id === subIndustryId)
  }

  // 如果没有模板，显示提示
  if (!loading && templates.length === 0) {
    return (
      <Panel title="核心统计">
        <div className="text-gray-500 text-center py-8">
          暂无核心统计模板，请先关联模板
        </div>
      </Panel>
    )
  }

  return (
    <Panel
      title="核心统计"
      headerAction={
        calibrationOptions.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">统计口径：</span>
            <Select<number>
              options={calibrationOptions}
              value={selectedCalibrationId ?? undefined}
              onChange={(value: number) => setSelectedCalibrationId(value)}
              placeholder="选择口径..."
              className="w-48"
            />
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Loading />
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">当前行业</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => {
                const relatedData = coreDataList.find(
                  cd => cd.table === template.info__core_statistic_template.relate_table &&
                    cd.industry_id === industryId
                )
                return (
                  <IndustryAnalysisCoreStatsCard
                    key={template.id}
                    template={template.info__core_statistic_template}
                    customName={template.rename}
                    coreData={relatedData}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map(template => {
                      const relatedData = coreDataList.find(
                        cd => cd.table === template.info__core_statistic_template.relate_table &&
                          cd.industry_id === subIndustry.id
                      )
                      return (
                        <IndustryAnalysisCoreStatsCard
                          key={`${subIndustry.id}-${template.id}`}
                          template={template.info__core_statistic_template}
                          customName={template.rename}
                          coreData={relatedData}
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
  )
}
