'use client'

import { useState, useEffect } from 'react'
import type { info__stock_company, quote__balance_sheet } from '@/types'
import Table, { Column, ColumnFormatType } from '@/app/widget/Table'
import Panel from '@/app/widget/Panel'

interface Props {
  selectedCompany: info__stock_company
}

export default function SecuritiesMetadataBalanceSheet({ selectedCompany }: Props) {
  const [data, setData] = useState<quote__balance_sheet[]>([])
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

  const columns: Column<quote__balance_sheet>[] = [
    {
      title: '报告期',
      dataIndex: 'report_date',
      format: ColumnFormatType.DATE,
    },
    {
      title: '归属母公司股东权益',
      dataIndex: 'total_parent_equity',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '总资产',
      dataIndex: 'total_assets',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '流动资产合计',
      dataIndex: 'total_current_assets',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '非流动资产合计',
      dataIndex: 'total_noncurrent_assets',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '流动负债合计',
      dataIndex: 'total_current_liab',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '非流动负债合计',
      dataIndex: 'total_noncurrent_liab',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '负债合计',
      dataIndex: 'total_liabilities',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '合同负债',
      dataIndex: 'contract_liab',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '应付票据及应付账款',
      dataIndex: 'note_accounts_payable',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '预付款项',
      dataIndex: 'prepayment',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '应收票据及应收账款',
      dataIndex: 'note_accounts_rece',
      format: ColumnFormatType.NUMBER,
    }
  ]

  return (
    <Panel title={`资产负债表(按报告期) - ${selectedCompany.company_name}`}>
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        emptyText="暂无资产负债表数据"
      />
    </Panel>
  )
}
