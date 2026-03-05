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

export default function IndustryAnalysisProsperityModal({
  open,
  onClose,
  onSuccess,
  industryId,
}: IndustryAnalysisProsperityModalProps) {
  const [loading, setLoading] = useState(false)
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file')
  const [formData, setFormData] = useState({
    file: null as File | null,
    fileUrl: '',
    title: '',
    publisher: '',
    author: '',
    reportDate: DateTime.now(),
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, file }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (uploadMode === 'file' && !formData.file) {
      alert('请选择PDF文件')
      return
    }
    
    if (uploadMode === 'url' && !formData.fileUrl) {
      alert('请输入PDF链接')
      return
    }

    setLoading(true)
    try {
      const submitFormData = new FormData()
      
      if (uploadMode === 'file' && formData.file) {
        submitFormData.append('file', formData.file)
      } else if (uploadMode === 'url') {
        submitFormData.append('fileUrl', formData.fileUrl)
      }
      
      if (industryId) {
        submitFormData.append('industryId', industryId.toString())
      }
      
      if (formData.title) {
        submitFormData.append('title', formData.title)
      }
      
      if (formData.publisher) {
        submitFormData.append('publisher', formData.publisher)
      }
      
      if (formData.author) {
        submitFormData.append('author', formData.author)
      }
      
      submitFormData.append('reportDate', formData.reportDate.toISODate())

      const response = await fetch('/api/industry-analysis', {
        method: 'POST',
        body: submitFormData,
      })

      if (response.ok) {
        onClose()
        await onSuccess()
        // 重置表单
        setFormData({
          file: null,
          fileUrl: '',
          title: '',
          publisher: '',
          author: '',
          reportDate: DateTime.now(),
        })
      } else {
        const error = await response.json()
        alert(`上传失败: ${error.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('Failed to upload:', error)
      alert(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalForm
      open={open}
      onClose={onClose}
      title="上传行业景气度报告"
      onSubmit={handleSubmit}
      submitText={loading ? '分析中...' : '上传并分析'}
    >
      {/* 上传模式选择 */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => {
            setUploadMode('file')
            setFormData(prev => ({ ...prev, fileUrl: '' }))
          }}
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
            setFormData(prev => ({ ...prev, file: null }))
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
            {formData.file ? (
              <div className="text-sm">
                <p className="font-medium text-blue-600">{formData.file.name}</p>
                <p className="text-slate-500 mt-1">
                  {(formData.file.size / 1024 / 1024).toFixed(2)}MB
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
            <Input
              placeholder="请输入PDF文件链接（http://...）"
              value={formData.fileUrl}
              onChange={(value) => setFormData(prev => ({ ...prev, fileUrl: value }))}
            />
          </FormItem>
        </FormLabel>
      )}

      {/* 可选字段 */}
      <FormLabel label="报告日期">
        <FormItem field="reportDate">
          <DatePicker
            value={formData.reportDate}
            onChange={(date) => setFormData(prev => ({ ...prev, reportDate: date }))}
          />
        </FormItem>
      </FormLabel>

      <FormLabel label="标题（可选）">
        <FormItem field="title">
          <Input
            placeholder="如：2024年新能源汽车行业分析报告"
            value={formData.title}
            onChange={(value) => setFormData(prev => ({ ...prev, title: value }))}
          />
        </FormItem>
      </FormLabel>

      <FormLabel label="发布方（可选）">
        <FormItem field="publisher">
          <Input
            placeholder="如：中国汽车工业协会"
            value={formData.publisher}
            onChange={(value) => setFormData(prev => ({ ...prev, publisher: value }))}
          />
        </FormItem>
      </FormLabel>

      <FormLabel label="作者（可选）">
        <FormItem field="author">
          <Input
            placeholder="如：李明"
            value={formData.author}
            onChange={(value) => setFormData(prev => ({ ...prev, author: value }))}
          />
        </FormItem>
      </FormLabel>
    </ModalForm>
  )
}
