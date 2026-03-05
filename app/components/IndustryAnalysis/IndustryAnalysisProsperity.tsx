'use client'

import { useState, useEffect, useCallback } from 'react'
import type { IndustryAnalysisWithIndustry } from '@/types'
import Panel from '@/app/widget/Panel'
import Table from '@/app/widget/Table'
import Button from '@/app/widget/Button'
import IndustryAnalysisProsperityModal from './IndustryAnalysisProsperityModal'
import { DateTime } from 'luxon'

interface IndustryAnalysisProsperityProps {
  industryId: number | null
}

export default function IndustryAnalysisProsperity({ industryId }: IndustryAnalysisProsperityProps) {
  const [analyses, setAnalyses] = useState<IndustryAnalysisWithIndustry[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const fetchAnalyses = useCallback(async () => {
    if (!industryId) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('industryId', industryId.toString())
      
      const response = await fetch(`/api/industry-analysis?${params}`)
      const data = await response.json()
      setAnalyses(data.data || [])
    } catch (error) {
      console.error('Failed to fetch analyses:', error)
    } finally {
      setLoading(false)
    }
  }, [industryId])

  useEffect(() => {
    if (industryId) {
      fetchAnalyses()
    }
  }, [industryId, fetchAnalyses])

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这份报告吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/industry-analysis/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchAnalyses()
      } else {
        const error = await response.json()
        alert(`删除失败: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('删除失败')
    }
  }

  const columns = [
    {
      title: '报告日期',
      dataIndex: 'report_time',
      key: 'report_time',
      render: (value: any) => 
        value ? DateTime.fromJSDate(new Date(value)).toFormat('yyyy-MM-dd') : '-',
      width: '15%',
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: '25%',
    },
    {
      title: '发布方',
      dataIndex: 'publisher',
      key: 'publisher',
      render: (value: any) => value || '-',
      width: '15%',
    },
    {
      title: '创建时间',
      dataIndex: 'create_time',
      key: 'create_time',
      render: (value: any) =>
        DateTime.fromJSDate(new Date(value)).toFormat('yyyy-MM-dd HH:mm'),
      width: '15%',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (_: any, row: IndustryAnalysisWithIndustry) => (
        <div className="flex gap-2">
          <button
            onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {expandedId === row.id ? '收起' : '展开'}
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            删除
          </button>
        </div>
      ),
      width: '15%',
    },
  ]

  return (
    <>
      <Panel
        title="行业景气度分析"
        headerAction={
          <Button onClick={() => setShowModal(true)} disabled={!industryId}>
            上传新报告
          </Button>
        }
      >
        {!industryId ? (
          <div className="text-center py-8 text-slate-500">
            请先选择一个行业
          </div>
        ) : loading ? (
          <div className="text-center py-8 text-slate-500">
            加载中...
          </div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            暂无景气度分析报告
          </div>
        ) : (
          <div className="space-y-0">
            <Table columns={columns} dataSource={analyses} />
            
            {/* 展开详情行 */}
            {expandedId && (
              <div className="border-t">
                {analyses
                  .filter(a => a.id === expandedId)
                  .map(analysis => (
                    <div key={analysis.id} className="p-4 bg-slate-50">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="font-semibold text-sm mb-2">需求信号</h4>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {analysis.signal_demand || '暂无数据'}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm mb-2">价格信号</h4>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {analysis.signal_price || '暂无数据'}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm mb-2">供给信号</h4>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {analysis.signal_supply || '暂无数据'}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm mb-2">盈利信号</h4>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {analysis.signal_profitability || '暂无数据'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">综合总结</h4>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {analysis.summary || '暂无数据'}
                        </p>
                      </div>
                      {analysis.original_url && (
                        <div className="mt-3 pt-3 border-t text-xs">
                          <a 
                            href={analysis.original_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            查看源文件 →
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </Panel>

      <IndustryAnalysisProsperityModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchAnalyses}
        industryId={industryId || undefined}
      />
    </>
  )
}
