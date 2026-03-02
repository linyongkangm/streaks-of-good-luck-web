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
  milestone_date: DateTime | string
  status: string
}

interface HoverDate {
  isoDate: string
}

export default function IndustryAnalysisTimeLine({ industryId }: IndustryAnalysisTimeLineProps) {
  const [milestones, setMilestones] = useState<MilestoneWithRelations[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<MilestoneWithRelations | null>(null)
  const [hoverDate, setHoverDate] = useState<HoverDate | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [expandedYears, setExpandedYears] = useState<number[]>([new Date().getFullYear()])

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

  // 打开创建弹窗
  const handleOpenCreate = () => {
    setEditingMilestone(null)
    setShowModal(true)
  }

  // 打开编辑弹窗
  const handleOpenEdit = (milestone: MilestoneWithRelations) => {
    setEditingMilestone(milestone)
    setShowModal(true)
  }

  // 关闭弹窗
  const handleCloseModal = () => {
    setShowModal(false)
    setEditingMilestone(null)
  }

  // 切换年份展开/折叠
  const toggleYearExpanded = (year: number) => {
    setExpandedYears(prev =>
      prev.includes(year)
        ? prev.filter(y => y !== year)
        : [...prev, year]
    )
  }

  // 提交表单（创建或更新）
  const handleSubmit = async (e: React.FormEvent, values: MilestoneFormData) => {
    e.preventDefault()
    try {
      const url = editingMilestone
        ? `/api/milestones/${editingMilestone.id}`
        : '/api/milestones'

      const method = editingMilestone ? 'PUT' : 'POST'

      // 确保日期被正确转换为字符串
      const submissionData = {
        ...values,
        milestone_date: values.milestone_date instanceof DateTime
          ? values.milestone_date.toISODate()
          : values.milestone_date,
        industry_ids: industryId ? [industryId] : [],
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      })

      if (response.ok) {
        handleCloseModal()
        await fetchMilestones()
      }
    } catch (error) {
      console.error('Failed to save milestone:', error)
    }
  }

  // 删除 milestone
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个行业事件吗？')) return

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

  // 按日期快速查找 milestone
  const milestonesByDate = useMemo(() => {
    const grouped: Record<string, MilestoneWithRelations[]> = {}
    milestones.forEach(milestone => {
      const isoDate = new Date(milestone.milestone_date).toISOString().split('T')[0]
      if (!grouped[isoDate]) {
        grouped[isoDate] = []
      }
      grouped[isoDate].push(milestone)
    })
    return grouped
  }, [milestones])

  // 按年月快速查找 milestone
  const milestonesByMonth = useMemo(() => {
    const grouped: Record<string, MilestoneWithRelations[]> = {}
    milestones.forEach(milestone => {
      const yearMonth = new Date(milestone.milestone_date).toISOString().slice(0, 7)
      if (!grouped[yearMonth]) {
        grouped[yearMonth] = []
      }
      grouped[yearMonth].push(milestone)
    })
    return grouped
  }, [milestones])

  // 按年份快速查找 milestone
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

  // 生成年份+月份数据结构
  const yearMonthData = useMemo(() => {
    const startDate = DateTime.fromJSDate(dateRange.startDate)
    const endDate = DateTime.fromJSDate(dateRange.endDate)

    const yearGroups: Record<number, { monthStart: DateTime; days: DateTime[] }[]> = {}

    let currentMonth = startDate.startOf('month')
    while (currentMonth <= endDate) {
      const year = currentMonth.year
      if (!yearGroups[year]) {
        yearGroups[year] = []
      }

      const monthEnd = currentMonth.endOf('month')
      const monthDays = []
      let date = currentMonth

      while (date <= monthEnd && date <= endDate) {
        monthDays.push(date)
        date = date.plus({ days: 1 })
      }

      yearGroups[year].push({
        monthStart: currentMonth,
        days: monthDays,
      })

      currentMonth = currentMonth.plus({ months: 1 })
    }

    return yearGroups
  }, [dateRange])

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

  const renderMilestoneHoverPopover = (
    title: string,
    list: MilestoneWithRelations[],
    topOffset: number,
    showActions = false,
    getTitlePrefix?: (milestone: MilestoneWithRelations) => string
  ) => (
    <div
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-[280px] max-w-[400px]"
      style={{
        left: `${hoverPosition.x}px`,
        top: `${hoverPosition.y + topOffset}px`,
      }}
    >
      <div className="text-xs font-semibold text-gray-700 mb-2">{title}</div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {list.map(milestone => (
          <div key={milestone.id} className="text-xs">
            <div className="font-medium text-slate-800 mt-1 flex items-center gap-2">
              {getTitlePrefix && (
                <span className="text-gray-500 font-normal">{getTitlePrefix(milestone)}</span>
              )}
              <span>{milestone.title}</span>
            </div>
            {milestone.description && (
              <div className="text-gray-600 mt-1 line-clamp-2">{milestone.description}</div>
            )}
            {showActions && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    handleOpenEdit(milestone)
                    setHoverDate(null)
                  }}
                  className="text-blue-600 hover:text-blue-800 text-xs"
                >
                  编辑
                </button>
                <button
                  onClick={() => {
                    handleDelete(milestone.id)
                    setHoverDate(null)
                  }}
                  className="text-red-600 hover:text-red-800 text-xs"
                >
                  删除
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  if (!industryId) {
    return null
  }

  return (
    <Panel
      title="行业事件"
      headerAction={
        <Button size="small" onClick={handleOpenCreate}>
          新增事件
        </Button>
      }>

      {loading ? (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      ) : milestones.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无行业事件数据</div>
      ) : (
        <div className="space-y-4">
          {Object.keys(yearMonthData)
            .map(Number)
            .sort((a, b) => a - b)
            .map(year => {
              const yearMilestones = milestonesByYear[year] || []
              const isExpanded = expandedYears.includes(year)
              const yearHovered = hoverDate && hoverDate.isoDate === `${year}-year`

              return (
                <div key={year} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* 年份标题行 */}
                  <div
                    className="bg-slate-100 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-200 transition-colors relative"
                    onClick={() => toggleYearExpanded(year)}
                    onMouseEnter={(e) => {
                      if (yearMilestones.length > 0) {
                        const rect = (e.target as HTMLElement).getBoundingClientRect()
                        setHoverDate({ isoDate: `${year}-year` })
                        setHoverPosition({ x: rect.left, y: rect.top })
                      }
                    }}
                    onMouseLeave={() => setHoverDate(null)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-slate-800">{year}</span>
                      <span className="text-sm text-gray-600">
                        ({yearMilestones.length} 个事件)
                      </span>
                      <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        ▶
                      </span>
                    </div>

                    {/* 年份 hover 气泡 */}
                    {yearHovered && yearMilestones.length > 0 && (
                      renderMilestoneHoverPopover(
                        `${year} 年所有事件 (${yearMilestones.length})`,
                        yearMilestones,
                        40,
                        false,
                        (milestone) => DateTime.fromJSDate(new Date(milestone.milestone_date)).toFormat('MM月dd日')
                      )
                    )}
                  </div>

                  {/* 月份行 - 展开时显示 */}
                  {isExpanded && (
                    <div className="space-y-2 p-4">
                      {yearMonthData[year].map((month, mIndex) => {
                        const monthKey = month.monthStart.toFormat('yyyy-MM')
                        const monthMilestones = milestonesByMonth[monthKey] || []
                        const monthNum = month.monthStart.month
                        const monthHovered = hoverDate?.isoDate === monthKey

                        return (
                          <div key={mIndex} className="flex items-center gap-3">
                            {/* 月份标签 */}
                            <div
                              className="relative"
                              onMouseEnter={(e) => {
                                if (monthMilestones.length > 0) {
                                  const rect = (e.target as HTMLElement).getBoundingClientRect()
                                  setHoverDate({ isoDate: monthKey })
                                  setHoverPosition({ x: rect.left, y: rect.top })
                                }
                              }}
                              onMouseLeave={() => setHoverDate(null)}
                            >
                              <div className="text-sm font-semibold text-slate-700 min-w-[50px]">
                                {monthMilestones.length > 0 ? (
                                  <>{monthNum}月</>
                                ) : (
                                  <span className="text-gray-400">{monthNum}月</span>
                                )}
                              </div>

                              {/* 月份 hover 气泡 */}
                              {monthHovered && monthMilestones.length > 0 && (
                                renderMilestoneHoverPopover(
                                  `${month.monthStart.toFormat('MM 月')} (${monthMilestones.length})`,
                                  monthMilestones,
                                  30,
                                  false,
                                  (milestone) => DateTime.fromJSDate(new Date(milestone.milestone_date)).toFormat('dd日')
                                )
                              )}
                            </div>

                            {/* 日历格子 - 一行展示该月所有天数 */}
                            <div className="flex gap-0.5 overflow-x-auto pb-1 flex-1">
                              {month.days.map((date, dayIndex) => {
                                const isoDate = date.toISODate() || ''
                                const dayMilestones: MilestoneWithRelations[] = isoDate ? (milestonesByDate[isoDate] || []) : []
                                const hasMilestone = dayMilestones && dayMilestones.length > 0
                                const isHovered = hoverDate?.isoDate === isoDate

                                return (
                                  <div
                                    key={dayIndex}
                                    className="relative flex-shrink-0"
                                    onMouseEnter={(e) => {
                                      if (hasMilestone && isoDate) {
                                        const rect = (e.target as HTMLElement).getBoundingClientRect()
                                        setHoverDate({ isoDate })
                                        setHoverPosition({ x: rect.left, y: rect.top })
                                      }
                                    }}
                                    onMouseLeave={() => setHoverDate(null)}
                                  >
                                    <div
                                      className={`rounded cursor-pointer transition-all flex items-center justify-center text-[10px] font-medium ${
                                        hasMilestone
                                          ? 'bg-blue-400 hover:bg-blue-500 px-1.5 py-0.5 whitespace-nowrap text-white'
                                          : 'w-5 h-5 bg-gray-200 hover:bg-gray-300'
                                      }`}
                                    >
                                      {hasMilestone && dayMilestones.map((m, idx) => (
                                        <span key={m.id}>
                                          {idx > 0 && <span className="mx-0.5">|</span>}
                                          {m.title.substring(0, 2)}
                                        </span>
                                      ))}
                                    </div>

                                    {/* Hover 气泡 */}
                                    {isHovered && hasMilestone && (
                                      renderMilestoneHoverPopover(
                                        `${date?.toFormat('yyyy-MM-dd (cccc)')}`,
                                        dayMilestones,
                                        20,
                                        true
                                      )
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}

      {/* 创建/编辑行业事件弹窗 */}
      <ModalForm
        open={showModal}
        onClose={handleCloseModal}
        title={editingMilestone ? '编辑行业事件' : '新增行业事件'}
        onSubmit={handleSubmit}
        submitText={editingMilestone ? '保存' : '创建'}
        initialValues={{
          title: editingMilestone?.title || '',
          description: editingMilestone?.description || '',
          milestone_date: editingMilestone
            ? DateTime.fromISO(new Date(editingMilestone.milestone_date).toISOString().split('T')[0])
            : DateTime.now(),
          status: editingMilestone?.status || 'planned',
        }}
      >
        <FormLabel label="标题" required>
          <FormItem field="title">
            <Input placeholder="请输入行业事件标题" />
          </FormItem>
        </FormLabel>
        <FormLabel label="日期" required>
          <FormItem field="milestone_date">
            <DatePicker />
          </FormItem>
        </FormLabel>
        <FormLabel label="描述">
          <FormItem field="description">
            <Input placeholder="请输入描述（可选）" />
          </FormItem>
        </FormLabel>
      </ModalForm>
    </Panel>
  )
}