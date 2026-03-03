'use client'

import { useState, useEffect, useMemo } from 'react'
import Modal from '@/app/widget/Modal'
import Button from '@/app/widget/Button'
import { TextInput } from '@/app/widget/Input'
import Radio from '@/app/widget/Radio'
import Loading from '@/app/widget/Loading'
import { validateFormula } from '@/app/tools/formulaParser'
import type { info__core_statistic_template, IndustryTemplateRelation } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  industryId: number
  onAfterLink: () => void
}

type ModalMode = 'linked' | 'unlinked' | 'create'

export default function IndustryAnalysisCoreStatsTemplateModal({
  open,
  onClose,
  industryId,
  onAfterLink,
}: Props) {
  const [mode, setMode] = useState<ModalMode>('unlinked')
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<info__core_statistic_template[]>([])
  const [linkedTemplateRelations, setLinkedTemplateRelations] = useState<IndustryTemplateRelation[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [customName, setCustomName] = useState('')

  // 编辑已关联模板
  const [editingRelationId, setEditingRelationId] = useState<number | null>(null)
  const [editingCustomName, setEditingCustomName] = useState('')
  const [editingCoreFormula, setEditingCoreFormula] = useState('')
  const [editingFormulaError, setEditingFormulaError] = useState('')

  // 创建模板表单
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateRelateTable, setNewTemplateRelateTable] = useState('')
  const [newTemplateCoreFormula, setNewTemplateCoreFormula] = useState('')
  const [newTemplateDescription, setNewTemplateDescription] = useState('')
  const [formulaError, setFormulaError] = useState('')

  // 加载模板数据
  useEffect(() => {
    if (open && mode !== 'create') {
      loadTemplates()
    }
  }, [open, mode])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const [templateResponse, industryResponse] = await Promise.all([
        fetch('/api/core-statistic-templates'),
        fetch(`/api/industries/${industryId}`),
      ])
      const templateResult = await templateResponse.json()
      const industryResult = await industryResponse.json()

      const allTemplates = templateResult.data || []
      const linkedRelations = industryResult.data?.relation__industry_or_company_core_statistic_template || []

      setTemplates(allTemplates)
      setLinkedTemplateRelations(linkedRelations)
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const linkedTemplateIds = useMemo(
    () => new Set(linkedTemplateRelations.map(item => item.core_statistic_template_id)),
    [linkedTemplateRelations]
  )

  const unlinkedTemplates = useMemo(
    () => templates.filter(template => !linkedTemplateIds.has(template.id)),
    [templates, linkedTemplateIds]
  )

  // 验证公式
  const handleValidateFormula = () => {
    if (!newTemplateCoreFormula.trim()) {
      setFormulaError('公式不能为空')
      return false
    }
    const validation = validateFormula(newTemplateCoreFormula)
    if (!validation.valid) {
      setFormulaError(validation.error || '公式格式错误')
      return false
    }
    setFormulaError('')
    return true
  }

  // 编辑已关联模板的自定义名称
  const handleEditRelation = (relation: IndustryTemplateRelation) => {
    setEditingRelationId(relation.id)
    setEditingCustomName(relation.rename || '')
    setEditingCoreFormula(relation.info__core_statistic_template.core_formula || '')
    setEditingFormulaError('')
  }

  const handleSaveRelationEdit = async () => {
    if (!editingRelationId) return

    // 验证公式
    if (editingCoreFormula.trim()) {
      const validation = validateFormula(editingCoreFormula)
      if (!validation.valid) {
        setEditingFormulaError(validation.error || '公式格式错误')
        return
      }
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/industries/${industryId}/templates/${editingRelationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rename: editingCustomName.trim() || null,
          core_formula: editingCoreFormula.trim() || null,
        }),
      })

      const result = await response.json()
      if (result.error) {
        alert(result.error)
        return
      }

      loadTemplates()
      setEditingRelationId(null)
      setEditingFormulaError('')
    } catch (error) {
      console.error('Failed to save template relation:', error)
      alert('保存失败')
    } finally {
      setLoading(false)
    }
  }

  // 取消关联模板
  const handleUnlinkTemplate = async (templateId: number, relationId: number) => {
    if (!window.confirm('确定要取消关联此模板吗？')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/industries/${industryId}/templates?template_id=${templateId}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      if (result.error) {
        alert(result.error)
        return
      }

      loadTemplates()
    } catch (error) {
      console.error('Failed to unlink template:', error)
      alert('取消关联失败')
    } finally {
      setLoading(false)
    }
  }

  // 关联现有模板
  const handleLinkTemplate = async () => {
    if (!selectedTemplateId) {
      alert('请选择一个模板')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/industries/${industryId}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplateId,
          rename: customName.trim() || undefined,
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
      console.error('Failed to link template:', error)
      alert('关联模板失败')
    } finally {
      setLoading(false)
    }
  }

  // 创建并关联新模板
  const handleCreateAndLinkTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateRelateTable.trim()) {
      alert('请填写模板名称和数据表名称')
      return
    }

    if (!handleValidateFormula()) {
      return
    }

    setLoading(true)
    try {
      // 1. 创建模板
      const createResponse = await fetch('/api/core-statistic-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName,
          relate_table: newTemplateRelateTable,
          core_formula: newTemplateCoreFormula,
          description: newTemplateDescription.trim() || undefined,
        }),
      })

      const createResult = await createResponse.json()
      if (createResult.error) {
        alert(createResult.error)
        return
      }

      // 2. 关联到行业
      const linkResponse = await fetch(`/api/industries/${industryId}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: createResult.data.id,
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
      console.error('Failed to create and link template:', error)
      alert('创建并关联模板失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setMode('unlinked')
    setSelectedTemplateId(null)
    setCustomName('')
    setNewTemplateName('')
    setNewTemplateRelateTable('')
    setNewTemplateCoreFormula('')
    setNewTemplateDescription('')
    setFormulaError('')
    setEditingRelationId(null)
    setEditingCustomName('')
    setEditingCoreFormula('')
    setEditingFormulaError('')
    onClose()
  }

  const selectedTemplate = unlinkedTemplates.find(t => t.id === selectedTemplateId)

  return (
    <Modal open={open} onClose={handleClose} title="关联核心统计模板" maxWidth="xl">
      <div className="space-y-6">
        {/* 模式切换 */}

        <Radio<ModalMode>
          options={[
            { label: '已关联模板', value: 'linked' },
            { label: '未关联模板', value: 'unlinked' },
            { label: '创建新模板', value: 'create' },
          ]}
          value={mode}
          onChange={setMode}
        />


        {/* 已关联模板模式 */}
        {mode === 'linked' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loading />
              </div>
            ) : linkedTemplateRelations.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                暂无已关联模板
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {linkedTemplateRelations.map(relation => (
                  <div key={relation.id}>
                    {editingRelationId === relation.id ? (
                      // 编辑模式
                      <div className="border border-blue-500 rounded-lg p-4 bg-blue-50 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            自定义显示名称（可选）
                          </label>
                          <TextInput
                            value={editingCustomName}
                            onChange={setEditingCustomName}
                            placeholder={relation.info__core_statistic_template.name}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            计算公式（可选）
                          </label>
                          <TextInput
                            value={editingCoreFormula}
                            onChange={(value) => {
                              setEditingCoreFormula(value)
                              setEditingFormulaError('')
                            }}
                            placeholder={relation.info__core_statistic_template.core_formula}
                            error={editingFormulaError}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            支持运算符：+ - × ÷ * / ( )，变量名使用中文或英文。值为 undefined 时默认为 0
                          </p>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-blue-200">
                          <Button
                            look="cancel"
                            size="small"
                            onClick={() => {
                              setEditingRelationId(null)
                              setEditingFormulaError('')
                            }}
                            disabled={loading}
                          >
                            取消
                          </Button>
                          <Button
                            look="primary"
                            size="small"
                            onClick={handleSaveRelationEdit}
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
                            <h4 className="font-medium text-gray-900">
                              {relation.rename || relation.info__core_statistic_template.name}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1 font-mono">
                              {relation.info__core_statistic_template.core_formula}
                            </p>
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                              <span>数据表: {relation.info__core_statistic_template.relate_table}</span>
                              {relation.info__core_statistic_template.description && (
                                <span className="flex-1 truncate">{relation.info__core_statistic_template.description}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              look="secondary"
                              size="tiny"
                              onClick={() => handleEditRelation(relation)}
                              disabled={loading}
                            >
                              编辑
                            </Button>
                            <Button
                              look="secondary"
                              size="tiny"
                              onClick={() => handleUnlinkTemplate(relation.core_statistic_template_id, relation.id)}
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

        {/* 未关联模板模式 */}
        {mode === 'unlinked' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loading />
              </div>
            ) : unlinkedTemplates.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                暂无未关联模板，请先创建模板
              </div>
            ) : (
              <>
                {/* 模板列表 */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {unlinkedTemplates.map(template => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`
                        border rounded-lg p-4 cursor-pointer transition-all
                        ${selectedTemplateId === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-600 mt-1 font-mono">
                            {template.core_formula}
                          </p>
                          <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            <span>数据表: {template.relate_table}</span>
                            {template.description && (
                              <span className="flex-1 truncate">{template.description}</span>
                            )}
                          </div>
                        </div>
                        {selectedTemplateId === template.id && (
                          <div className="ml-2 text-blue-500">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 自定义名称 */}
                {selectedTemplate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      自定义显示名称（可选）
                    </label>
                    <TextInput
                      value={customName}
                      onChange={setCustomName}
                      placeholder={`默认使用 "${selectedTemplate.name}"`}
                    />
                  </div>
                )}

                {/* 关联按钮 */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button look="cancel" size="small" onClick={handleClose}>
                    取消
                  </Button>
                  <Button
                    look="primary"
                    size="small"
                    onClick={handleLinkTemplate}
                    disabled={!selectedTemplateId || loading}
                  >
                    关联模板
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 创建新模板模式 */}
        {mode === 'create' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模板名称 <span className="text-red-500">*</span>
              </label>
              <TextInput
                value={newTemplateName}
                onChange={setNewTemplateName}
                placeholder="例如：用户增长模型"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                数据表名称 <span className="text-red-500">*</span>
              </label>
              <TextInput
                value={newTemplateRelateTable}
                onChange={setNewTemplateRelateTable}
                placeholder="例如：user_growth"
              />
              <p className="text-xs text-gray-500 mt-1">
                用于标识该模板对应的数据格式，相同数据表名称的核心数据将匹配此模板
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                计算公式 <span className="text-red-500">*</span>
              </label>
              <TextInput
                value={newTemplateCoreFormula}
                onChange={(value) => {
                  setNewTemplateCoreFormula(value)
                  setFormulaError('')
                }}
                placeholder="例如：净利润=人数×渗透率×人均消费量×单价×毛利率-固定费用"
                error={formulaError}
              />
              <p className="text-xs text-gray-500 mt-1">
                支持运算符：+ - × ÷ * / ( )，变量名使用中文或英文
              </p>
              <Button
                look="secondary"
                size="tiny"
                onClick={handleValidateFormula}
                className="mt-2"
              >
                验证公式
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模板说明（可选）
              </label>
              <textarea
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                placeholder="描述此模板的用途和注意事项..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 创建按钮 */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button look="cancel" size="small" onClick={handleClose}>
                取消
              </Button>
              <Button
                look="primary"
                size="small"
                onClick={handleCreateAndLinkTemplate}
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
