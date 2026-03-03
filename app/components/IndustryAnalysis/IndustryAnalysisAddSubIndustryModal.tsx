'use client'

import { useState, useEffect, useMemo } from 'react'
import Modal from '@/app/widget/Modal'
import Button from '@/app/widget/Button'
import Loading from '@/app/widget/Loading'
import type { info__industry } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  industryId: number
  calibrationId: number
  existingSubIndustryIds: number[]
  onAfterAdd: () => void
}

export default function IndustryAnalysisAddSubIndustryModal({
  open,
  onClose,
  industryId,
  calibrationId,
  existingSubIndustryIds,
  onAfterAdd,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [industries, setIndustries] = useState<info__industry[]>([])
  const [selectedSubIndustryIds, setSelectedSubIndustryIds] = useState<number[]>([])
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    if (open) {
      loadIndustries()
    }
  }, [open])

  const loadIndustries = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/industries')
      const result = await response.json()
      setIndustries(result.data || [])
    } catch (error) {
      console.error('Failed to load industries:', error)
    } finally {
      setLoading(false)
    }
  }

  // 过滤出可选的子行业（排除当前行业和已关联的子行业）
  const availableSubIndustries = useMemo(
    () => industries.filter(
      industry => industry.id !== industryId && !existingSubIndustryIds.includes(industry.id)
    ),
    [industries, industryId, existingSubIndustryIds]
  )

  const toggleSubIndustrySelection = (subIndustryId: number) => {
    setSelectedSubIndustryIds(prev =>
      prev.includes(subIndustryId)
        ? prev.filter(id => id !== subIndustryId)
        : [...prev, subIndustryId]
    )
  }

  // 自动为子行业关联父行业的模板
  const autoLinkParentTemplatesToSubIndustries = async (subIndustryIds: number[]) => {
    try {
      const parentResponse = await fetch(`/api/industries/${industryId}`)
      const parentResult = await parentResponse.json()
      
      if (!parentResult.data?.relation__industry_or_company_core_statistic_template) {
        return
      }

      const parentTemplates = parentResult.data.relation__industry_or_company_core_statistic_template

      await Promise.all(
        subIndustryIds.map(async (subIndustryId) => {
          try {
            const subResponse = await fetch(`/api/industries/${subIndustryId}`)
            const subResult = await subResponse.json()
            
            const subTemplateIds = new Set(
              (subResult.data?.relation__industry_or_company_core_statistic_template || [])
                .map((t: any) => t.core_statistic_template_id)
            )

            const templatesToLink = parentTemplates.filter(
              (t: any) => !subTemplateIds.has(t.core_statistic_template_id)
            )

            await Promise.all(
              templatesToLink.map(async (template: any) => {
                try {
                  await fetch(`/api/industries/${subIndustryId}/templates`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      template_id: template.core_statistic_template_id,
                      rename: template.rename,
                    }),
                  })
                } catch (error) {
                  console.error(`Failed to link template to sub-industry ${subIndustryId}:`, error)
                }
              })
            )
          } catch (error) {
            console.error(`Failed to process sub-industry ${subIndustryId}:`, error)
          }
        })
      )
    } catch (error) {
      console.error('Failed to auto-link templates:', error)
    }
  }

  const handleAddSubIndustries = async () => {
    if (selectedSubIndustryIds.length === 0) {
      alert('请至少选择一个子行业')
      return
    }

    setLinking(true)
    try {
      const response = await fetch(`/api/industries/${industryId}/calibrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calibration_id: calibrationId,
          sub_industry_ids: selectedSubIndustryIds,
        }),
      })

      const result = await response.json()
      if (result.error) {
        alert(result.error)
        return
      }

      // 自动为新添加的子行业关联父行业的模板
      await autoLinkParentTemplatesToSubIndustries(selectedSubIndustryIds)

      onAfterAdd()
      handleClose()
    } catch (error) {
      console.error('Failed to add sub-industries:', error)
      alert('添加子行业失败')
    } finally {
      setLinking(false)
    }
  }

  const handleClose = () => {
    setSelectedSubIndustryIds([])
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="添加子行业" maxWidth="lg">
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loading />
          </div>
        ) : availableSubIndustries.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            暂无可添加的子行业
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择要添加的子行业（至少一个）
              </label>
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                {availableSubIndustries.map(subIndustry => (
                  <label key={subIndustry.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedSubIndustryIds.includes(subIndustry.id)}
                      onChange={() => toggleSubIndustrySelection(subIndustry.id)}
                      className="h-4 w-4"
                    />
                    <span>{subIndustry.name}</span>
                    {subIndustry.description && (
                      <span className="text-xs text-gray-500 ml-auto">{subIndustry.description}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button look="cancel" size="small" onClick={handleClose}>
                取消
              </Button>
              <Button
                look="primary"
                size="small"
                onClick={handleAddSubIndustries}
                disabled={selectedSubIndustryIds.length === 0 || linking}
              >
                {linking ? '添加中...' : '添加子行业'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
