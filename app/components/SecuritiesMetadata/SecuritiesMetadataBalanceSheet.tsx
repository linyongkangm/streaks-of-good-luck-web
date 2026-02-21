'use client'

import { useState, useEffect } from 'react'
import type { info__stock_company } from '@/types'
import Table from '@/app/widget/Table'
import Panel from '@/app/widget/Panel'
import { formatNumber } from '@/app/tools'

interface Props {
  selectedCompany: info__stock_company
}

export default function SecuritiesMetadataBalanceSheet({ selectedCompany }: Props) {
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
        `/api/financial-statements?company_id=${selectedCompany.id}&sheet_type=balance`
      )
      if (res.ok) {
        const result = await res.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('获取资产负债表数据失败:', error)
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
      title: '归属母公司股东权益',
      dataIndex: 'total_parent_equity',
      key: 'total_parent_equity',
      align: 'right' as const,
      render: (value: any) => <span className="font-mono">{formatNumber(value)}</span>
    }
  ]

  return (
    <Panel>
    <div className="w-full">
      <h3 className="text-xl font-semibold mb-4 text-slate-800">资产负债表（按报告期）</h3>
      <Table 
        columns={columns} 
        dataSource={data} 
        loading={loading}
        emptyText="暂无资产负债表数据"
      />
    </div>
    </Panel>
  )
}
