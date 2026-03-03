'use client'

import { useEffect, useMemo, useState } from 'react'
import { DateTime } from 'luxon'
import Modal from '@/app/widget/Modal'
import Button from '@/app/widget/Button'
import DatePicker from '@/app/widget/DatePicker'
import { NumberInput } from '@/app/widget/Input'
import { parseFormula } from '@/app/tools/formulaParser'
import type { IndustryTemplateRelation } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  industryId: number
  templateRelation: IndustryTemplateRelation | null
  onAfterSave: () => void
}

export default function IndustryAnalysisCoreDataModal({
  open,
  onClose,
  industryId,
  templateRelation,
  onAfterSave,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [variableValues, setVariableValues] = useState<Record<string, number | undefined>>({})
  const [selectedQuarterDate, setSelectedQuarterDate] = useState<DateTime | undefined>(undefined)

  const selectedTemplate = templateRelation

  const formulaVariables = useMemo(() => {
    if (!selectedTemplate) return []
    return parseFormula(selectedTemplate.info__core_statistic_template.core_formula).variables
  }, [selectedTemplate])

  useEffect(() => {
    if (!open) return

    const now = DateTime.now()
    setSelectedQuarterDate(now)
  }, [open])

  useEffect(() => {
    if (!selectedTemplate) {
      setVariableValues({})
      return
    }

    const initialValues: Record<string, number | undefined> = {}
    for (const variable of parseFormula(selectedTemplate.info__core_statistic_template.core_formula).variables) {
      initialValues[variable] = undefined
    }
    setVariableValues(initialValues)
  }, [selectedTemplate])

  const handleSave = async () => {
    if (!selectedTemplate) {
      alert('请先选择模板')
      return
    }

    if (!selectedQuarterDate) {
      alert('请选择季度')
      return
    }

    if (formulaVariables.length === 0) {
      alert('当前模板公式未解析出变量，无法录入数据')
      return
    }

    const missingVariables = formulaVariables.filter(variable => {
      const value = variableValues[variable]
      return value === undefined || value === null || Number.isNaN(value)
    })

    if (missingVariables.length > 0) {
      alert(`请填写完整变量值：${missingVariables.join('、')}`)
      return
    }

    const parsedData: Record<string, number> = {}
    for (const variable of formulaVariables) {
      parsedData[variable] = Number(variableValues[variable])
    }

    setLoading(true)
    try {
      const dateString = selectedQuarterDate.toFormat('yyyy-MM-dd')
      const response = await fetch(`/api/industries/${industryId}/core-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: selectedTemplate.info__core_statistic_template.relate_table,
          date: dateString,
          data: parsedData,
        }),
      })

      const result = await response.json()
      if (result.error) {
        alert(result.error)
        return
      }

      onAfterSave()
      onClose()
    } catch (error) {
      console.error('Failed to create core data:', error)
      alert('新增数据失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="增加核心数据" maxWidth="xl">
      <div className="space-y-4">
        {!selectedTemplate ? (
          <div className="text-gray-500 text-center py-8">
            模板信息缺失，请关闭后重试
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">模板</label>
              <div className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                {selectedTemplate.rename || selectedTemplate.info__core_statistic_template.name}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                数据表: {selectedTemplate.info__core_statistic_template.relate_table}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">季度</label>
              <DatePicker
                mode="quarter"
                value={selectedQuarterDate}
                onChange={(value: DateTime) => setSelectedQuarterDate(value)}
                placeholder="请选择季度"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">按模板变量录入数据</label>
              {selectedTemplate && (
                <p className="text-xs text-gray-500 mb-3 font-mono">
                  公式：{selectedTemplate.info__core_statistic_template.core_formula}
                </p>
              )}

              {formulaVariables.length === 0 ? (
                <div className="text-gray-500 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  当前模板未解析出可录入变量，请检查公式格式
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {formulaVariables.map(variable => (
                    <div key={variable}>
                      <label className="block text-sm text-gray-700 mb-1">
                        {variable}
                      </label>
                      <NumberInput
                        value={variableValues[variable]}
                        onChange={(value) =>
                          setVariableValues(prev => ({
                            ...prev,
                            [variable]: value,
                          }))
                        }
                        placeholder={`请输入 ${variable}`}
                        decimalPlaces={4}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button look="cancel" size="small" onClick={onClose} disabled={loading}>
                取消
              </Button>
              <Button look="primary" size="small" onClick={handleSave} disabled={loading}>
                保存数据
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
