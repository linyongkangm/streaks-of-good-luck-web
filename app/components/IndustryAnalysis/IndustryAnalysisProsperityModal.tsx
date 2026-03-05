'use client'

import { useState, useRef } from 'react'
import ModalForm from '@/app/widget/ModalForm'
import { FormItem, FormLabel } from '@/app/widget/Form'
import Input, { TextArea } from '@/app/widget/Input'
import DatePicker from '@/app/widget/DatePicker'
import { DateTime } from 'luxon'

interface IndustryAnalysisProsperityModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => Promise<void>
  industryId?: number
}

export interface ProsperityFormData {
  fileUrl: string
  title: string
  publisher: string
  author: string
  reportDate: DateTime | string
}

export default function IndustryAnalysisProsperityModal({
  open,
  onClose,
  onSuccess,
  industryId,
}: IndustryAnalysisProsperityModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent, values: ProsperityFormData) => {
    e.preventDefault()
    
    // 验证：文件模式需要选择文件，URL模式需要输入URL
    if (uploadMode === 'file' && !selectedFile) {
      alert('请选择PDF文件')
      return
    }
    
    if (uploadMode === 'url' && !values.fileUrl) {
      alert('请输入PDF链接')
      return
    }

    setSubmitting(true)
    try {
      const submitFormData = new FormData()
      
      if (uploadMode === 'file' && selectedFile) {
        submitFormData.append('file', selectedFile)
      } else if (uploadMode === 'url') {
        submitFormData.append('fileUrl', values.fileUrl)
      }
      
      if (industryId) {
        submitFormData.append('industryId', industryId.toString())
      }
      
      if (values.title) {
        submitFormData.append('title', values.title)
      }
      
      if (values.publisher) {
        submitFormData.append('publisher', values.publisher)
      }
      
      if (values.author) {
        submitFormData.append('author', values.author)
      }
      
      // 确保日期被正确转换为字符串
      const reportDate = values.reportDate instanceof DateTime
        ? values.reportDate.toISODate()
        : values.reportDate
      if (reportDate) {
        submitFormData.append('reportDate', reportDate)
      }

      const response = await fetch('/api/industry-analysis', {
        method: 'POST',
        body: submitFormData,
      })

      if (response.ok) {
        onClose()
        await onSuccess()
        // 重置表单
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        const error = await response.json()
        alert(`上传失败: ${error.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('Failed to upload:', error)
      alert(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalForm
      open={open}
      onClose={onClose}
      title="上传行业景气度报告"
      onSubmit={handleSubmit}
      submitText={submitting ? '分析中...' : '上传并分析'}
      initialValues={{
        fileUrl: '',
        title: '',
        publisher: '',
        author: '',
        reportDate: DateTime.now(),
      }}
    >
      {/* 上传模式选择 */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setUploadMode('file')}
          className={`flex-1 py-2 px-3 rounded border transition-colors ${
            uploadMode === 'file'
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-slate-700 border-slate-300'
          }`}
        >
          上传文件
        </button>
        <button
          type="button"
          onClick={() => {
            setUploadMode('url')
            setSelectedFile(null)
            if (fileInputRef.current) {
              fileInputRef.current.value = ''
            }
          }}
          className={`flex-1 py-2 px-3 rounded border transition-colors ${
            uploadMode === 'url'
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-slate-700 border-slate-300'
          }`}
        >
          链接方式
        </button>
      </div>

      {/* 文件上传区 */}
      {uploadMode === 'file' && (
        <FormLabel label="选择PDF文件" required>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile ? (
              <div className="text-sm">
                <p className="font-medium text-blue-600">{selectedFile.name}</p>
                <p className="text-slate-500 mt-1">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)}MB
                </p>
              </div>
            ) : (
              <div className="text-slate-500">
                <p>点击或拖拽上传PDF文件</p>
                <p className="text-xs mt-1">支持PDF格式</p>
              </div>
            )}
          </div>
        </FormLabel>
      )}

      {/* URL输入区 */}
      {uploadMode === 'url' && (
        <FormLabel label="PDF链接" required>
          <FormItem field="fileUrl">
            <Input placeholder="请输入PDF文件链接（http://...）" />
          </FormItem>
        </FormLabel>
      )}

      {/* 可选字段 */}
      <FormLabel label="报告日期">
        <FormItem field="reportDate">
          <DatePicker />
        </FormItem>
      </FormLabel>

      <FormLabel label="标题（可选）">
        <FormItem field="title">
          <Input placeholder="如：2024年新能源汽车行业分析报告" />
        </FormItem>
      </FormLabel>

      <FormLabel label="发布方（可选）">
        <FormItem field="publisher">
          <Input placeholder="如：中国汽车工业协会" />
        </FormItem>
      </FormLabel>

      <FormLabel label="作者（可选）">
        <FormItem field="author">
          <Input placeholder="如：李明" />
        </FormItem>
      </FormLabel>
    </ModalForm>
  )
}
