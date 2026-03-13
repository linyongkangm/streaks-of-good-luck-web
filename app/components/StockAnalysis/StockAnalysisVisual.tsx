'use client'

import { useState, useEffect, useRef } from 'react'
import { Chart } from '@antv/g2'
import type { info__stock_company, info__milestone, StockValuationResponse, ValuationNumbers, QuantilePriceSet, StockPredictionItem } from '@/types'
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
type TimeRange = '1' | '3' | '5' | '10' | 'all'

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
  'all': '全部',
}

const ValuationFieldMap: Record<ValuationMetric, 'parent_netprofit' | 'total_parent_equity' | 'operate_income' | 'netcash_operate'> = {
  pe: 'parent_netprofit',
  pb: 'total_parent_equity',
  ps: 'operate_income',
  pc: 'netcash_operate',
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
  const [dateRange, setDateRange] = useState({
    start_date: DateTime.now().minus({ years: 3 }),
    end_date: DateTime.now(),
  })
  const [data, setData] = useState<StockValuationResponse['data'] | null>(null)
  const [predictData, setPredictData] = useState<StockPredictionItem[] | null>(null)
  const [milestones, setMilestones] = useState<info__milestone[] | null>(null)

  useEffect(() => {
    if (timeRange === 'all') {
      // 使用企业上市日期作为起始日期
      const listDate = selectedCompany?.ipo_date
        ? tools.toLuxon(selectedCompany.ipo_date)
        : DateTime.now().minus({ years: 10 })
      setDateRange({
        start_date: listDate,
        end_date: DateTime.now(),
      })
    } else {
      const years = parseInt(timeRange)
      setDateRange({
        start_date: DateTime.now().minus({ years }),
        end_date: DateTime.now(),
      })
    }
  }, [timeRange, selectedCompany])

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

  const fetchMilestones = async () => {
    if (!selectedCompany?.id) return

    try {
      // 获取公司关联的行业列表
      const industriesRes = await fetch(`/api/company-industries?company_id=${selectedCompany.id}`)
      if (!industriesRes.ok) return

      const industriesResult = await industriesRes.json()
      const industries = industriesResult?.data || []

      if (industries.length === 0) {
        setMilestones([])
        return
      }

      // 获取每个行业的里程碑
      const milestonePromises = industries.map((industryRelation: any) =>
        fetch(`/api/milestones?industryId=${industryRelation.industry_id}&startDate=${dateRange.start_date.toISODate()}`)
          .then(res => res.ok ? res.json() : { data: [] })
          .then(result => result.data || [])
      )

      const milestonesArrays = await Promise.all(milestonePromises)
      const allMilestones = milestonesArrays.flat()

      // 去重（基于 id）
      const uniqueMilestones = Array.from(
        new Map(allMilestones.map((item: info__milestone) => [item.id, item])).values()
      )

      setMilestones(uniqueMilestones as info__milestone[])
    } catch (error) {
      console.error('获取里程碑数据失败:', error)
    }
  }

  useEffect(() => {
    if (selectedCompany) {
      fetchData()
      fetchPredictData()
      fetchMilestones()
    }
  }, [selectedCompany, dateRange])

  useEffect(() => {
    if (!chartRef.current || !data) return

    const chartData = data.results || []

    if (chartData.length === 0) return

    const q4PredictByYear = new Map<number, any>()
    predictData?.forEach((item) => {
      const reportDate = tools.toLuxon(item.report_date)
      if (!reportDate.isValid || reportDate.quarter !== 4) return
      q4PredictByYear.set(reportDate.year, item)
    })

    const chartDatasource: any[] = []
    chartData.forEach((item) => {
      const valuation = (item[`${adjustType}_valuation`] as ValuationNumbers)?.[metric]
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
        total_market_value: Number.isFinite(marketValue) ? marketValue : undefined,
        ...Object.fromEntries(predictDividendYieldTexts),
      }
      if (item.company_id) {
        dataPoint.company_name = item.company_name
        dataPoint.company_code = item.company_code
        dataPoint.company_id = item.company_id
      }
      dataPoint.closePrice = parseFloat(closePrice.toFixed(2))

      // 只有当 valuation 存在且为正数时，才添加 valuation 和 quantile_price 数据
      if (valuation && valuation > 0) {
        dataPoint.valuation = parseFloat(valuation.toFixed(2))
        const quantile_price: QuantilePriceSet = item.quantile_prices?.[adjustType]?.[metric]
        if (quantile_price) {
          Object.entries(quantile_price).forEach(([key, value]) => {
            if (value !== null) {
              dataPoint[`quantile_price_${key}`] = parseFloat(value.toFixed(2))
            }
          })
        }
      }

      chartDatasource.push(dataPoint)
    })

    const quantileData: QuantileData = data.quantileData || {}


    predictData?.forEach((item, index, array) => {
      const fieldName = ValuationFieldMap[metric]
      const metricValue = item[fieldName]

      if (!metricValue) return
      const trade_date = new Date(item.report_date)
      const dataPoint: any = {
        trade_date: trade_date,
      }
      const totalShare = chartData[chartData.length - 1].total_shares
      Quantiles.forEach((q, index) => {
        const quantile = quantileData[adjustType]?.[metric]?.[index]
        dataPoint[`predict_quantile_price_p${q}`] = parseFloat(((Number(metricValue) / totalShare) * quantile).toFixed(2))
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

    // 将里程碑数据合并到chartDatasource中
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    milestones?.forEach((milestone) => {
      const milestoneDate = new Date(milestone.milestone_date as any)
      milestoneDate.setHours(0, 0, 0, 0)

      const isFuture = milestoneDate > today

      if (isFuture) {
        // 未来事件：在预测分位区域的P50处显示
        const closestPredictPoint = chartDatasource
          .filter(d => d.predict_quantile_price_p50 !== undefined)
          .reduce((prev, curr) => {
            if (!prev) return curr
            const prevDiff = Math.abs(new Date(prev.trade_date).getTime() - milestoneDate.getTime())
            const currDiff = Math.abs(new Date(curr.trade_date).getTime() - milestoneDate.getTime())
            return currDiff < prevDiff ? curr : prev
          }, null as any)

        if (closestPredictPoint) {
          if (chartDatasource[chartDatasource.length - 1].trade_date.getTime() > milestoneDate.getTime()) {
            // 在P50分位线上创建里程碑点
            chartDatasource.splice(chartDatasource.indexOf(closestPredictPoint) + 1, 0, {
              ...closestPredictPoint,
              trade_date: milestoneDate,
              is_milestone: true,
              milestone_title: milestone.title,
              milestone_keyword: milestone.keyword || undefined,
            })
          }
        }
      } else {
        // 历史事件：在实际价格线上显示
        const closestDataPoint = chartDatasource
          .filter(d => d.closePrice !== undefined && !d.predict_quantile_price_p50)
          .reduce((prev, curr) => {
            if (!prev) return curr
            const prevDiff = Math.abs(new Date(prev.trade_date).getTime() - milestoneDate.getTime())
            const currDiff = Math.abs(new Date(curr.trade_date).getTime() - milestoneDate.getTime())
            return currDiff < prevDiff ? curr : prev
          }, null as any)

        if (closestDataPoint) {
          closestDataPoint.is_milestone = true
          closestDataPoint.milestone_title = milestone.title
          closestDataPoint.milestone_keyword = milestone.keyword || undefined
        }
      }
    })

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
      legend: false,
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
            }) : [],
            ...Quantiles.map((q, index) => {
              return {
                name: `${q}分位(${quantileData[adjustType]?.[metric]?.[index] ? `${quantileData[adjustType][metric][index].toFixed(2)}` : ''})`,
                field: `quantile_price_p${q}`,
                color: GrayGradient[index],
              }
            }).reverse(),
            ...(chartDatasource[chartDatasource.length - 1]?.predict_quantile_price_p10 ? Quantiles.map((q, index) => {
              return {
                name: `预测${q}分位(${quantileData[adjustType]?.[metric]?.[index] ? `${quantileData[adjustType][metric][index].toFixed(2)}` : ''})`,
                field: `predict_quantile_price_p${q}`,
                color: YellowGradient[index],
              }
            }) : []).reverse(),
            {
              name: '事件',
              field: 'milestone_title',
              color: '#ff6b6b',
            },
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
            tooltip: false,
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
            tooltip: false,
          },
          {
            type: 'point',
            encode: {
              y: `predict_quantile_price_p${q}`,
              shape: (d: any) => d.is_milestone ? 'diamond' : 'circle',
              size: 5
            },
            style: {
              fill: YellowGradient[index],
              stroke: YellowGradient[index],
            },
            tooltip: false,
          }]
        }).flat() : []),
        // 显示所有数据点，里程碑用特殊样式标记
        {
          type: 'point',
          encode: {
            y: 'closePrice',
            shape: (d: any) => d.is_milestone ? 'diamond' : 'circle',
            size: 5,
            color: (d: any) => d.is_milestone ? '#ff6b6b' : '#ffffff00',
          },
          style: {
            stroke: (d: any) => d.is_milestone ? '#ff6b6b' : '#ffffff00',
            fill: (d: any) => d.is_milestone ? '#ff6b6b' : '#ffffff00',
          },
          tooltip: false
        },
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
