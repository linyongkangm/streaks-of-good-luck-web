'use client'

import { useState, useEffect, useMemo } from "react"
import Panel from "@/app/widget/Panel"
import Button from "@/app/widget/Button"
import ModalForm from "@/app/widget/ModalForm"
import { FormItem, FormLabel } from "@/app/widget/Form"
import Input from "@/app/widget/Input"
import DatePicker from "@/app/widget/DatePicker"
import Select from "@/app/widget/Select"
import type { MilestoneWithRelations } from "@/types"
import { DateTime } from "luxon"

interface IndustryAnalysisTimeLineProps {
  industryId?: number
}

interface MilestoneFormData {
  title: string
  description: string
  milestone_date: DateTime
  status: string
}

export default function IndustryAnalysisTimeLine({ industryId }: IndustryAnalysisTimeLineProps) {
  const [milestones, setMilestones] = useState<MilestoneWithRelations[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<MilestoneWithRelations | null>(null)
  
  // 计算日期范围
  const dateRange = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 0-based to 1-based
    
    let startDate: Date
    let endDate: Date
    
    if (currentMonth <= 6) {
      // 上半年：展示上一年下半年 + 当年
      startDate = new Date(currentYear - 1, 6, 1) // 上一年7月1日
      endDate = new Date(currentYear, 11, 31) // 当年12月31日
    } else {
      // 下半年：展示当年 + 下一年上半年
      startDate = new Date(currentYear, 0, 1) // 当年1月1日
      endDate = new Date(currentYear + 1, 5, 30) // 下一年6月30日
    }
    
    return { startDate, endDate }
  }, [])

  // 加载 milestone 数据
  const fetchMilestones = async () => {
    if (!industryId) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({
        industryId: industryId.toString(),
        startDate: dateRange.startDate.toISOString().split('T')[0],
        endDate: dateRange.endDate.toISOString().split('T')[0],
      })
      
      const response = await fetch(`/api/milestones?${params}`)
      const data = await response.json()
      setMilestones(data.data || [])
    } catch (error) {
      console.error('Failed to fetch milestones:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMilestones()
  }, [industryId, dateRange])

  // 创建 milestone
  const handleCreate = async (e: React.FormEvent, values: MilestoneFormData) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          industry_ids: industryId ? [industryId] : [],
        }),
      })
      
      if (response.ok) {
        setShowCreateModal(false)
        await fetchMilestones()
      }
    } catch (error) {
      console.error('Failed to create milestone:', error)
    }
  }

  // 更新 milestone
  const handleUpdate = async (e: React.FormEvent, values: MilestoneFormData) => {
    e.preventDefault()
    if (!editingMilestone) return
    
    try {
      const response = await fetch(`/api/milestones/${editingMilestone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          industry_ids: industryId ? [industryId] : [],
        }),
      })
      
      if (response.ok) {
        setShowEditModal(false)
        setEditingMilestone(null)
        await fetchMilestones()
      }
    } catch (error) {
      console.error('Failed to update milestone:', error)
    }
  }

  // 删除 milestone
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个里程碑吗？')) return
    
    try {
      const response = await fetch(`/api/milestones/${id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        await fetchMilestones()
      }
    } catch (error) {
      console.error('Failed to delete milestone:', error)
    }
  }

  // 按年份分组
  const milestonesByYear = useMemo(() => {
    const grouped: Record<number, MilestoneWithRelations[]> = {}
    milestones.forEach(milestone => {
      const year = new Date(milestone.milestone_date).getFullYear()
      if (!grouped[year]) {
        grouped[year] = []
      }
      grouped[year].push(milestone)
    })
    return grouped
  }, [milestones])

  const statusOptions = [
    { label: '计划中', value: 'planned' },
    { label: '进行中', value: 'ongoing' },
    { label: '已完成', value: 'completed' },
    { label: '已取消', value: 'cancelled' },
  ]

  const statusColors: Record<string, string> = {
    planned: 'bg-blue-100 text-blue-800',
    ongoing: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
  }

  if (!industryId) {
    return null
  }

  return (
    <Panel className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-800">行业里程碑</h3>
        <Button size="small" onClick={() => setShowCreateModal(true)}>
          新增里程碑
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      ) : milestones.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无里程碑数据</div>
      ) : (
        <div className="space-y-8">
          {Object.keys(milestonesByYear)
            .sort((a, b) => Number(a) - Number(b))
            .map(year => (
              <div key={year} className="relative">
                <h4 className="text-lg font-semibold text-slate-700 mb-4 sticky top-0 bg-white py-2 z-10">
                  {year} 年
                </h4>
                <div className="relative border-l-2 border-blue-300 pl-8 space-y-6">
                  {milestonesByYear[Number(year)]
                    .sort((a, b) => new Date(a.milestone_date).getTime() - new Date(b.milestone_date).getTime())
                    .map(milestone => (
                      <div key={milestone.id} className="relative">
                        {/* 时间轴节点 */}
                        <div className="absolute -left-[33px] w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
                        
                        {/* 卡片内容 */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-semibold text-slate-800">{milestone.title}</h5>
                                <span className={`text-xs px-2 py-1 rounded ${statusColors[milestone.status] || statusColors.planned}`}>
                                  {statusOptions.find(opt => opt.value === milestone.status)?.label || milestone.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {new Date(milestone.milestone_date).toLocaleDateString('zh-CN')}
                              </p>
                              {milestone.description && (
                                <p className="text-sm text-gray-700 mt-2">{milestone.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => {
                                  setEditingMilestone(milestone)
                                  setShowEditModal(true)
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDelete(milestone.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* 创建里程碑弹窗 */}
      <ModalForm
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新增里程碑"
        onSubmit={handleCreate}
        initialValues={{
          title: '',
          description: '',
          milestone_date: DateTime.now(),
          status: 'planned',
        }}
      >
        <FormLabel label="标题" required>
          <FormItem field="title">
            <Input placeholder="请输入里程碑标题" />
          </FormItem>
        </FormLabel>
        <FormLabel label="日期" required>
          <FormItem field="milestone_date">
            <DatePicker />
          </FormItem>
        </FormLabel>
        <FormLabel label="状态">
          <FormItem field="status">
            <Select options={statusOptions} />
          </FormItem>
        </FormLabel>
        <FormLabel label="描述">
          <FormItem field="description">
            <Input placeholder="请输入描述（可选）" />
          </FormItem>
        </FormLabel>
      </ModalForm>

      {/* 编辑里程碑弹窗 */}
      {editingMilestone && (
        <ModalForm
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingMilestone(null)
          }}
          title="编辑里程碑"
          onSubmit={handleUpdate}
          initialValues={{
            title: editingMilestone.title,
            description: editingMilestone.description || '',
            milestone_date: DateTime.fromISO(editingMilestone.milestone_date.toString()),
            status: editingMilestone.status,
          }}
        >
          <FormLabel label="标题" required>
            <FormItem field="title">
              <Input placeholder="请输入里程碑标题" />
            </FormItem>
          </FormLabel>
          <FormLabel label="日期" required>
            <FormItem field="milestone_date">
              <DatePicker />
            </FormItem>
          </FormLabel>
          <FormLabel label="状态">
            <FormItem field="status">
              <Select options={statusOptions} />
            </FormItem>
          </FormLabel>
          <FormLabel label="描述">
            <FormItem field="description">
              <Input placeholder="请输入描述（可选）" />
            </FormItem>
          </FormLabel>
        </ModalForm>
      )}
    </Panel>
  )
}