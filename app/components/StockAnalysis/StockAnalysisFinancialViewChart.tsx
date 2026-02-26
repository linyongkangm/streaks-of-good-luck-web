'use client'

import { useEffect, useRef, useState } from 'react'
import { Chart } from '@antv/g2'
import { DateTime } from 'luxon'
import type { info__stock_company } from '@/types'
import Panel from '@/app/widget/Panel'
import Select from '@/app/widget/Select'
import { FormLabel } from '@/app/widget/Form'
import Loading from '@/app/widget/Loading'
import { formatNumber } from '@/app/tools'

interface Props {
  selectedCompany: info__stock_company
}

type FinancialViewField =
  | 'total_parent_equity'
  | 'cashflow_ratio_ttm'
  | 'parent_netprofit_ttm'
  | 'parent_netprofit_last_year'
  | 'operate_income_ttm'
  | 'operate_income_last_year'
  | 'netcash_operate_ttm'
  | 'netcash_operate_last_year'
  | 'netcash_invest_ttm'
  | 'netcash_invest_last_year'
  | 'netcash_finance_ttm'
  | 'netcash_finance_last_year'
  | 'rate_change_effect_ttm'
  | 'rate_change_effect_last_year'

const fieldLabels: Record<FinancialViewField, string> = {
  total_parent_equity: '归母权益',
  cashflow_ratio_ttm: '现金流量比率',
  parent_netprofit_ttm: '归母净利(TTM)',
  parent_netprofit_last_year: '归母净利(去年)',
  operate_income_ttm: '营收(TTM)',
  operate_income_last_year: '营收(去年)',
  netcash_operate_ttm: '经营现金流(TTM)',
  netcash_operate_last_year: '经营现金流(去年)',
  netcash_invest_ttm: '投资现金流(TTM)',
  netcash_invest_last_year: '投资现金流(去年)',
  netcash_finance_ttm: '筹资现金流(TTM)',
  netcash_finance_last_year: '筹资现金流(去年)',
  rate_change_effect_ttm: '汇率变动影响(TTM)',
  rate_change_effect_last_year: '汇率变动影响(去年)',
}

export default function StockAnalysisFinancialViewChart({ selectedCompany }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<Chart | null>(null)
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<any[]>([])
  const [field, setField] = useState<FinancialViewField>('parent_netprofit_ttm')

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedCompany?.id) return

      setLoading(true)
      try {
        const limit = 200
        let page = 1
        let totalPages = 1
        const allRows: any[] = []

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

    const chartData = [...records]
      .reverse()
      .map((item) => {
        const metricValue =
          field === 'cashflow_ratio_ttm'
            ? (() => {
                const netcashOperateTtm = Number(item.netcash_operate_ttm)
                const parentNetprofitTtm = Number(item.parent_netprofit_ttm)
                if (!Number.isFinite(netcashOperateTtm) || !Number.isFinite(parentNetprofitTtm) || parentNetprofitTtm === 0) {
                  return Number.NaN
                }
                return netcashOperateTtm / parentNetprofitTtm
              })()
            : Number(item[field])

        if (!Number.isFinite(metricValue)) return null

        return {
          report_date: new Date(item.report_date),
          value: metricValue,
        }
      })
      .filter(Boolean) as Array<{ report_date: Date; value: number }>

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
      axis: {
        x: {
          title: `${selectedCompany.company_name} - 报告期`,
        },
        y: {
          title: fieldLabels[field],
          labelFormatter: (value: number) => {
            if (field === 'cashflow_ratio_ttm') {
              return Number(value).toFixed(2)
            }
            return formatNumber(value, 0)
          }
        },
      },
      scale: {
        y: {
          nice: true,
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
                field === 'cashflow_ratio_ttm'
                  ? Number(value).toFixed(2)
                  : formatNumber(Number(value)),
            },
          ],
        },
        {
          type: 'point',
          encode: {
            y: 'value',
          },
          tooltip: false,
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
  }, [records, field, selectedCompany])

  return (
    <Panel>
      <FormLabel>
        <Select
          options={Object.entries(fieldLabels).map(([value, label]) => ({
            value: value as FinancialViewField,
            label,
          }))}
          value={field}
          onChange={setField}
        />
      </FormLabel>

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
