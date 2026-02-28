'use client'

import { useState, useEffect } from 'react'
import type { info__stock_company } from '@/types'
import Table, { Column, ColumnFormatType } from '@/app/widget/Table'
import Panel from '@/app/widget/Panel'
import { formatNumber } from '@/app/tools'

interface Props {
  selectedCompany: info__stock_company
}

export default function SecuritiesMetadataCashFlowSheet({ selectedCompany }: Props) {
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
        `/api/financial-statements?company_id=${selectedCompany.id}&sheet_type=cash_flow`
      )
      if (res.ok) {
        const result = await res.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('获取现金流量表数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns: Column<any>[] = [
    {
      title: '报告期',
      dataIndex: 'report_date',
      format: ColumnFormatType.DATE,
    },
    {
      title: '经营活动现金流净额',
      dataIndex: 'netcash_operate',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '投资活动现金流净额',
      dataIndex: 'netcash_invest',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '筹资活动现金流净额',
      dataIndex: 'netcash_finance',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '汇率变动对现金的影响',
      dataIndex: 'rate_change_effect',
      format: ColumnFormatType.NUMBER,
    }
  ]

  return (
    <Panel title={`📊 现金流量表（按单季度） - ${selectedCompany.company_name}`} >
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        emptyText="暂无现金流量表数据"
      />
    </Panel>
  )
}
