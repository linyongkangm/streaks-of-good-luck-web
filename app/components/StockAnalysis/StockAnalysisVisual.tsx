'use client'

import { useState, useEffect, useRef } from 'react'
import { Chart } from '@antv/g2'
import type { info__stock_company } from '@/types'
import * as tools from '@/app/tools'
import Select from '@/app/widget/Select'
import { DateTime } from 'luxon'
import { FormLabel } from '@/app/widget/Form'
import Loading from '@/app/widget/Loading'
import Panel from '@/app/widget/Panel'
import Radio from '@/app/widget/Radio'

interface FinancialMetrics {
  pe: number[];
  pb: number[];
  ps: number[];
  pc: number[];
}

interface QuantileData {
  none: FinancialMetrics;
  qfq: FinancialMetrics;
  hfq: FinancialMetrics;
}
interface Props {
  selectedCompany: info__stock_company
}

type AdjustType = 'none' | 'qfq' | 'hfq'
type ValuationMetric = 'pe' | 'pb' | 'ps' | 'pc'
type TimeRange = '1' | '3' | '5' | '10'

const adjustTypeLabels = {
  none: '不复权',
  qfq: '前复权',
  hfq: '后复权',
}

const metricLabels = {
  pe: 'PE (市盈率)',
  pb: 'PB (市净率)',
  ps: 'PS (市销率)',
  pc: 'PC (市现率)',
}

const timeRangeLabels = {
  '1': '一年',
  '3': '三年',
  '5': '五年',
  '10': '十年',
}

const Quantiles = [10, 30, 50, 70, 90];
const GrayGradient = tools.genColorGradient(Quantiles.length, '#6e8a8d', '#2b677f');
const YellowGradient = tools.genColorGradient(Quantiles.length, '#8f773a', '#d71a1a');


export default function StockAnalysisVisual({ selectedCompany }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<Chart | null>(null)
  const [loading, setLoading] = useState(false)
  const [adjustType, setAdjustType] = useState<AdjustType>('qfq')
  const [metric, setMetric] = useState<ValuationMetric>('pe')
  const [timeRange, setTimeRange] = useState<TimeRange>('3')
  const [data, setData] = useState<{ results: any[]; quantileData: any } | null>(null)
  const [dateRange, setDateRange] = useState({
    start_date: DateTime.now().minus({ years: 3 }),
    end_date: DateTime.now(),
  })
  const [predictData, setPredictData] = useState<any[]>([])

  useEffect(() => {
    const years = parseInt(timeRange)
    setDateRange({
      start_date: DateTime.now().minus({ years }),
      end_date: DateTime.now(),
    })
  }, [timeRange])

  const fetchData = async () => {
    if (!selectedCompany?.id) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        start_date: dateRange.start_date.toISODate() || '',
        end_date: dateRange.end_date.toISODate() || '',
      })

      const res = await fetch(`/api/stock-companies/${selectedCompany.id}/valuation?${params}`)
      if (res.ok) {
        const result = await res.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('获取估值数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPredictData = async () => {
    if (!selectedCompany?.id) return

    try {
      const params = new URLSearchParams()

      params.append('company_id', selectedCompany.id.toString())
      params.append('filter_by_date', 'true')

      const res = await fetch(`/api/stock-predictions?${params}`)
      if (res.ok) {
        const result = await res.json()
        setPredictData(result.data || [])
      }
    } catch (error) {
      console.error('获取预测数据失败:', error)
    }
  }

  useEffect(() => {
    if (selectedCompany) {
      fetchData()
      fetchPredictData()
    }
  }, [selectedCompany, dateRange])

  useEffect(() => {
    if (!chartRef.current || !data) return

    const chartData = data.results || []

    if (chartData.length === 0) return

    const q4PredictByYear = new Map<number, any>()
    predictData.forEach((item) => {
      const reportDate = DateTime.fromISO(item.report_date)
      if (!reportDate.isValid || reportDate.quarter !== 4) return
      q4PredictByYear.set(reportDate.year, item)
    })

    const chartDatasource: any[] = []
    chartData.forEach((item) => {
      const valuation = item[`${adjustType}_valuation`]?.[metric]
      if (!valuation) return
      const closePrice = item[`${adjustType}_close_price`]
      const totalShares = Number(item.total_shares)
      const marketValue = Number(closePrice) * totalShares
      const predictDividendYieldTexts = new Map<string, string>()
      q4PredictByYear.forEach((predict, year) => {
        if (
          predict &&
          Number.isFinite(Number(predict.parent_netprofit)) &&
          Number.isFinite(Number(predict.dividend_payout_ratio))) {
          const dividendYield = ((Number(predict.parent_netprofit) * (Number(predict.dividend_payout_ratio) / 100)) / marketValue) * 100
          predictDividendYieldTexts.set(`predictDividendYieldText${year}Q4`, `${dividendYield.toFixed(2)}%`)
        } else {
          predictDividendYieldTexts.set(`predictDividendYieldText${year}Q4`, '--')
        }
      })
      const dataPoint: any = {
        trade_date: new Date(item.trade_date),
        valuation: parseFloat(valuation.toFixed(2)),
        total_market_value: Number.isFinite(marketValue) ? marketValue : undefined,
        ...Object.fromEntries(predictDividendYieldTexts),
      }
      if (item.company_id) {
        dataPoint.company_name = item.company_name
        dataPoint.company_code = item.company_code
        dataPoint.company_id = item.company_id
      }
      dataPoint.closePrice = parseFloat(closePrice.toFixed(2))
      const quantile_price = item.quantile_prices?.[adjustType]?.[metric] || {}
      Object.keys(quantile_price).forEach((key) => {
        if (quantile_price[key] !== null) {
          dataPoint[`quantile_price_${key}`] = parseFloat(quantile_price[key].toFixed(2))
        }
      })
      chartDatasource.push(dataPoint)
    })

    const quantileData: QuantileData = data.quantileData || {}

    const fieldMap: Record<ValuationMetric, string> = {
      pe: 'parent_netprofit',
      pb: 'total_parent_equity',
      ps: 'operate_income',
      pc: 'netcash_operate',
    }
    predictData.forEach((item, index, array) => {
      const fieldName = fieldMap[metric]
      const metricValue = item[fieldName]

      if (!metricValue) return
      const trade_date = new Date(item.report_date)
      const dataPoint: any = {
        trade_date: trade_date,
      }
      const totalShare = chartData[chartData.length - 1].total_shares
      Quantiles.forEach((q, index) => {
        const quantile = quantileData[adjustType]?.[metric]?.[index]
        dataPoint[`predict_quantile_price_p${q}`] = parseFloat(((metricValue / totalShare) * quantile).toFixed(2))
      });

      if (index === 0 && dataPoint.trade_date > chartDatasource[chartDatasource.length - 1].trade_date) {
        const lastChartDataPoint = chartDatasource[chartDatasource.length - 1]
        const lastTradeDate = new Date(lastChartDataPoint.trade_date)
        lastTradeDate.setDate(lastTradeDate.getDate() - 30)
        chartDatasource.push({
          ...dataPoint,
          trade_date: lastTradeDate,
        })
      }
      chartDatasource.push(dataPoint)

      const nextPredictData = array[index + 1]
      const endTradeDate = nextPredictData ? new Date(nextPredictData.report_date) : new Date(item.report_date)
      if (nextPredictData) {
        endTradeDate.setDate(endTradeDate.getDate() - 1)
      } else {
        endTradeDate.setDate(endTradeDate.getDate() + 3 * 30)
      }
      chartDatasource.push({
        ...dataPoint,
        trade_date: endTradeDate,
      })
    });

    if (chartInstance.current) {
      chartInstance.current.destroy()
    }
    const chart = new Chart({
      container: chartRef.current,
      autoFit: true,
      height: 500,
    })
    chart.options({
      type: 'view',
      data: chartDatasource,
      encode: {
        x: 'trade_date',
      },
      axis: {
        x: {
          title: selectedCompany.company_name + ' - 交易日期',
        },
      },
      scale: {
        y: {
          nice: true,
        },
      },
      interaction: {
        tooltip: {
          filter: (d) => {
            return d.value !== 'undefined'
          },
        }
      },
      children: [
        {
          type: 'line',
          encode: {
            y: 'closePrice',
          },
          axis: {
            y: {
              title: `收盘价(${adjustTypeLabels[adjustType]})`,
            },
          },
          style: {
            lineWidth: 2,
          },
          tooltip: [
            {
              name: `收盘价(${adjustTypeLabels[adjustType]})`,
              channel: 'y',
            },
            {
              name: metricLabels[metric],
              field: 'valuation',
            },
            {
              name: '总市值',
              field: 'total_market_value',
              valueFormatter: (value) => {
                if (value === undefined || value === null || Number.isNaN(Number(value))) {
                  return undefined
                }
                return tools.formatNumber(Number(value))
              },
            },
            ...q4PredictByYear.size > 0 ? Array.from(q4PredictByYear.keys()).map(year => {
              return {
                name: `${year}股息率`,
                field: `predictDividendYieldText${year}Q4`,
              }
            }) : []

          ],
        },
        ...Quantiles.map((q, index) => {
          return {
            type: 'line',
            encode: {
              y: `quantile_price_p${q}`,
            },
            style: {
              lineWidth: 1,
              stroke: GrayGradient[index],
            },
            tooltip: {
              name: `${q}分位(${quantileData[adjustType]?.[metric]?.[index] ? `${quantileData[adjustType][metric][index].toFixed(2)}` : ''})`,
              channel: 'y',
            }
          }
        }),
        ...(chartDatasource[chartDatasource.length - 1]?.predict_quantile_price_p10 ? Quantiles.map((q, index) => {
          return [{
            type: 'line',
            encode: {
              y: `predict_quantile_price_p${q}`,
            },
            style: {
              lineWidth: 1,
              stroke: YellowGradient[index],
            },
            tooltip: {
              name: `${q}分位(${quantileData[adjustType]?.[metric]?.[index] ? `${quantileData[adjustType][metric][index].toFixed(2)}` : ''})`,
              channel: 'y',
            },
          }, {
            type: 'point',
            encode: {
              y: `predict_quantile_price_p${q}`,
            },
            tooltip: false,
            style: {
              fill: YellowGradient[index],
              stroke: YellowGradient[index],
            },
          }]
        }).flat() : []),
      ],
    })
    chart.render()
    chartInstance.current = chart

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data, adjustType, metric, predictData, selectedCompany])

  return (
    <Panel>
      <div className="flex gap-4 mb-6 items-end flex-wrap">
        <FormLabel label="时间范围">
          <Radio
            options={Object.entries(timeRangeLabels).map(([value, label]) => ({
              value: value as TimeRange,
              label
            }))}
            value={timeRange}
            onChange={setTimeRange}
          />
        </FormLabel>
        <FormLabel className='flex-1' label="复权方式">
          <Select
            options={Object.entries(adjustTypeLabels).map(([value, label]) => ({
              value: value as AdjustType,
              label
            }))}
            value={adjustType}
            onChange={setAdjustType}
          />
        </FormLabel>
        <FormLabel className='flex-1' label="估值指标">
          <Select
            options={Object.entries(metricLabels).map(([value, label]) => ({
              value: value as ValuationMetric,
              label
            }))}
            value={metric}
            onChange={setMetric}
          />
        </FormLabel>
      </div>

      {loading ? (
        <Loading />
      ) : !data || data.results.length === 0 ? (
        <div className="text-center py-12 text-slate-500">暂无数据</div>
      ) : (
        <div ref={chartRef} className="w-full"></div>
      )}
    </Panel>
  )
}
