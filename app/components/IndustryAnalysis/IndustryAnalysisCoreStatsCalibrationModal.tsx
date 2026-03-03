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
                  <div key={group.calibration.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium text-gray-900">{group.calibration.name}</h4>
                    {group.calibration.description && (
                      <p className="text-sm text-gray-600 mt-1">{group.calibration.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      子行业：{group.subIndustries.map(item => item.name).join('、')}
                    </p>
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
