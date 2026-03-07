'use client'

import { useState, useRef } from 'react'
import ModalForm from '@/app/widget/ModalForm'
import type { FormRef } from '@/app/widget/Form'
import { FormItem, FormLabel } from '@/app/widget/Form'
import Input, { TextArea } from '@/app/widget/Input'
import DatePicker from '@/app/widget/DatePicker'
import { DateTime } from 'luxon'
import type { summary__article } from '@/types'

interface IndustryAnalysisProsperityModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => Promise<void>
  industryId?: number
  relatedArticles?: summary__article[]
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
  relatedArticles = [],
}: IndustryAnalysisProsperityModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [uploadMode, setUploadMode] = useState<'file' | 'url' | 'article'>('file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<summary__article | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<FormRef>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleSelectArticle = (article: summary__article) => {
    setSelectedArticle(article)
    const currentValues = formRef.current?.getValues() || {}
    formRef.current?.setValues({
      ...currentValues,
      title: article.title || '',
      publisher: article.publication || '',
      author: article.contributor || '',
      reportDate: article.issue_date
        ? DateTime.fromJSDate(new Date(article.issue_date))
        : currentValues.reportDate,
    })
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

    if (uploadMode === 'article' && !selectedArticle) {
      alert('请选择关联文章')
      return
    }

    if (uploadMode === 'article' && !selectedArticle?.source_text?.trim()) {
      alert('所选文章缺少原文内容，无法直接生成景气度报告')
      return
    }

    setSubmitting(true)
    try {
      const submitFormData = new FormData()
      
      if (uploadMode === 'file' && selectedFile) {
        submitFormData.append('file', selectedFile)
      } else if (uploadMode === 'url') {
        submitFormData.append('fileUrl', values.fileUrl)
      } else if (uploadMode === 'article' && selectedArticle) {
        submitFormData.append('sourceText', selectedArticle.source_text || '')
      }
      
      if (industryId) {
        submitFormData.append('industryId', industryId.toString())
      }
      
      const finalTitle = values.title || selectedArticle?.title
      if (finalTitle) {
        submitFormData.append('title', finalTitle)
      }
      
      const finalPublisher = values.publisher || selectedArticle?.publication || ''
      if (finalPublisher) {
        submitFormData.append('publisher', finalPublisher)
      }
      
      const finalAuthor = values.author || selectedArticle?.contributor || ''
      if (finalAuthor) {
        submitFormData.append('author', finalAuthor)
      }
      
      // 确保日期被正确转换为字符串
      const reportDate = values.reportDate instanceof DateTime
        ? values.reportDate.toISODate()
        : values.reportDate
      const articleReportDate = selectedArticle?.issue_date
        ? DateTime.fromJSDate(new Date(selectedArticle.issue_date)).toISODate()
        : null
      const finalReportDate = uploadMode === 'article'
        ? (articleReportDate || reportDate)
        : reportDate
      if (finalReportDate) {
        submitFormData.append('reportDate', finalReportDate)
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
        setSelectedArticle(null)
        setUploadMode('file')
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
      formRef={formRef}
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
            setSelectedArticle(null)
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
        <button
          type="button"
          onClick={() => {
            setUploadMode('article')
            setSelectedFile(null)
            if (fileInputRef.current) {
              fileInputRef.current.value = ''
            }
          }}
          className={`flex-1 py-2 px-3 rounded border transition-colors ${
            uploadMode === 'article'
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-slate-700 border-slate-300'
          }`}
        >
          关联文章
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

      {uploadMode === 'article' && (
        <FormLabel label="选择关联文章" required>
          {relatedArticles.length > 0 ? (
            <div className="max-h-56 overflow-y-auto divide-y rounded border border-slate-200">
              {relatedArticles.map((article) => {
                const isSelected = String(selectedArticle?.id) === String(article.id)
                return (
                  <button
                    key={String(article.id)}
                    type="button"
                    onClick={() => handleSelectArticle(article)}
                    className={`w-full text-left px-3 py-2 transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-800 truncate">{article.title}</p>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {article.publication || '未知来源'}
                      {article.issue_date
                        ? ` · ${DateTime.fromJSDate(new Date(article.issue_date)).toFormat('yyyy-MM-dd')}`
                        : ''}
                    </p>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-500 border border-dashed border-slate-300 rounded p-3">
              当前行业暂无关联文章，请先在行业详情中关联文章。
            </div>
          )}
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
