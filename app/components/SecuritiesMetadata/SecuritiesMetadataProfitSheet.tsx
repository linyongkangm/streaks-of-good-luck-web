'use client'

import { useState, useEffect } from 'react'
import type { info__stock_company, quote__profit_sheet } from '@/types'
import Table, { Column, ColumnFormatType } from '@/app/widget/Table'
import Panel from '@/app/widget/Panel'
import { formatNumber } from '@/app/tools'

interface Props {
  selectedCompany: info__stock_company
}

interface ProfitSheetWithYoY extends quote__profit_sheet {
  operate_income_yoy?: number | null // 同比增长率（百分比）
  total_operate_income_yoy?: number | null
  netprofit_yoy?: number | null
  parent_netprofit_yoy?: number | null
}

// 计算同比增长率
function calculateYoYGrowth(currentValue: any, priorYearValue: any): number | null {
  const curr = Number(currentValue)
  const prior = Number(priorYearValue)
  
  if (!prior || prior === 0) return null
  return ((curr - prior) / Math.abs(prior)) * 100
}

// 获取报告期的年份和季度
function getYearAndQuarter(date: Date | string): { year: number; quarter: number } {
  const d = new Date(date instanceof Date ? date : new Date(date))
  const month = d.getMonth() + 1
  const quarter = Math.ceil(month / 3)
  return { year: d.getFullYear(), quarter }
}

// 为数据添加同比数据
function enrichDataWithYoY(data: quote__profit_sheet[]): ProfitSheetWithYoY[] {
  // 创建年份和季度的索引
  const dataByYearQuarter: Map<string, quote__profit_sheet> = new Map()
  
  data.forEach(item => {
    const { year, quarter } = getYearAndQuarter(item.report_date)
    dataByYearQuarter.set(`${year}Q${quarter}`, item)
  })
  
  return data.map(item => {
    const { year, quarter } = getYearAndQuarter(item.report_date)
    const priorYearKey = `${year - 1}Q${quarter}`
    const priorYearData = dataByYearQuarter.get(priorYearKey)
    
    return {
      ...item,
      operate_income_yoy: priorYearData ? calculateYoYGrowth(item.operate_income, priorYearData.operate_income) : null,
      total_operate_income_yoy: priorYearData ? calculateYoYGrowth(item.total_operate_income, priorYearData.total_operate_income) : null,
      netprofit_yoy: priorYearData ? calculateYoYGrowth(item.netprofit, priorYearData.netprofit) : null,
      parent_netprofit_yoy: priorYearData ? calculateYoYGrowth(item.parent_netprofit, priorYearData.parent_netprofit) : null,
    }
  })
}

export default function SecuritiesMetadataProfitSheet({ selectedCompany }: Props) {
  const [data, setData] = useState<ProfitSheetWithYoY[]>([])
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
        const enrichedData = enrichDataWithYoY(result.data || [])
        setData(enrichedData)
      }
    } catch (error) {
      console.error('获取利润表数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns: Column<ProfitSheetWithYoY>[] = [
    {
      title: '报告期',
      dataIndex: 'report_date',
      format: ColumnFormatType.DATE,
    },
    {
      title: '营业总收入',
      dataIndex: 'total_operate_income',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '营业总收入同比',
      dataIndex: 'total_operate_income_yoy',
      render: (value) => {
        if (value === null || value === undefined) return '-'
        const color = value >= 0 ? 'text-red-600' : 'text-green-600'
        return <span className={color}>{value.toFixed(2)}%</span>
      }
    },
    {
      title: '营业收入',
      dataIndex: 'operate_income',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '营业收入同比',
      dataIndex: 'operate_income_yoy',
      render: (value) => {
        if (value === null || value === undefined) return '-'
        const color = value >= 0 ? 'text-red-600' : 'text-green-600'
        return <span className={color}>{value.toFixed(2)}%</span>
      }
    },
    {
      title: '营业总成本',
      dataIndex: 'total_operate_cost',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '营业成本',
      dataIndex: 'operate_cost',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '净利润',
      dataIndex: 'netprofit',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '净利润同比',
      dataIndex: 'netprofit_yoy',
      render: (value) => {
        if (value === null || value === undefined) return '-'
        const color = value >= 0 ? 'text-red-600' : 'text-green-600'
        return <span className={color}>{value.toFixed(2)}%</span>
      }
    },
    {
      title: '归属母公司净利润',
      dataIndex: 'parent_netprofit',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '归属母公司净利润同比',
      dataIndex: 'parent_netprofit_yoy',
      render: (value) => {
        if (value === null || value === undefined) return '-'
        const color = value >= 0 ? 'text-red-600' : 'text-green-600'
        return <span className={color}>{value.toFixed(2)}%</span>
      }
    }
  ]

  return (
    <Panel title={`📊 利润表（按单季度） - ${selectedCompany.company_name}`} >
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        emptyText="暂无利润表数据"
      />
    </Panel>
  )
}
