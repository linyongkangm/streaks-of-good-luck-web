'use client'

import { useState, useEffect } from 'react'
import type { info__stock_company } from '@/types'
import Table from '@/app/widget/Table'
import { formatNumber } from '@/app/tools'

interface Props {
  selectedCompany: info__stock_company
}

export default function SecuritiesMetadataFinancialView({ selectedCompany }: Props) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (selectedCompany) {
      setPage(1)
      fetchData()
    }
  }, [selectedCompany])

  useEffect(() => {
    if (selectedCompany) {
      fetchData()
    }
  }, [page])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/financial-statements/view?stock_code=${selectedCompany.company_code}&page=${page}&limit=20`
      )
      if (res.ok) {
        const result = await res.json()
        setData(result.data)
        setTotalPages(result.pagination.totalPages)
      }
    } catch (error) {
      console.error('获取财务报表视图数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPercent = (current: any, last: any) => {
    if (!current || !last || last === 0) return '-'
    const change = ((Number(current) - Number(last)) / Number(last)) * 100
    const isPositive = change > 0
    return (
      <span className={isPositive ? 'text-red-600' : change < 0 ? 'text-green-600' : 'text-slate-900'}>
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </span>
    )
  }

  const columns = [
    {
      title: '报告期',
      dataIndex: 'report_date',
      key: 'report_date',
      sticky: true,
      className: 'text-xs',
      render: (value: any) => (
        <span className="font-medium">{new Date(value).toLocaleDateString('zh-CN')}</span>
      )
    },
    {
      title: '归母权益',
      dataIndex: 'total_parent_equity',
      key: 'total_parent_equity',
      align: 'right' as const,
      className: 'text-xs',
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    },
    {
      title: '基本EPS(TTM)',
      dataIndex: 'basic_eps_ttm',
      key: 'basic_eps_ttm',
      align: 'right' as const,
      className: 'text-xs',
      render: (value: any) => <span className="font-mono">{formatNumber(value, 4)}</span>
    },
    {
      title: '稀释EPS(TTM)',
      dataIndex: 'diluted_eps_ttm',
      key: 'diluted_eps_ttm',
      align: 'right' as const,
      className: 'text-xs',
      render: (value: any) => <span className="font-mono">{formatNumber(value, 4)}</span>
    },
    {
      title: '加权平均股本',
      dataIndex: 'weighted_average_shares',
      key: 'weighted_average_shares',
      align: 'right' as const,
      className: 'text-xs',
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    },
    {
      title: '归母净利(TTM)',
      dataIndex: 'parent_netprofit_ttm',
      key: 'parent_netprofit_ttm',
      align: 'right' as const,
      className: 'text-xs',
      render: (value: any) => <span className="font-mono font-semibold">{formatNumber(value)}</span>
    },
    {
      title: '归母净利(去年)',
      dataIndex: 'parent_netprofit_last_year',
      key: 'parent_netprofit_last_year',
      align: 'right' as const,
      className: 'text-xs text-slate-600',
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    },
    {
      title: '同比',
      dataIndex: 'parent_netprofit_yoy',
      key: 'parent_netprofit_yoy',
      align: 'center' as const,
      className: 'text-xs',
      render: (_: any, record: any) => (
        <span className="font-mono font-semibold">
          {formatPercent(record.parent_netprofit_ttm, record.parent_netprofit_last_year)}
        </span>
      )
    },
    {
      title: '营收(TTM)',
      dataIndex: 'operate_income_ttm',
      key: 'operate_income_ttm',
      align: 'right' as const,
      className: 'text-xs',
      render: (value: any) => <span className="font-mono font-semibold">{formatNumber(value)}</span>
    },
    {
      title: '营收(去年)',
      dataIndex: 'operate_income_last_year',
      key: 'operate_income_last_year',
      align: 'right' as const,
      className: 'text-xs text-slate-600',
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    },
    {
      title: '同比',
      dataIndex: 'operate_income_yoy',
      key: 'operate_income_yoy',
      align: 'center' as const,
      className: 'text-xs',
      render: (_: any, record: any) => (
        <span className="font-mono font-semibold">
          {formatPercent(record.operate_income_ttm, record.operate_income_last_year)}
        </span>
      )
    },
    {
      title: '经营现金流(TTM)',
      dataIndex: 'netcash_operate_ttm',
      key: 'netcash_operate_ttm',
      align: 'right' as const,
      className: 'text-xs',
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    },
    {
      title: '经营现金流(去年)',
      dataIndex: 'netcash_operate_last_year',
      key: 'netcash_operate_last_year',
      align: 'right' as const,
      className: 'text-xs text-slate-600',
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    },
    {
      title: '同比',
      dataIndex: 'netcash_operate_yoy',
      key: 'netcash_operate_yoy',
      align: 'center' as const,
      className: 'text-xs',
      render: (_: any, record: any) => (
        <span className="font-mono">
          {formatPercent(record.netcash_operate_ttm, record.netcash_operate_last_year)}
        </span>
      )
    },
    {
      title: '投资现金流(TTM)',
      dataIndex: 'netcash_invest_ttm',
      key: 'netcash_invest_ttm',
      align: 'right' as const,
      className: 'text-xs',
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    },
    {
      title: '筹资现金流(TTM)',
      dataIndex: 'netcash_finance_ttm',
      key: 'netcash_finance_ttm',
      align: 'right' as const,
      className: 'text-xs',
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    }
  ]

  return (
    <div className="w-full">
      <h3 className="text-xl font-semibold mb-4 text-slate-800">📊 财务报表综合视图（滚动四季度）</h3>
      
      <Table 
        columns={columns} 
        dataSource={data} 
        loading={loading}
        emptyText="暂无综合财务数据"
      />

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border-2 border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all font-medium text-slate-900"
          >
            ← 上一页
          </button>
          <span className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium shadow-md">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border-2 border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all font-medium text-slate-900"
          >
            下一页 →
          </button>
        </div>
      )}
    </div>
  )
}