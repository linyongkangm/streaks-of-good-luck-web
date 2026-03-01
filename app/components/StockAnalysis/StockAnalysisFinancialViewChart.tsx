'use client'

import { useEffect, useRef, useState } from 'react'
import { Chart } from '@antv/g2'
import { DateTime } from 'luxon'
import type { info__stock_company, view_financial_statements } from '@/types'
import Panel from '@/app/widget/Panel'
import Select from '@/app/widget/Select'
import Radio from '@/app/widget/Radio'
import { FormLabel } from '@/app/widget/Form'
import Loading from '@/app/widget/Loading'
import { formatNumber } from '@/app/tools'

interface Props {
  selectedCompany: info__stock_company
}

type DataType = 'ttm' | 'annual'

type FinancialViewField =
  Exclude<keyof view_financial_statements, 'total_shares' | 'company_id' | 'report_date' | 'total_operate_income_last_year' | 'operate_income_last_year' | 'total_operate_cost_last_year' | 'operate_cost_last_year' | 'netprofit_last_year' | 'parent_netprofit_last_year' | 'netcash_operate_last_year' | 'netcash_invest_last_year' | 'netcash_finance_last_year' | 'rate_change_effect_last_year' | 'free_cash_flow_last_year'>
  | 'cashflow_ratio_ttm' | 'gross_profit_margin_ttm' | 'net_profit_margin_ttm'

const fieldLabels: Record<FinancialViewField, string> = {
  // 现金流量比率 = 经营现金流(TTM) / 归母净利润(TTM)
  cashflow_ratio_ttm: '现金流量比率',
  // 毛利率 = (营业收入(TTM) - 营业成本(TTM)) / 营业收入(TTM)
  gross_profit_margin_ttm: '毛利率',
  // 净利率 = 净利润(TTM) / 营业收入(TTM)
  net_profit_margin_ttm: '净利率',

  total_parent_equity: '归母权益',
  total_operate_income_ttm: '营业总收入',
  operate_income_ttm: '营业收入',
  total_operate_cost_ttm: '营业总成本',
  operate_cost_ttm: '营业成本',
  netprofit_ttm: '净利润',
  parent_netprofit_ttm: '归母净利润',
  netcash_operate_ttm: '经营现金流',
  netcash_invest_ttm: '投资现金流',
  netcash_finance_ttm: '筹资现金流',
  rate_change_effect_ttm: '汇率变动影响',
  free_cash_flow_ttm: '自由现金流',
}

const fieldOrder: FinancialViewField[] = [
  'cashflow_ratio_ttm',
  'gross_profit_margin_ttm',
  'net_profit_margin_ttm',
  'free_cash_flow_ttm',
  'total_parent_equity',
  'total_operate_income_ttm',
  'operate_income_ttm',
  'total_operate_cost_ttm',
  'operate_cost_ttm',
  'netprofit_ttm',
  'parent_netprofit_ttm',
  'netcash_operate_ttm',
  'netcash_invest_ttm',
  'netcash_finance_ttm',
  'rate_change_effect_ttm',
]

const quickSelectFields: FinancialViewField[] = [
  'cashflow_ratio_ttm',
  'gross_profit_margin_ttm',
  'net_profit_margin_ttm',
  'free_cash_flow_ttm',
]

const otherFields: FinancialViewField[] = fieldOrder.filter((field) => !quickSelectFields.includes(field))

export default function StockAnalysisFinancialViewChart({ selectedCompany }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<Chart | null>(null)
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<view_financial_statements[]>([])
  const [field, setField] = useState<FinancialViewField>('parent_netprofit_ttm')
  const [dataType, setDataType] = useState<DataType>('ttm')
  const isPercentField = field === 'gross_profit_margin_ttm' || field === 'net_profit_margin_ttm' || field === 'cashflow_ratio_ttm'

  // 根据数据类型获取实际字段名
  const getFieldForDataType = (baseField: FinancialViewField, type: DataType): string => {
    if (type === 'ttm') return baseField
    // 年度数据使用每年第四季度的 TTM 字段
    if (type === 'annual') return baseField
    return baseField
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedCompany?.id) return

      setLoading(true)
      try {
        const limit = 200
        let page = 1
        let totalPages = 1
        const allRows: view_financial_statements[] = []

        while (page <= totalPages) {
          const res = await fetch(
            `/api/financial-statements/view?company_id=${selectedCompany.id}&page=${page}&limit=${limit}`
          )
          if (!res.ok) break

          const result = await res.json()
          allRows.push(...(result.data || []))
          totalPages = result.pagination?.totalPages || 1
          page += 1
        }

        setRecords(allRows)
      } catch (error) {
        console.error('获取财务报表综合视图折线图失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedCompany])

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy()
      chartInstance.current = null
    }

    if (!chartRef.current || records.length === 0) return

    const sortedRecords = [...records].sort((a, b) => {
      const aTime = new Date(a.report_date as any).getTime()
      const bTime = new Date(b.report_date as any).getTime()
      return aTime - bTime
    })

    const recordsForChart = (() => {
      if (dataType !== 'annual') return sortedRecords

      const recordsByYear = new Map<number, view_financial_statements[]>()

      for (const item of sortedRecords) {
        const date = new Date(item.report_date as any)
        const year = date.getFullYear()
        const yearRecords = recordsByYear.get(year) || []
        yearRecords.push(item)
        recordsByYear.set(year, yearRecords)
      }

      return Array.from(recordsByYear.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, yearRecords]) => {
          const q4Record = [...yearRecords]
            .sort((a, b) => new Date(a.report_date as any).getTime() - new Date(b.report_date as any).getTime())
            .findLast((record) => new Date(record.report_date as any).getMonth() + 1 === 12)

          if (q4Record) return q4Record

          return [...yearRecords].sort((a, b) => new Date(a.report_date as any).getTime() - new Date(b.report_date as any).getTime())[yearRecords.length - 1]
        })
    })()

    const chartData = recordsForChart
      .map((item, index) => {
        const metricField = getFieldForDataType(field, dataType)

        const metricValue = (() => {
          if (field === 'cashflow_ratio_ttm') {
            const netcashOperateField = getFieldForDataType('netcash_operate_ttm', dataType)
            const parentNetprofitField = getFieldForDataType('parent_netprofit_ttm', dataType)
            const netcashOperate = Number((item as any)[netcashOperateField] || 0)
            const parentNetprofit = Number((item as any)[parentNetprofitField] || 0)
            if (!Number.isFinite(netcashOperate) || !Number.isFinite(parentNetprofit) || parentNetprofit === 0) {
              return Number.NaN
            }
            return netcashOperate / parentNetprofit
          }

          if (field === 'gross_profit_margin_ttm') {
            const operateIncomeTtm = Number((item as any)[getFieldForDataType('operate_income_ttm', dataType)] || 0)
            const operateCostTtm = Number((item as any)[getFieldForDataType('operate_cost_ttm', dataType)] || 0)
            if (!Number.isFinite(operateIncomeTtm) || !Number.isFinite(operateCostTtm) || operateIncomeTtm === 0) {
              return Number.NaN
            }
            return (operateIncomeTtm - operateCostTtm) / operateIncomeTtm
          }

          if (field === 'net_profit_margin_ttm') {
            const operateIncomeTtm = Number((item as any)[getFieldForDataType('operate_income_ttm', dataType)] || 0)
            const netprofitTtm = Number((item as any)[getFieldForDataType('netprofit_ttm', dataType)] || 0)
            if (!Number.isFinite(operateIncomeTtm) || !Number.isFinite(netprofitTtm) || operateIncomeTtm === 0) {
              return Number.NaN
            }
            return netprofitTtm / operateIncomeTtm
          }

          return Number((item as any)[metricField])
        })()

        // 计算环比
        let sequentialRatio = Number.NaN
        if (index > 0) {
          const prevData = recordsForChart[index - 1]

          const prevValue = (() => {
            if (field === 'cashflow_ratio_ttm') {
              const netcashOperateField = getFieldForDataType('netcash_operate_ttm', dataType)
              const parentNetprofitField = getFieldForDataType('parent_netprofit_ttm', dataType)
              const prevNetcashOperate = Number((prevData as any)[netcashOperateField] || 0)
              const prevParentNetprofit = Number((prevData as any)[parentNetprofitField] || 0)
              if (!Number.isFinite(prevNetcashOperate) || !Number.isFinite(prevParentNetprofit) || prevParentNetprofit === 0) {
                return Number.NaN
              }
              return prevNetcashOperate / prevParentNetprofit
            }

            if (field === 'gross_profit_margin_ttm') {
              const prevOpIncome = Number((prevData as any)[getFieldForDataType('operate_income_ttm', dataType)] || 0)
              const prevOpCost = Number((prevData as any)[getFieldForDataType('operate_cost_ttm', dataType)] || 0)
              if (prevOpIncome === 0) return Number.NaN
              return (prevOpIncome - prevOpCost) / prevOpIncome
            }

            if (field === 'net_profit_margin_ttm') {
              const prevOpIncome = Number((prevData as any)[getFieldForDataType('operate_income_ttm', dataType)] || 0)
              const prevNetprofit = Number((prevData as any)[getFieldForDataType('netprofit_ttm', dataType)] || 0)
              if (prevOpIncome === 0) return Number.NaN
              return prevNetprofit / prevOpIncome
            }

            return Number((prevData as any)[metricField])
          })()

          if (Number.isFinite(metricValue) && Number.isFinite(prevValue) && prevValue !== 0) {
            sequentialRatio = (metricValue - prevValue) / Math.abs(prevValue)
          }
        }

        if (!Number.isFinite(metricValue)) return null

        return {
          report_date: new Date(item.report_date as any),
          value: metricValue,
          sequential_ratio: sequentialRatio,
        }
      })
      .filter(Boolean) as Array<{ report_date: Date; value: number; sequential_ratio: number }>

    if (chartData.length === 0) return

    const chart = new Chart({
      container: chartRef.current,
      autoFit: true,
      height: 380,
    })

    chart.options({
      type: 'view',
      data: chartData,
      encode: {
        x: 'report_date',
      },
      legend: false,
      axis: {
        x: {
          title: `${selectedCompany.company_name} - ${dataType === 'ttm' ? 'TTM' : '年度'}报告期`,
        },
      },
      children: [
        {
          type: 'line',
          encode: {
            y: 'value',
          },
          style: {
            lineWidth: 2,
            stroke: '#1f77b4',
          },
          scale: { y: { nice: true } },
          axis: {
            y: {
              title: fieldLabels[field],
              labelFormatter: (value: number) => {
                if (isPercentField) {
                  return `${(Number(value) * 100).toFixed(2)}%`
                }
                return formatNumber(value, 0)
              },
              position: 'left' as const,
            },
          },
          tooltip: [
            {
              name: '报告期',
              field: 'report_date',
              valueFormatter: (value) => DateTime.fromJSDate(new Date(value)).toFormat('yyyy-LL-dd'),
            },
            {
              name: fieldLabels[field],
              channel: 'y',
              valueFormatter: (value) =>
                isPercentField
                  ? `${(Number(value) * 100).toFixed(2)}%`
                  : formatNumber(Number(value)),
            },
          ],
        },
        {
          type: 'line',
          encode: {
            y: 'sequential_ratio',
            color: () => '#ff7f0e', // 橙色作为环比线
          },
          style: {
            lineWidth: 2,
            stroke: '#ff7f0e',
            strokeDasharray: [5, 5], // 虚线表示环比
          },
          scale: { y: { independent: true, nice: true } },
          axis: {
            y: {
              title: `环比%`,
              labelFormatter: (value: number) => `${(Number(value) * 100).toFixed(2)}%`,
              position: 'right' as const,
            },
          },
          tooltip: [
            {
              name: '报告期',
              field: 'report_date',
              valueFormatter: (value) => DateTime.fromJSDate(new Date(value)).toFormat('yyyy-LL-dd'),
            },
            {
              name: '环比',
              channel: 'y',
              valueFormatter: (value) => {
                const v = Number(value)
                return Number.isFinite(v) ? `${(v * 100).toFixed(2)}%` : '-'
              },
            },
          ],

        },
        {
          type: 'point',
          encode: {
            y: 'value',
          },
          tooltip: false,
          style: {
            fill: '#1f77b4',
          },
        },
      ],
    })

    chart.render()
    chartInstance.current = chart

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
        chartInstance.current = null
      }
    }
  }, [records, field, dataType, selectedCompany, isPercentField])

  return (
    <Panel>
      <div className="flex gap-4 items-end flex-wrap">
        <FormLabel label="数据类型">
          <Radio
            options={[
              { value: 'ttm', label: 'TTM' },
              { value: 'annual', label: '年度' },
            ] as const}
            value={dataType}
            onChange={(v) => setDataType(v as DataType)}
          />
        </FormLabel>
        <FormLabel label="常用指标">
          <Radio
            options={quickSelectFields.map((value) => ({
              value,
              label: fieldLabels[value],
            }))}
            value={field}
            onChange={setField}
          />
        </FormLabel>
        <FormLabel label="其他指标">
          <Select
            options={otherFields.map((value) => ({
              value,
              label: fieldLabels[value],
            }))}
            value={field}
            onChange={setField}
          />
        </FormLabel>
      </div>

      {loading ? (
        <Loading />
      ) : records.length === 0 ? (
        <div className="text-center py-10 text-slate-500">暂无可绘制数据</div>
      ) : (
        <div ref={chartRef} className="w-full" />
      )}
    </Panel>
  )
}
