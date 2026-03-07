'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from '@/app/widget/Modal'
import Button from '@/app/widget/Button'
import Input from '@/app/widget/Input'
import { DateTime } from 'luxon'
import type { MilestoneWithRelations } from '@/types'

interface MilestoneCandidate extends MilestoneWithRelations {
  linked: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => Promise<void>
  industryId?: number
}

export default function IndustryAnalysisMilestoneSelectorModal({
  open,
  onClose,
  onSuccess,
  industryId,
}: Props) {
  const [title, setTitle] = useState('')
  const [keyword, setKeyword] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [includeLinked, setIncludeLinked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [items, setItems] = useState<MilestoneCandidate[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const selectableItems = useMemo(() => items.filter((item) => !item.linked), [items])

  const fetchCandidates = async () => {
    if (!industryId) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        industryId: industryId.toString(),
        onlyUnlinked: includeLinked ? 'false' : 'true',
        limit: '200',
      })

      if (title.trim()) params.set('title', title.trim())
      if (keyword.trim()) params.set('keyword', keyword.trim())
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const response = await fetch(`/api/milestones/select?${params.toString()}`)
      const data = await response.json()
      setItems(data.data || [])
      setSelectedIds([])
    } catch (error) {
      console.error('Failed to fetch milestone candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && industryId) {
      fetchCandidates()
    }
  }, [open, industryId, includeLinked])

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    )
  }

  const selectAllUnlinked = () => {
    setSelectedIds(selectableItems.map((item) => item.id))
  }

  const clearSelection = () => {
    setSelectedIds([])
  }

  const handleSubmit = async () => {
    if (!industryId || selectedIds.length === 0) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/milestones/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry_id: industryId,
          milestone_ids: selectedIds,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        alert(errorData?.error || '关联失败')
        return
      }

      onClose()
      await onSuccess()
    } catch (error) {
      console.error('Failed to link milestones:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="选择已有事件" maxWidth="2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="按标题筛选"
            value={title}
            onChange={setTitle}
          />
          <Input
            placeholder="按关键词筛选"
            value={keyword}
            onChange={setKeyword}
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm">
            <label className="inline-flex items-center gap-2 text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={includeLinked}
                onChange={(e) => setIncludeLinked(e.target.checked)}
              />
              包含已关联事件
            </label>
            <span className="text-slate-400">共 {items.length} 条</span>
          </div>
          <div className="flex gap-2">
            <Button size="tiny" look="secondary" onClick={fetchCandidates}>搜索</Button>
            <Button size="tiny" look="success" onClick={selectAllUnlinked}>全选未关联</Button>
            <Button size="tiny" look="cancel" onClick={clearSelection}>清空选择</Button>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg max-h-[420px] overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="py-10 text-center text-slate-500">加载中...</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-slate-400">没有匹配的事件</div>
          ) : (
            items.map((item) => {
              const dateLabel = DateTime.fromJSDate(new Date(item.milestone_date)).toFormat('yyyy-MM-dd')
              const checked = selectedIds.includes(item.id)

              return (
                <div key={item.id} className="px-4 py-3 flex gap-3 items-start hover:bg-slate-50">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    disabled={item.linked}
                    onChange={() => toggleSelect(item.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{item.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{dateLabel}</span>
                      {item.keyword && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {item.keyword}
                        </span>
                      )}
                      {item.linked && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">已关联</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button look="cancel" size="small" onClick={onClose}>取消</Button>
          <Button
            look="primary"
            size="small"
            onClick={handleSubmit}
            disabled={selectedIds.length === 0 || submitting}
          >
            关联已选事件 ({selectedIds.length})
          </Button>
        </div>
      </div>
    </Modal>
  )
}
