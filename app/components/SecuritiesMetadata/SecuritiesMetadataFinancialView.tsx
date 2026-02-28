'use client'

import { useState, useEffect } from 'react'
import type { info__stock_company, view_financial_statements } from '@/types'
import Table, { Column } from '@/app/widget/Table'
import Button from '@/app/widget/Button'
import Panel from '@/app/widget/Panel'
import { formatNumber, formatPercent } from '@/app/tools'

interface Props {
  selectedCompany: info__stock_company
}


function getTTMvsLYColumn(dataIndex: string, title: string): Column<view_financial_statements> {
  return {
    title: `${title}(TTM/LY/VS)`,
    dataIndex: dataIndex,
    render: (_, record) => {
      const ttm = record[dataIndex + '_ttm' as keyof typeof record] as number
      const lastYear = record[dataIndex + '_last_year' as keyof typeof record] as number
      return (
        <div className="flex flex-col items-center">
          <span>
            {formatNumber(ttm)}
          </span>
          <span>
            {formatNumber(lastYear)}
          </span>
          <span>
            {formatPercent(ttm, lastYear)}
          </span>
        </div>

      )
    },
  }
}

export default function SecuritiesMetadataFinancialView({ selectedCompany }: Props) {
  const [data, setData] = useState<view_financial_statements[]>([])
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
        `/api/financial-statements/view?company_id=${selectedCompany.id}&page=${page}&limit=20`
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



  const columns: Column<view_financial_statements>[] = [
    {
      title: '报告期',
      dataIndex: 'report_date',
      render: (value: any) => (
        <span className="font-medium">{new Date(value).toLocaleDateString('zh-CN')}</span>
      )
    },
    {
      title: '归母权益',
      dataIndex: 'total_parent_equity',
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    },
    getTTMvsLYColumn('total_operate_income', '营业总收入'),
    getTTMvsLYColumn('operate_income', '营业收入'),
    getTTMvsLYColumn('total_operate_cost', '营业总成本'),
    getTTMvsLYColumn('operate_cost', '营业成本'),
    getTTMvsLYColumn('netprofit', '净利润'),
    getTTMvsLYColumn('parent_netprofit', '归母净利润'),
    getTTMvsLYColumn('netcash_operate', '经营现金流'),
    {
      title: '投资现金流(TTM)',
      dataIndex: 'netcash_invest_ttm',
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    },
    {
      title: '筹资现金流(TTM)',
      dataIndex: 'netcash_finance_ttm',
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    }
  ]
  return (
    <Panel title="📊 财务报表综合视图（滚动四季度）">
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        emptyText="暂无综合财务数据"
      />
      <div className="flex items-center justify-center gap-2 mt-6">
        <Button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          look="cancel"
          size="small"
        >
          ← 上一页
        </Button>
        <span className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium shadow-md">
          {page} / {totalPages}
        </span>
        <Button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          look="cancel"
          size="small"
        >
          下一页 →
        </Button>
      </div>
    </Panel>
  )
}