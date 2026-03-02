'use client'

import { useState } from 'react'
import ModalForm from '@/app/widget/ModalForm'
import { FormItem, FormLabel } from '@/app/widget/Form'
import Input, { TextArea } from '@/app/widget/Input'
import DatePicker from '@/app/widget/DatePicker'
import type { MilestoneWithRelations } from '@/types'
import { DateTime } from 'luxon'

interface IndustryAnalysisMilestoneModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => Promise<void>
  industryId?: number
  articleId?: bigint | null
  initialValues?: Partial<MilestoneWithRelations> | null
}

export interface MilestoneFormData {
  title: string
  description: string
  milestone_date: DateTime | string
  keyword: string
}

export default function IndustryAnalysisMilestoneModal({
  open,
  onClose,
  onSuccess,
  industryId,
  articleId,
  initialValues,
}: IndustryAnalysisMilestoneModalProps) {
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent, values: MilestoneFormData) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = initialValues?.id
        ? `/api/milestones/${initialValues.id}`
        : '/api/milestones'

      const method = initialValues?.id ? 'PUT' : 'POST'

      // 确保日期被正确转换为字符串
      const submissionData = {
        ...values,
        milestone_date: values.milestone_date instanceof DateTime
          ? values.milestone_date.toISODate()
          : values.milestone_date,
        industry_ids: industryId ? [industryId] : [],
        article_id: articleId ? articleId.toString() : null,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      })

      if (response.ok) {
        onClose()
        await onSuccess()
      }
    } catch (error) {
      console.error('Failed to save milestone:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalForm
      open={open}
      onClose={onClose}
      title={initialValues?.id ? '编辑行业事件' : '新增行业事件'}
      onSubmit={handleSubmit}
      submitText={initialValues?.id ? '保存' : '创建'}
      initialValues={{
        title: initialValues?.title || '',
        description: initialValues?.description || '',
        milestone_date: initialValues?.milestone_date
          ? DateTime.fromISO(new Date(initialValues.milestone_date).toISOString().split('T')[0])
          : DateTime.now(),
        keyword: initialValues?.keyword || '',
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
          <TextArea placeholder="请输入描述（可选）" rows={10} />
        </FormItem>
      </FormLabel>
      <FormLabel label="关键词">
        <FormItem field="keyword">
          <Input placeholder="最多 8 个汉字（可选，不填则自动生成）" maxLength={8} />
        </FormItem>
      </FormLabel>
    </ModalForm>
  )
}
