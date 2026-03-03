'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from '@/app/widget/Modal'
import Button from '@/app/widget/Button'
import Radio from '@/app/widget/Radio'
import Loading from '@/app/widget/Loading'
import { TextInput } from '@/app/widget/Input'
import type {
  info__calibration,
  info__industry,
  IndustryCalibrationRelation,
} from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  industryId: number
  onAfterLink: () => void
}

type ModalMode = 'linked' | 'unlinked' | 'create'

export default function IndustryAnalysisCoreStatsCalibrationModal({
  open,
  onClose,
  industryId,
  onAfterLink,
}: Props) {
  const [mode, setMode] = useState<ModalMode>('unlinked')
  const [loading, setLoading] = useState(false)

  const [calibrations, setCalibrations] = useState<info__calibration[]>([])
  const [linkedCalibrationRelations, setLinkedCalibrationRelations] = useState<IndustryCalibrationRelation[]>([])
  const [industries, setIndustries] = useState<info__industry[]>([])

  const [selectedCalibrationId, setSelectedCalibrationId] = useState<number | null>(null)
  const [selectedSubIndustryIds, setSelectedSubIndustryIds] = useState<number[]>([])

  const [newCalibrationName, setNewCalibrationName] = useState('')
  const [newCalibrationDescription, setNewCalibrationDescription] = useState('')
  const [createSubIndustryIds, setCreateSubIndustryIds] = useState<number[]>([])

  // 编辑已关联口径的子行业
  const [editingCalibrationId, setEditingCalibrationId] = useState<number | null>(null)
  const [editingSubIndustryIds, setEditingSubIndustryIds] = useState<number[]>([])

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    setLoading(true)
    try {
      const [calibrationResponse, industryResponse, industriesResponse] = await Promise.all([
        fetch('/api/calibrations'),
        fetch(`/api/industries/${industryId}`),
        fetch('/api/industries'),
      ])

      const calibrationResult = await calibrationResponse.json()
      const industryResult = await industryResponse.json()
      const industriesResult = await industriesResponse.json()

      setCalibrations(calibrationResult.data || [])
      setLinkedCalibrationRelations(industryResult.data?.relation__industry_or_company_calibration_industry || [])
      setIndustries(industriesResult.data || [])
    } catch (error) {
      console.error('Failed to load calibrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const linkedCalibrationIds = useMemo(
    () => new Set(linkedCalibrationRelations.map(item => item.calibration_id)),
    [linkedCalibrationRelations]
  )

  const unlinkedCalibrations = useMemo(
    () => calibrations.filter(calibration => !linkedCalibrationIds.has(calibration.id)),
    [calibrations, linkedCalibrationIds]
  )

  const availableSubIndustries = useMemo(
    () => industries.filter(industry => industry.id !== industryId),
    [industries, industryId]
  )

  const linkedCalibrationGroups = useMemo(() => {
    const grouped = new Map<number, { calibration: info__calibration; subIndustries: info__industry[] }>()

    linkedCalibrationRelations.forEach(relation => {
      const existing = grouped.get(relation.calibration_id)
      if (!existing) {
        grouped.set(relation.calibration_id, {
          calibration: relation.info__calibration,
          subIndustries: [relation.sub_industry],
        })
        return
      }

      const exists = existing.subIndustries.some(item => item.id === relation.sub_industry.id)
      if (!exists) {
        existing.subIndustries.push(relation.sub_industry)
      }
    })

    return Array.from(grouped.values())
  }, [linkedCalibrationRelations])

  const toggleSubIndustrySelection = (subIndustryId: number) => {
    setSelectedSubIndustryIds(prev =>
      prev.includes(subIndustryId)
        ? prev.filter(id => id !== subIndustryId)
        : [...prev, subIndustryId]
    )
  }

  const toggleCreateSubIndustrySelection = (subIndustryId: number) => {
    setCreateSubIndustryIds(prev =>
      prev.includes(subIndustryId)
        ? prev.filter(id => id !== subIndustryId)
        : [...prev, subIndustryId]
    )
  }

  // 开始编辑已关联口径的子行业
  const handleEditLinkedCalibration = (group: { calibration: info__calibration; subIndustries: info__industry[] }) => {
    setEditingCalibrationId(group.calibration.id)
    setEditingSubIndustryIds(group.subIndustries.map(s => s.id))
  }

  const toggleEditingSubIndustrySelection = (subIndustryId: number) => {
    setEditingSubIndustryIds(prev =>
      prev.includes(subIndustryId)
        ? prev.filter(id => id !== subIndustryId)
        : [...prev, subIndustryId]
    )
  }

  // 保存已关联口径的子行业变更
  const handleSaveLinkedCalibrationEdit = async () => {
    if (!editingCalibrationId) return

    const currentGroup = linkedCalibrationGroups.find(g => g.calibration.id === editingCalibrationId)
    if (!currentGroup) return

    const currentIds = currentGroup.subIndustries.map(s => s.id)
    const toAdd = editingSubIndustryIds.filter(id => !currentIds.includes(id))
    const toRemove = currentIds.filter(id => !editingSubIndustryIds.includes(id))

    setLoading(true)
    try {
      // 添加新的子行业
      if (toAdd.length > 0) {
        const addResponse = await fetch(`/api/industries/${industryId}/calibrations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            calibration_id: editingCalibrationId,
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
            fetch(`/api/industries/${industryId}/calibrations?calibration_id=${editingCalibrationId}&sub_industry_id=${subIndustryId}`, {
              method: 'DELETE',
            })
          )
        )
      }

      loadData()
      setEditingCalibrationId(null)
    } catch (error) {
      console.error('Failed to save linked calibration:', error)
      alert('保存失败')
    } finally {
      setLoading(false)
    }
  }

  // 取消关联口径（删除该口径的所有子行业）
  const handleUnlinkCalibration = async (calibrationId: number) => {
    if (!window.confirm('确定要取消关联此口径吗？')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/industries/${industryId}/calibrations?calibration_id=${calibrationId}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      if (result.error) {
        alert(result.error)
        return
      }

      loadData()
    } catch (error) {
      console.error('Failed to unlink calibration:', error)
      alert('取消关联失败')
    } finally {
      setLoading(false)
    }
  }

  // 为子行业自动关联父行业的模板
  const autoLinkParentTemplatesToSubIndustries = async (subIndustryIds: number[]) => {
    try {
      // 获取父行业的所有模板
      const parentResponse = await fetch(`/api/industries/${industryId}`)
      const parentResult = await parentResponse.json()
      
      if (!parentResult.data?.relation__industry_or_company_core_statistic_template) {
        return
      }

      const parentTemplates = parentResult.data.relation__industry_or_company_core_statistic_template

      // 为每个子行业关联模板
      await Promise.all(
        subIndustryIds.map(async (subIndustryId) => {
          try {
            // 获取子行业已有的模板
            const subResponse = await fetch(`/api/industries/${subIndustryId}`)
            const subResult = await subResponse.json()
            
            const subTemplateIds = new Set(
              (subResult.data?.relation__industry_or_company_core_statistic_template || [])
                .map((t: any) => t.core_statistic_template_id)
            )

            // 找出需要关联的模板（父行业有但子行业没有）
            const templatesToLink = parentTemplates.filter(
              (t: any) => !subTemplateIds.has(t.core_statistic_template_id)
            )

            // 批量关联模板
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
                  console.error(`Failed to link template ${template.id} to sub-industry ${subIndustryId}:`, error)
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

  const handleLinkCalibration = async () => {
    if (!selectedCalibrationId) {
      alert('请选择一个口径')
      return
    }

    if (selectedSubIndustryIds.length === 0) {
      alert('请至少选择一个子行业')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/industries/${industryId}/calibrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calibration_id: selectedCalibrationId,
          sub_industry_ids: selectedSubIndustryIds,
        }),
      })

      const result = await response.json()
      if (result.error) {
        alert(result.error)
        return
      }

      // 自动为子行业关联父行业的模板
      await autoLinkParentTemplatesToSubIndustries(selectedSubIndustryIds)

      onAfterLink()
      handleClose()
    } catch (error) {
      console.error('Failed to link calibration:', error)
      alert('关联口径失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAndLinkCalibration = async () => {
    if (!newCalibrationName.trim()) {
      alert('请填写口径名称')
      return
    }

    if (createSubIndustryIds.length === 0) {
      alert('请至少选择一个子行业')
      return
    }

    setLoading(true)
    try {
      const createResponse = await fetch('/api/calibrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCalibrationName.trim(),
          description: newCalibrationDescription.trim() || undefined,
        }),
      })

      const createResult = await createResponse.json()
      if (createResult.error) {
        alert(createResult.error)
        return
      }

      const linkResponse = await fetch(`/api/industries/${industryId}/calibrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calibration_id: createResult.data.id,
          sub_industry_ids: createSubIndustryIds,
        }),
      })

      const linkResult = await linkResponse.json()
      if (linkResult.error) {
        alert(linkResult.error)
        return
      }

      // 自动为子行业关联父行业的模板
      await autoLinkParentTemplatesToSubIndustries(createSubIndustryIds)

      onAfterLink()
      handleClose()
    } catch (error) {
      console.error('Failed to create and link calibration:', error)
      alert('创建并关联口径失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setMode('unlinked')
    setSelectedCalibrationId(null)
    setSelectedSubIndustryIds([])
    setNewCalibrationName('')
    setNewCalibrationDescription('')
    setCreateSubIndustryIds([])
    setEditingCalibrationId(null)
    setEditingSubIndustryIds([])
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="关联口径" maxWidth="xl">
      <div className="space-y-6">
        <Radio<ModalMode>
          options={[
            { label: '已关联口径', value: 'linked' },
            { label: '未关联口径', value: 'unlinked' },
            { label: '创建新口径', value: 'create' },
          ]}
          value={mode}
          onChange={setMode}
        />

        {mode === 'linked' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loading />
              </div>
            ) : linkedCalibrationGroups.length === 0 ? (
              <div className="text-gray-500 text-center py-8">暂无已关联口径</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {linkedCalibrationGroups.map(group => (
                  <div key={group.calibration.id}>
                    {editingCalibrationId === group.calibration.id ? (
                      // 编辑模式
                      <div className="border border-blue-500 rounded-lg p-4 bg-blue-50 space-y-3">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">{group.calibration.name}</h4>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            选择关联的子行业
                          </label>
                          <div className="max-h-48 overflow-y-auto border border-blue-200 rounded-lg p-2 space-y-2">
                            {availableSubIndustries.map(subIndustry => (
                              <label key={subIndustry.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingSubIndustryIds.includes(subIndustry.id)}
                                  onChange={() => toggleEditingSubIndustrySelection(subIndustry.id)}
                                  className="h-4 w-4"
                                />
                                <span>{subIndustry.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-blue-200">
                          <Button
                            look="cancel"
                            size="small"
                            onClick={() => setEditingCalibrationId(null)}
                            disabled={loading}
                          >
                            取消
                          </Button>
                          <Button
                            look="primary"
                            size="small"
                            onClick={handleSaveLinkedCalibrationEdit}
                            disabled={loading}
                          >
                            保存
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // 查看模式
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{group.calibration.name}</h4>
                            {group.calibration.description && (
                              <p className="text-sm text-gray-600 mt-1">{group.calibration.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              子行业：{group.subIndustries.map(item => item.name).join('、')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              look="secondary"
                              size="tiny"
                              onClick={() => handleEditLinkedCalibration(group)}
                              disabled={loading}
                            >
                              编辑
                            </Button>
                            <Button
                              look="secondary"
                              size="tiny"
                              onClick={() => handleUnlinkCalibration(group.calibration.id)}
                              disabled={loading}
                            >
                              取消关联
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'unlinked' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loading />
              </div>
            ) : unlinkedCalibrations.length === 0 ? (
              <div className="text-gray-500 text-center py-8">暂无未关联口径，请先创建口径</div>
            ) : (
              <>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {unlinkedCalibrations.map(calibration => (
                    <div
                      key={calibration.id}
                      onClick={() => setSelectedCalibrationId(calibration.id)}
                      className={`
                        border rounded-lg p-4 cursor-pointer transition-all
                        ${selectedCalibrationId === calibration.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <h4 className="font-medium text-gray-900">{calibration.name}</h4>
                      {calibration.description && (
                        <p className="text-sm text-gray-600 mt-1">{calibration.description}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择子行业（至少一个）
                  </label>
                  {availableSubIndustries.length === 0 ? (
                    <div className="text-sm text-gray-500">暂无可选子行业</div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                      {availableSubIndustries.map(subIndustry => (
                        <label key={subIndustry.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedSubIndustryIds.includes(subIndustry.id)}
                            onChange={() => toggleSubIndustrySelection(subIndustry.id)}
                            className="h-4 w-4"
                          />
                          <span>{subIndustry.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button look="cancel" size="small" onClick={handleClose}>
                    取消
                  </Button>
                  <Button
                    look="primary"
                    size="small"
                    onClick={handleLinkCalibration}
                    disabled={!selectedCalibrationId || selectedSubIndustryIds.length === 0 || loading}
                  >
                    关联口径
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                口径名称 <span className="text-red-500">*</span>
              </label>
              <TextInput
                value={newCalibrationName}
                onChange={setNewCalibrationName}
                placeholder="例如：中性口径"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                口径说明（可选）
              </label>
              <textarea
                value={newCalibrationDescription}
                onChange={(e) => setNewCalibrationDescription(e.target.value)}
                rows={3}
                placeholder="描述该口径的适用范围..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择子行业（至少一个）
              </label>
              {availableSubIndustries.length === 0 ? (
                <div className="text-sm text-gray-500">暂无可选子行业</div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                  {availableSubIndustries.map(subIndustry => (
                    <label key={subIndustry.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createSubIndustryIds.includes(subIndustry.id)}
                        onChange={() => toggleCreateSubIndustrySelection(subIndustry.id)}
                        className="h-4 w-4"
                      />
                      <span>{subIndustry.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button look="cancel" size="small" onClick={handleClose}>
                取消
              </Button>
              <Button
                look="primary"
                size="small"
                onClick={handleCreateAndLinkCalibration}
                disabled={loading}
              >
                创建并关联
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
