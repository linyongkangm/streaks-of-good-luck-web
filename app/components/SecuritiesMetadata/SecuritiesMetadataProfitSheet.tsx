'use client'

import { useState, useEffect } from 'react'
import type { info__stock_company, quote__profit_sheet } from '@/types'
import Table, { Column } from '@/app/widget/Table'
import Panel from '@/app/widget/Panel'
import { formatNumber } from '@/app/tools'

interface Props {
  selectedCompany: info__stock_company
}

export default function SecuritiesMetadataProfitSheet({ selectedCompany }: Props) {
  const [data, setData] = useState<quote__profit_sheet[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedCompany) {
      fetchData()
    }
  }, [selectedCompany])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/financial-statements?company_id=${selectedCompany.id}&sheet_type=profit`
      )
      if (res.ok) {
        const result = await res.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('获取利润表数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns: Column<quote__profit_sheet>[] = [
    {
      title: '报告期',
      dataIndex: 'report_date',
      render: (value: any) => (
        <span className="font-medium">{new Date(value).toLocaleDateString('zh-CN')}</span>
      )
    },
    {
      title: '营业总收入',
      dataIndex: 'total_operate_income',
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    },
    {
      title: '营业收入',
      dataIndex: 'operate_income',
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    },
    {
      title: '营业总成本',
      dataIndex: 'total_operate_cost',
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    },
    {
      title: '营业成本',
      dataIndex: 'operate_cost',
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    },
    {
      title: '净利润',
      dataIndex: 'netprofit',
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    },
    {
      title: '归属母公司净利润',
      dataIndex: 'parent_netprofit',
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    }
  ]

  return (
    <Panel title="利润表（按单季度）">
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        emptyText="暂无利润表数据"
      />
    </Panel>
  )
}
