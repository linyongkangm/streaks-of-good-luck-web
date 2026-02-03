'use client'

import { useState, useEffect } from 'react'
import type { info__stock_company } from '@/types'
import Table from '@/app/widget/Table'
import { formatNumber } from '@/app/tools'

interface Props {
  selectedCompany: info__stock_company
}

export default function SecuritiesMetadataProfitSheet({ selectedCompany }: Props) {
  const [data, setData] = useState<any[]>([])
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

  const columns = [
    {
      title: '报告期',
      dataIndex: 'report_date',
      key: 'report_date',
      render: (value: any) => (
        <span className="font-medium">{new Date(value).toLocaleDateString('zh-CN')}</span>
      )
    },
    {
      title: '基本每股收益',
      dataIndex: 'basic_eps',
      key: 'basic_eps',
      align: 'right' as const,
      render: (value: any) => <span className="font-mono">{formatNumber(value, 4)}</span>
    },
    {
      title: '稀释每股收益',
      dataIndex: 'diluted_eps',
      key: 'diluted_eps',
      align: 'right' as const,
      render: (value: any) => <span className="font-mono">{formatNumber(value, 4)}</span>
    },
    {
      title: '营业总收入',
      dataIndex: 'operate_income',
      key: 'operate_income',
      align: 'right' as const,
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    },
    {
      title: '归属母公司净利润',
      dataIndex: 'parent_netprofit',
      key: 'parent_netprofit',
      align: 'right' as const,
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    }
  ]

  return (
    <div className="w-full">
      <h3 className="text-xl font-semibold mb-4 text-slate-800">利润表（按单季度）</h3>
      <Table 
        columns={columns} 
        dataSource={data} 
        loading={loading}
        emptyText="暂无利润表数据"
      />
    </div>
  )
}
