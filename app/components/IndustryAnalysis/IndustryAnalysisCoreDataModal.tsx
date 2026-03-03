'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from '@/app/widget/Modal'
import Button from '@/app/widget/Button'
import Select from '@/app/widget/Select'
import { NumberInput } from '@/app/widget/Input'
import { parseFormula } from '@/app/tools/formulaParser'
import type { IndustryTemplateRelation } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  industryId: number
  templates: IndustryTemplateRelation[]
  onAfterSave: () => void
}

export default function IndustryAnalysisCoreDataModal({
  open,
  onClose,
  industryId,
  templates,
  onAfterSave,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, number | undefined>>({})

  const templateOptions = useMemo(
    () => templates.map(item => ({
      label: item.rename || item.info__core_statistic_template.name,
      value: item.info__core_statistic_template.id,
    })),
    [templates]
  )

  const selectedTemplate = useMemo(
    () => templates.find(item => item.info__core_statistic_template.id === selectedTemplateId),
    [templates, selectedTemplateId]
  )

  const formulaVariables = useMemo(() => {
    if (!selectedTemplate) return []
    return parseFormula(selectedTemplate.info__core_statistic_template.core_formula).variables
  }, [selectedTemplate])

  useEffect(() => {
    if (!open) return

    if (templateOptions.length > 0) {
      setSelectedTemplateId(templateOptions[0].value)
    } else {
      setSelectedTemplateId(null)
    }
  }, [open, templateOptions])

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
      const response = await fetch(`/api/industries/${industryId}/core-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: selectedTemplate.info__core_statistic_template.relate_table,
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
        {templateOptions.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            暂无已关联模板，请先关联模板
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">选择模板</label>
              <Select<number>
                options={templateOptions}
                value={selectedTemplateId ?? undefined}
                onChange={(value: number) => setSelectedTemplateId(value)}
                placeholder="请选择模板"
              />
              {selectedTemplate && (
                <p className="text-xs text-gray-500 mt-2">
                  数据表: {selectedTemplate.info__core_statistic_template.relate_table}
                </p>
              )}
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
