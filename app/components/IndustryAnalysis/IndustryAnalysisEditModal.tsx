'use client'

import { useState, useEffect } from 'react'
import ModalForm from '@/app/widget/ModalForm'
import { FormItem, FormLabel } from '@/app/widget/Form'
import Input, { TextArea } from '@/app/widget/Input'
import DatePicker from '@/app/widget/DatePicker'
import Select from '@/app/widget/Select'
import Button from '@/app/widget/Button'
import { DateTime } from 'luxon'
import type { IndustryAnalysisWithIndustry } from '@/types'

interface IndustryAnalysisEditModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => Promise<void>
  analysis: IndustryAnalysisWithIndustry | null
}

export interface EditFormData {
  title: string
  publisher: string
  author: string
  reportDate: DateTime | string
  signal_demand: string
  signal_price: string
  signal_supply: string
  signal_profitability: string
  summary: string
  trend_demand: string
  trend_price: string
  trend_supply: string
  trend_profitability: string
  trend_summary: string
}

const trendOptions = [
  { value: '景气上行', label: '景气上行' },
  { value: '景气企稳', label: '景气企稳' },
  { value: '景气下行', label: '景气下行' },
  { value: '未获取', label: '未获取' },
]

export default function IndustryAnalysisEditModal({
  open,
  onClose,
  onSuccess,
  analysis,
}: IndustryAnalysisEditModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regeneratingTrends, setRegeneratingTrends] = useState(false)

  const handleSubmit = async (e: React.FormEvent, values: EditFormData) => {
    e.preventDefault()

    if (!analysis) return

    setSubmitting(true)
    try {
      const reportDate = values.reportDate instanceof DateTime
        ? values.reportDate.toISODate()
        : values.reportDate

      const response = await fetch(`/api/industry-analysis/${analysis.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title,
          publisher: values.publisher,
          author: values.author,
          report_time: reportDate,
          signal_demand: values.signal_demand,
          signal_price: values.signal_price,
          signal_supply: values.signal_supply,
          signal_profitability: values.signal_profitability,
          summary: values.summary,
          trend_demand: values.trend_demand,
          trend_price: values.trend_price,
          trend_supply: values.trend_supply,
          trend_profitability: values.trend_profitability,
          trend_summary: values.trend_summary,
        }),
      })

      if (response.ok) {
        onClose()
        await onSuccess()
      } else {
        const error = await response.json()
        alert(`更新失败: ${error.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('Failed to update:', error)
      alert(`更新失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegenerateAll = async () => {
    if (!analysis) return
    if (!confirm('确定要重新生成所有信号和总结以及景气度吗？这将覆盖现有内容。')) return

    setRegenerating(true)
    try {
      const response = await fetch(`/api/industry-analysis/${analysis.id}/regenerate`, {
        method: 'POST',
      })

      if (response.ok) {
        alert('重新生成成功')
        await onSuccess()
      } else {
        const error = await response.json()
        alert(`重新生成失败: ${error.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('Failed to regenerate:', error)
      alert(`重新生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setRegenerating(false)
    }
  }

  const handleRegenerateTrends = async () => {
    if (!analysis) return
    if (!confirm('确定要重新生成所有景气度吗？')) return

    setRegeneratingTrends(true)
    try {
      const response = await fetch(`/api/industry-analysis/${analysis.id}/regenerate-trends`, {
        method: 'POST',
      })

      if (response.ok) {
        alert('重新生成景气度成功')
        await onSuccess()
      } else {
        const error = await response.json()
        alert(`重新生成景气度失败: ${error.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('Failed to regenerate trends:', error)
      alert(`重新生成景气度失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setRegeneratingTrends(false)
    }
  }

  if (!analysis) return null

  return (
    <ModalForm
      open={open}
      onClose={onClose}
      title="编辑行业景气度分析"
      onSubmit={handleSubmit}
      submitText={submitting ? '保存中...' : '保存'}
      initialValues={{
        title: analysis.title || '',
        publisher: analysis.publisher || '',
        author: analysis.author || '',
        reportDate: analysis.report_time ? DateTime.fromJSDate(new Date(analysis.report_time)) : DateTime.now(),
        signal_demand: analysis.signal_demand || '',
        signal_price: analysis.signal_price || '',
        signal_supply: analysis.signal_supply || '',
        signal_profitability: analysis.signal_profitability || '',
        summary: analysis.summary || '',
        trend_demand: analysis.trend_demand || '未获取',
        trend_price: analysis.trend_price || '未获取',
        trend_supply: analysis.trend_supply || '未获取',
        trend_profitability: analysis.trend_profitability || '未获取',
        trend_summary: analysis.trend_summary || '未获取',
      }}
    >
      {/* 重新生成按钮 */}
      <div className="mb-4 flex gap-2">
        <Button
          type="button"
          onClick={handleRegenerateAll}
          disabled={regenerating}
          size="small"
        >
          {regenerating ? '生成中...' : '重新生成所有内容'}
        </Button>
        <Button
          type="button"
          onClick={handleRegenerateTrends}
          disabled={regeneratingTrends}
          size="small"
        >
          {regeneratingTrends ? '生成中...' : '重新生成景气度'}
        </Button>
      </div>

      {/* 基本信息 */}
      <FormLabel label="报告日期">
        <FormItem field="reportDate">
          <DatePicker />
        </FormItem>
      </FormLabel>

      <FormLabel label="标题">
        <FormItem field="title">
          <Input placeholder="报告标题" />
        </FormItem>
      </FormLabel>

      <FormLabel label="发布方">
        <FormItem field="publisher">
          <Input placeholder="发布方" />
        </FormItem>
      </FormLabel>

      <FormLabel label="作者">
        <FormItem field="author">
          <Input placeholder="作者" />
        </FormItem>
      </FormLabel>

      {/* 需求信号 */}
      <div className="border-t pt-4 mt-4">
        <FormLabel label="需求信号内容">
          <FormItem field="signal_demand">
            <TextArea rows={10} placeholder="需求信号分析内容" />
          </FormItem>
        </FormLabel>
        <FormLabel label="需求信号景气度">
          <FormItem field="trend_demand">
            <Select options={trendOptions} />
          </FormItem>
        </FormLabel>
      </div>

      {/* 价格信号 */}
      <div className="border-t pt-4 mt-4">
        <FormLabel label="价格信号内容">
          <FormItem field="signal_price">
            <TextArea rows={10} placeholder="价格信号分析内容" />
          </FormItem>
        </FormLabel>
        <FormLabel label="价格信号景气度">
          <FormItem field="trend_price">
            <Select options={trendOptions} />
          </FormItem>
        </FormLabel>
      </div>

      {/* 供给信号 */}
      <div className="border-t pt-4 mt-4">
        <FormLabel label="供给信号内容">
          <FormItem field="signal_supply">
            <TextArea rows={10} placeholder="供给信号分析内容" />
          </FormItem>
        </FormLabel>
        <FormLabel label="供给信号景气度">
          <FormItem field="trend_supply">
            <Select options={trendOptions} />
          </FormItem>
        </FormLabel>
      </div>

      {/* 盈利信号 */}
      <div className="border-t pt-4 mt-4">
        <FormLabel label="盈利信号内容">
          <FormItem field="signal_profitability">
            <TextArea rows={10} placeholder="盈利信号分析内容" />
          </FormItem>
        </FormLabel>
        <FormLabel label="盈利信号景气度">
          <FormItem field="trend_profitability">
            <Select options={trendOptions} />
          </FormItem>
        </FormLabel>
      </div>

      {/* 综合总结 */}
      <div className="border-t pt-4 mt-4">
        <FormLabel label="总结内容">
          <FormItem field="summary">
            <TextArea rows={10} placeholder="综合总结内容" />
          </FormItem>
        </FormLabel>
        <FormLabel label="总结景气度">
          <FormItem field="trend_summary">
            <Select options={trendOptions} />
          </FormItem>
        </FormLabel>
      </div>
    </ModalForm>
  )
}
