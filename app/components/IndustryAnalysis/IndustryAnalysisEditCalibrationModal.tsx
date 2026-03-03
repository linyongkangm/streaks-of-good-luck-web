'use client'

import { useState, useEffect, useMemo } from 'react'
import Modal from '@/app/widget/Modal'
import Button from '@/app/widget/Button'
import Loading from '@/app/widget/Loading'
import { TextInput } from '@/app/widget/Input'
import type { info__industry, info__calibration } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  industryId: number
  calibrationId: number
  calibrationName: string
  calibrationDescription?: string
  linkedSubIndustryIds: number[]
  onAfterSave: () => void
}

type ModalMode = 'view' | 'edit' | 'manage-subindustries'

export default function IndustryAnalysisEditCalibrationModal({
  open,
  onClose,
  industryId,
  calibrationId,
  calibrationName,
  calibrationDescription,
  linkedSubIndustryIds,
  onAfterSave,
}: Props) {
  const [mode, setMode] = useState<ModalMode>('view')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [industries, setIndustries] = useState<info__industry[]>([])
  const [calibration, setCalibration] = useState<info__calibration | null>(null)

  const [editName, setEditName] = useState(calibrationName)
  const [editDescription, setEditDescription] = useState(calibrationDescription || '')

  const [baseSubIndustryIds, setBaseSubIndustryIds] = useState<number[]>(linkedSubIndustryIds)
  const [selectedSubIndustryIds, setSelectedSubIndustryIds] = useState<number[]>(linkedSubIndustryIds)

  useEffect(() => {
    if (open) {
      loadData()
      setEditName(calibrationName)
      setEditDescription(calibrationDescription || '')
      setBaseSubIndustryIds(linkedSubIndustryIds)
      setSelectedSubIndustryIds(linkedSubIndustryIds)
    }
  }, [open, calibrationId, calibrationName, calibrationDescription, linkedSubIndustryIds])

  const loadData = async () => {
    setLoading(true)
    try {
      const [calibrationRes, industriesRes] = await Promise.all([
        fetch(`/api/calibrations/${calibrationId}`),
        fetch('/api/industries'),
      ])

      if (calibrationRes.ok) {
        const calibrationResult = await calibrationRes.json()
        setCalibration(calibrationResult.data)
      }

      if (industriesRes.ok) {
        const industriesResult = await industriesRes.json()
        setIndustries(industriesResult.data || [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const availableSubIndustries = useMemo(
    () => industries.filter(industry => industry.id !== industryId),
    [industries, industryId]
  )

  const toggleSubIndustrySelection = (subIndustryId: number) => {
    setSelectedSubIndustryIds(prev =>
      prev.includes(subIndustryId)
        ? prev.filter(id => id !== subIndustryId)
        : [...prev, subIndustryId]
    )
  }

  const handleSaveCalibrationInfo = async () => {
    if (!editName.trim()) {
      alert('口径名称不能为空')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/calibrations/${calibrationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
        }),
      })

      const result = await response.json()
      if (result.error) {
        alert(result.error)
        return
      }

      onAfterSave()
      setMode('view')
    } catch (error) {
      console.error('Failed to save calibration:', error)
      alert('保存口径信息失败')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSubIndustries = async () => {
    setSaving(true)
    try {
      const toAdd = selectedSubIndustryIds.filter(id => !baseSubIndustryIds.includes(id))
      const toRemove = baseSubIndustryIds.filter(id => !selectedSubIndustryIds.includes(id))

      // 添加新的子行业
      if (toAdd.length > 0) {
        const addResponse = await fetch(`/api/industries/${industryId}/calibrations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            calibration_id: calibrationId,
            sub_industry_ids: toAdd,
          }),
        })

        const addResult = await addResponse.json()
        if (addResult.error) {
          alert(addResult.error)
          return
        }

        // 自动为新添加的子行业关联父行业的模板
        await autoLinkParentTemplatesToSubIndustries(toAdd)
      }

      // 删除移除的子行业
      if (toRemove.length > 0) {
        await Promise.all(
          toRemove.map(subIndustryId =>
            fetch(`/api/industries/${industryId}/calibrations?calibration_id=${calibrationId}&sub_industry_id=${subIndustryId}`, {
              method: 'DELETE',
            })
          )
        )
      }

      onAfterSave()
      setMode('view')
    } catch (error) {
      console.error('Failed to save sub-industries:', error)
      alert('保存子行业关联失败')
    } finally {
      setSaving(false)
    }
  }

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

  const handleClose = () => {
    setMode('view')
    onClose()
  }

  const linkedSubIndustries = availableSubIndustries.filter(i => selectedSubIndustryIds.includes(i.id))

  return (
    <Modal open={open} onClose={handleClose} title="编辑口径" maxWidth="lg">
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loading />
          </div>
        ) : mode === 'view' ? (
          <>
            {/* 查看模式 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">口径名称</label>
                <div className="text-base text-gray-900 font-medium">{calibrationName}</div>
              </div>

              {calibrationDescription && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">口径描述</label>
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{calibrationDescription}</div>
                </div>
              )}

              {linkedSubIndustries.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">关联的子行业</label>
                  <div className="space-y-2">
                    {linkedSubIndustries.map(industry => (
                      <div key={industry.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm text-gray-700">{industry.name}</span>
                        {industry.description && (
                          <span className="text-xs text-gray-500 ml-2">{industry.description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {linkedSubIndustries.length === 0 && (
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded text-center">
                  暂无关联子行业
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button look="secondary" size="small" onClick={() => setMode('edit')}>
                  编辑基本信息
                </Button>
                <Button look="secondary" size="small" onClick={() => setMode('manage-subindustries')}>
                  管理子行业
                </Button>
                <Button look="cancel" size="small" onClick={handleClose}>
                  关闭
                </Button>
              </div>
            </div>
          </>
        ) : mode === 'edit' ? (
          <>
            {/* 编辑信息模式 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  口径名称 <span className="text-red-500">*</span>
                </label>
                <TextInput
                  value={editName}
                  onChange={setEditName}
                  placeholder="输入口径名称..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">口径描述</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  placeholder="输入口径描述..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button look="cancel" size="small" onClick={() => setMode('view')} disabled={saving}>
                  取消
                </Button>
                <Button look="primary" size="small" onClick={handleSaveCalibrationInfo} disabled={saving}>
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* 管理子行业模式 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择关联的子行业
                </label>
                {availableSubIndustries.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-8">暂无可选行业</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                    {availableSubIndustries.map(industry => (
                      <label key={industry.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedSubIndustryIds.includes(industry.id)}
                          onChange={() => toggleSubIndustrySelection(industry.id)}
                          className="h-4 w-4"
                        />
                        <span>{industry.name}</span>
                        {industry.description && (
                          <span className="text-xs text-gray-500 ml-auto">{industry.description}</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button look="cancel" size="small" onClick={() => setMode('view')} disabled={saving}>
                  取消
                </Button>
                <Button look="primary" size="small" onClick={handleSaveSubIndustries} disabled={saving}>
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
