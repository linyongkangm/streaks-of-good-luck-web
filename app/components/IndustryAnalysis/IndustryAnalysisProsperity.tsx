'use client'

import { useState, useEffect, useCallback } from 'react'
import type { IndustryAnalysisWithIndustry, IndustryWithArticles } from '@/types'
import Panel from '@/app/widget/Panel'
import Table from '@/app/widget/Table'
import Button from '@/app/widget/Button'
import IndustryAnalysisProsperityModal from './IndustryAnalysisProsperityModal'
import IndustryAnalysisEditModal from './IndustryAnalysisEditModal'
import { DateTime } from 'luxon'

interface IndustryAnalysisProsperityProps {
  industryDetail: IndustryWithArticles | null
}

export default function IndustryAnalysisProsperity({ industryDetail }: IndustryAnalysisProsperityProps) {
  const industryId = industryDetail?.id
  const [analyses, setAnalyses] = useState<IndustryAnalysisWithIndustry[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAnalysis, setEditingAnalysis] = useState<IndustryAnalysisWithIndustry | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  // 景气度徽章渲染函数
  const renderTrendBadge = (trend: string | null | undefined) => {
    const trendValue = trend || '未获取'
    
    let badgeClass = ''
    switch (trendValue) {
      case '景气上行':
        badgeClass = 'bg-green-100 text-green-800 border-green-200'
        break
      case '景气企稳':
        badgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-200'
        break
      case '景气下行':
        badgeClass = 'bg-red-100 text-red-800 border-red-200'
        break
      default:
        badgeClass = 'bg-gray-100 text-gray-600 border-gray-200'
    }

    return (
      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${badgeClass} mb-2`}>
        {trendValue}
      </span>
    )
  }

  // 文本折叠渲染函数
  const renderCollapsibleText = (text: string | null | undefined, isExpanded: boolean, trend?: string | null) => {
    if (!text) return (
      <div>
        {trend && renderTrendBadge(trend)}
        <div className="text-sm text-slate-500">暂无数据</div>
      </div>
    )

    const lines = text.split('\n')
    const isLongText = lines.length > 2 || text.length > 100

    if (!isExpanded && isLongText) {
      // 收起状态：显示前两行或前100个字符
      const collapsedText = lines.slice(0, 2).join('\n').slice(0, 100)
      return (
        <div>
          {trend && renderTrendBadge(trend)}
          <div className="text-sm text-slate-700 line-clamp-2">{collapsedText}</div>
        </div>
      )
    }

    // 展开状态：显示全部
    return (
      <div>
        {trend && renderTrendBadge(trend)}
        <div className="text-sm text-slate-700 whitespace-pre-wrap">{text}</div>
      </div>
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

  const handleEdit = (analysis: IndustryAnalysisWithIndustry) => {
    setEditingAnalysis(analysis)
    setShowEditModal(true)
  }

  const handleView = (analysis: IndustryAnalysisWithIndustry) => {
    const fileUrl = analysis.original_file || analysis.original_url
    if (fileUrl) {
      window.open(fileUrl, '_blank')
    } else {
      alert('没有可查看的原文件')
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
        renderCollapsibleText(value, expandedIds.has(row.id), row.trend_demand),
      width: '15%',
    },
    {
      title: '价格信号',
      dataIndex: 'signal_price',
      render: (value: any, row: IndustryAnalysisWithIndustry) =>
        renderCollapsibleText(value, expandedIds.has(row.id), row.trend_price),
      width: '15%',
    },
    {
      title: '供给信号',
      dataIndex: 'signal_supply',
      render: (value: any, row: IndustryAnalysisWithIndustry) =>
        renderCollapsibleText(value, expandedIds.has(row.id), row.trend_supply),
      width: '15%',
    },
    {
      title: '盈利信号',
      dataIndex: 'signal_profitability',
      render: (value: any, row: IndustryAnalysisWithIndustry) =>
        renderCollapsibleText(value, expandedIds.has(row.id), row.trend_profitability),
      width: '15%',
    },
    {
      title: '综合总结',
      dataIndex: 'summary',
      render: (value: any, row: IndustryAnalysisWithIndustry) =>
        renderCollapsibleText(value, expandedIds.has(row.id), row.trend_summary),
      width: '15%',
    },
    {
      title: '操作',
      dataIndex: 'action',
      render: (_: any, row: IndustryAnalysisWithIndustry) => (
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => handleEdit(row)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            编辑
          </button>
          <button
            onClick={() => handleView(row)}
            className="text-green-600 hover:text-green-800 text-sm"
          >
            查看
          </button>
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
      width: 120,
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
        <p className="text-slate-500">从需求、价格、供给、盈利、政策5个方面分析{industryDetail?.name}行业的行业景气度</p>
      </Panel>

      <IndustryAnalysisProsperityModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchAnalyses}
        industryId={industryId || undefined}
        relatedArticles={industryDetail?.relation__industry_articles.map((r) => r.summary__article) || []}
      />

      <IndustryAnalysisEditModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingAnalysis(null)
        }}
        onSuccess={fetchAnalyses}
        analysis={editingAnalysis}
      />
    </>
  )
}
