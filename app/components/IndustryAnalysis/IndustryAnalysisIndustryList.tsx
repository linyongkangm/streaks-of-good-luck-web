'use client'

import { useState, useEffect, useCallback } from 'react'
import type { IndustryWithCount } from '@/types'
import Button from '@/app/widget/Button'
import ModalForm from '@/app/widget/ModalForm'
import { FormItem, FormLabel } from '@/app/widget/Form'
import { TextInput } from '@/app/widget/Input'
import Panel from '@/app/widget/Panel'
import Loading from '@/app/widget/Loading'

interface IndustryAnalysisIndustryListProps {
  refreshKey: number
  selectedIndustryId: number | null
  onSelectIndustry: (id: number | null) => void
}

export default function IndustryAnalysisIndustryList({
  refreshKey,
  selectedIndustryId,
  onSelectIndustry,
}: IndustryAnalysisIndustryListProps) {
  const [industries, setIndustries] = useState<IndustryWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')

  // 新建/编辑行业弹窗
  const [showIndustryForm, setShowIndustryForm] = useState(false)
  const [editingIndustry, setEditingIndustry] = useState<IndustryWithCount | null>(null)
  const [industryForm, setIndustryForm] = useState({ name: '', description: '' })

  const fetchIndustries = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchName) params.append('name', searchName)
      const response = await fetch(`/api/industries?${params}`)
      const data = await response.json()
      setIndustries(data.data || [])
    } catch (error) {
      console.error('Failed to fetch industries:', error)
    } finally {
      setLoading(false)
    }
  }, [searchName])

  useEffect(() => {
    fetchIndustries()
  }, [fetchIndustries, refreshKey])

  // 新建/编辑行业提交
  const handleSubmitIndustry = async (_e: React.FormEvent, values: typeof industryForm) => {
    if (!values.name.trim()) {
      alert('请填写行业名称')
      return
    }

    const url = editingIndustry
      ? `/api/industries/${editingIndustry.id}`
      : '/api/industries'
    const method = editingIndustry ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: values.name.trim(), description: values.description.trim() || null }),
    })

    const data = await response.json()
    if (data.error) {
      alert(data.error)
      return
    }

    setShowIndustryForm(false)
    setEditingIndustry(null)
    setIndustryForm({ name: '', description: '' })
    fetchIndustries()
  }

  // 删除行业
  const handleDeleteIndustry = async (industry: IndustryWithCount) => {
    if (!confirm(`确定要删除行业「${industry.name}」吗？关联的文章不会被删除。`)) return

    const response = await fetch(`/api/industries/${industry.id}`, { method: 'DELETE' })
    const data = await response.json()
    if (data.error) {
      alert(data.error)
      return
    }

    if (selectedIndustryId === industry.id) {
      onSelectIndustry(null)
    }
    fetchIndustries()
  }

  const openEditForm = (industry: IndustryWithCount) => {
    setEditingIndustry(industry)
    setIndustryForm({ name: industry.name, description: industry.description || '' })
    setShowIndustryForm(true)
  }

  const openCreateForm = () => {
    setEditingIndustry(null)
    setIndustryForm({ name: '', description: '' })
    setShowIndustryForm(true)
  }
  return (
    <Panel title="🏭 行业列表">
      {/* 搜索 + 新建 */}
      <div className="flex gap-2 mb-4">
        <TextInput
          placeholder="搜索行业..."
          value={searchName}
          onChange={setSearchName}
        />
        <Button size="small" onClick={openCreateForm}>＋</Button>
      </div>

      {/* 行业列表 */}
      {loading ? (
        <Loading />
      ) : industries.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">暂无行业</div>
      ) : (
        <div className="space-y-1 max-h-[calc(100vh-320px)] overflow-y-auto">
          {industries.map((industry) => (
            <div
              key={industry.id}
              onClick={() => onSelectIndustry(industry.id)}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${selectedIndustryId === industry.id
                ? 'bg-teal-50 border border-teal-200 text-teal-800'
                : 'hover:bg-slate-50 border border-transparent'
                }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-slate-800 font-medium truncate">{industry.name}</span>
                <span className="text-xs text-slate-400 flex-shrink-0">
                  {industry._count.relation__industry_articles}篇
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); openEditForm(industry) }}
                  className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                  title="编辑"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteIndustry(industry) }}
                  className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                  title="删除"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* 新建/编辑行业弹窗 */}
      <ModalForm
        open={showIndustryForm}
        onClose={() => { setShowIndustryForm(false); setEditingIndustry(null) }}
        title={editingIndustry ? '✏️ 编辑行业' : '🏭 新建行业'}
        values={industryForm}
        onValuesChange={setIndustryForm}
        onSubmit={handleSubmitIndustry}
        submitText={editingIndustry ? '保存' : '新建'}
        maxWidth="md"
      >
        <FormLabel label="行业名称" required>
          <FormItem field="name">
            <TextInput placeholder="输入行业名称" />
          </FormItem>
        </FormLabel>
        <FormLabel label="描述">
          <FormItem field="description">
            <TextInput placeholder="输入行业描述（可选）" />
          </FormItem>
        </FormLabel>
      </ModalForm>
    </Panel>
  )
}
