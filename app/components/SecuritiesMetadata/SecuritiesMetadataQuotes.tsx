'use client'

import { useState, useEffect } from 'react'
import type { info__stock_company, quote__stock_constituent_daily } from '@/types'
import { DateTime } from 'luxon'
import { formatNumber } from '@/app/tools'
import Table, { ColumnFormatType } from '@/app/widget/Table'
import Button from '@/app/widget/Button'
import Select from '@/app/widget/Select'
import DatePicker from '@/app/widget/DatePicker'
import Panel from '@/app/widget/Panel'
import { format } from 'path'

interface Props {
  selectedCompany: info__stock_company
}

export default function SecuritiesMetadataQuotes({ selectedCompany }: Props) {
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  })
  const [adjustType, setAdjustType] = useState<'none' | 'qfq' | 'hfq'>('qfq')

  useEffect(() => {
    if (selectedCompany) {
      setPage(1)
      fetchQuotes()
    }
  }, [selectedCompany, dateRange])

  useEffect(() => {
    if (selectedCompany) {
      fetchQuotes()
    }
  }, [page])

  const fetchQuotes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        company_id: selectedCompany.id.toString(),
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        page: page.toString(),
        limit: '50',
      })

      const res = await fetch(`/api/stock-quotes?${params}`)
      if (res.ok) {
        const data = await res.json()
        setQuotes(data.data)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error('获取行情数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayData = (quote: any) => {
    const prefix = adjustType
    return {
      open: quote[`${prefix}_open_price`],
      close: quote[`${prefix}_close_price`],
      high: quote[`${prefix}_high_price`],
      low: quote[`${prefix}_low_price`],
      turnover: quote[`${prefix}_turnover`],
      change_amt: quote[`${prefix}_change_amt`],
    }
  }

  const columns = [
    {
      title: '交易日期',
      dataIndex: 'trade_date',
      format: ColumnFormatType.DATE,
    },
    {
      title: '开盘',
      dataIndex: `${adjustType}_open_price`,
    },
    {
      title: '收盘',
      dataIndex: `${adjustType}_close_price`,
      render: (data: any, record: any) => {
        const isPositive = Number(record.change_percent) > 0
        const isNegative = Number(record.change_percent) < 0
        const colorClass = isPositive ? 'text-red-600' : isNegative ? 'text-green-600' : 'text-slate-900'
        return <span className={colorClass}>{formatNumber(data)}</span>
      },
    },
    {
      title: '最高',
      dataIndex: `${adjustType}_high_price`,
    },
    {
      title: '最低',
      dataIndex: `${adjustType}_low_price`,
    },
    {
      title: '成交量',
      dataIndex: 'volume',
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '成交额',
      dataIndex: `${adjustType}_turnover`,
      format: ColumnFormatType.NUMBER,
    },
    {
      title: '涨跌额',
      dataIndex: `${adjustType}_change_amt`,
      render: (data: any, record: any) => {
        const isPositive = Number(record.change_percent) > 0
        const isNegative = Number(record.change_percent) < 0
        const colorClass = isPositive ? 'text-red-600' : isNegative ? 'text-green-600' : 'text-slate-900'
        return <span className={colorClass}>{formatNumber(data)}</span>
      },
    },
    {
      title: '涨跌幅',
      dataIndex: 'change_percent',
      render: (value: any) => {
        const isPositive = Number(value) > 0
        const isNegative = Number(value) < 0
        const colorClass = isPositive ? 'text-red-600' : isNegative ? 'text-green-600' : 'text-slate-900'
        return <span className={colorClass}>{isPositive ? '+' : ''}{formatNumber(value)}%</span>
      },
    },
    {
      title: '振幅',
      dataIndex: 'price_range',
      render: (value: any) => `${value}%`,
    },
    {
      title: '换手率',
      dataIndex: 'turnover_rate',
      render: (value: any) => `${formatNumber(value, 3)}%`,
    },
  ]

  return (
    <Panel title={`📈 历史行情数据 - ${selectedCompany.company_name}`}>
      <div className="w-full">
        {/* 筛选栏 */}
        <div className="flex gap-4 mb-6 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">开始日期</label>
            <DatePicker
              mode="date"
              value={dateRange.start_date ? DateTime.fromISO(dateRange.start_date) : undefined}
              onChange={(value) => setDateRange({ ...dateRange, start_date: value.toFormat('yyyy-MM-dd') })}
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">结束日期</label>
            <DatePicker
              mode="date"
              value={dateRange.end_date ? DateTime.fromISO(dateRange.end_date) : undefined}
              onChange={(value) => setDateRange({ ...dateRange, end_date: value.toFormat('yyyy-MM-dd') })}
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">复权方式</label>
            <Select
              options={[
                { label: '不复权', value: 'none' },
                { label: '前复权', value: 'qfq' },
                { label: '后复权', value: 'hfq' },
              ]}
              value={adjustType}
              onChange={(value) => setAdjustType(value)}
            />
          </div>
          <Button
            onClick={fetchQuotes}
            size="small"
            className="mb-[1px]"
          >
            查询
          </Button>
        </div>

        {/* 行情数据表格 */}
        <Table
          columns={columns}
          dataSource={quotes}
          loading={loading}
          emptyText="暂无行情数据"
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
          <span className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-medium shadow-md">
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
      </div>
    </Panel>
  )
}