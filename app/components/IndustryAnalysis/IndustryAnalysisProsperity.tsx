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
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  // 文本折叠渲染函数
  const renderCollapsibleText = (text: string | null | undefined, isExpanded: boolean) => {
    if (!text) return '暂无数据'

    const lines = text.split('\n')
    const isLongText = lines.length > 2 || text.length > 100

    if (!isExpanded && isLongText) {
      // 收起状态：显示前两行或前100个字符
      const collapsedText = lines.slice(0, 2).join('\n').slice(0, 100)
      return (
        <div className="text-sm text-slate-700 line-clamp-2">{collapsedText}</div>
      )
    }

    // 展开状态：显示全部
    return (
      <div className="text-sm text-slate-700 whitespace-pre-wrap">{text}</div>
    )
  }

  const fetchAnalyses = useCallback(async () => {
    if (!industryId) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('industryId', industryId.toString())

      const response = await fetch(`/api/industry-analysis?${params}`)
      const data = await response.json()
      setAnalyses(data.data || [])

      // 默认展开最新的一条报告
      if (data.data && data.data.length > 0) {
        const latestId = data.data[0].id
        setExpandedIds(new Set([latestId]))
      }
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
      render: (value: any) =>
        value ? DateTime.fromJSDate(new Date(value)).toFormat('yyyy-MM-dd') : '-',
    },
    {
      title: '标题',
      dataIndex: 'title',
      render: (value: any, row: IndustryAnalysisWithIndustry) => <>{row.publisher}<br />{value}</>
    },
    {
      title: '需求信号',
      dataIndex: 'signal_demand',
      render: (value: any, row: IndustryAnalysisWithIndustry) =>
        renderCollapsibleText(value, expandedIds.has(row.id)),
      width: '15%',
    },
    {
      title: '价格信号',
      dataIndex: 'signal_price',
      render: (value: any, row: IndustryAnalysisWithIndustry) =>
        renderCollapsibleText(value, expandedIds.has(row.id)),
      width: '15%',
    },
    {
      title: '供给信号',
      dataIndex: 'signal_supply',
      render: (value: any, row: IndustryAnalysisWithIndustry) =>
        renderCollapsibleText(value, expandedIds.has(row.id)),
      width: '15%',
    },
    {
      title: '盈利信号',
      dataIndex: 'signal_profitability',
      render: (value: any, row: IndustryAnalysisWithIndustry) =>
        renderCollapsibleText(value, expandedIds.has(row.id)),
      width: '15%',
    },
    {
      title: '综合总结',
      dataIndex: 'summary',
      render: (value: any, row: IndustryAnalysisWithIndustry) =>
        renderCollapsibleText(value, expandedIds.has(row.id)),
      width: '15%',
    },
    {
      title: '操作',
      dataIndex: 'action',
      render: (_: any, row: IndustryAnalysisWithIndustry) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (expandedIds.has(row.id)) {
                const newSet = new Set(expandedIds)
                newSet.delete(row.id)
                setExpandedIds(newSet)
              } else {
                setExpandedIds(new Set([...expandedIds, row.id]))
              }
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {expandedIds.has(row.id) ? '收起' : '展开'}
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            删除
          </button>
        </div>
      ),
      width: 100,
    },
  ]

  return (
    <>
      <Panel
        title="行业景气度分析"
        headerAction={
          <Button size='small' onClick={() => setShowModal(true)} disabled={!industryId}>
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
