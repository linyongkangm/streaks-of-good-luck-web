'use client'

import { useState, useEffect, useRef } from 'react'
import { Chart } from '@antv/g2'
import type {
  info__stock_company,
  MilestoneWithRelations,
  StockValuationResponse,
  ValuationNumbers,
  QuantilePriceSet,
  StockPredictionItem,
  StockValuationItem,
  relation__industry_or_company_milestone
} from '@/types'
import * as tools from '@/app/tools'
import Select from '@/app/widget/Select'
import { DateTime } from 'luxon'
import { FormLabel } from '@/app/widget/Form'
import Loading from '@/app/widget/Loading'
import Panel from '@/app/widget/Panel'
import Radio from '@/app/widget/Radio'
const DATE_FORMAT = 'yyyy-MM-dd'
interface ValuationChartData {
  date: Date,
  closePrice: number,
  valuation: number,
  total_market_value: number,
  quantile_price_p10: number,
  quantile_price_p30: number,
  quantile_price_p50: number,
  quantile_price_p70: number,
  quantile_price_p90: number,
  predictDividendYields?: Record<number, number>,
  milestones?: MilestoneWithRelations[],
}

interface PredictChartData {
  date: Date,
  predict_quantile_price_p10: number,
  predict_quantile_price_p30: number,
  predict_quantile_price_p50: number,
  predict_quantile_price_p70: number,
  predict_quantile_price_p90: number,
  milestones?: MilestoneWithRelations[],
}

interface JustMilestoneChartData {
  date: Date,
  y: number,
  milestones?: MilestoneWithRelations[],
  [key: string]: any,
}


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

function getMilestonePointColor(milestones: MilestoneWithRelations[] | undefined): string {
  if (!milestones || milestones.length === 0) return '#ffffff00'
  const hasNegative = milestones.some(milestone => milestone.relation__industry_or_company_milestone?.some(relation => /负面/.test(relation.impact || '')))
  const hasPositive = milestones.some(milestone => milestone.relation__industry_or_company_milestone?.some(relation => /正面/.test(relation.impact || '')))
  if (!hasNegative && !hasPositive) return '#51a2ff'
  return hasNegative ? '#00c950' : '#fb2c36'
}

export default function StockAnalysisVisual({ selectedCompany }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<Chart | null>(null)
  const [loading, setLoading] = useState(false)
  const [adjustType, setAdjustType] = useState<AdjustType>('qfq')
  const [metric, setMetric] = useState<ValuationMetric>('pe')
  const [timeRange, setTimeRange] = useState<TimeRange>('3')

  const getDateRange = () => {
    if (timeRange === 'all') {
      const listDate = selectedCompany?.ipo_date
        ? tools.toLuxon(selectedCompany.ipo_date)
        : DateTime.now().minus({ years: 10 })
      return {
        start_date: listDate,
        end_date: DateTime.now(),
      }
    } else {
      const years = parseInt(timeRange)
      return {
        start_date: DateTime.now().minus({ years }),
        end_date: DateTime.now(),
      }
    }
  }
  const [valuationData, setValuationData] = useState<StockValuationResponse['data'] | null>(null)
  const [predictData, setPredictData] = useState<StockPredictionItem[] | null>(null)
  const [milestones, setMilestones] = useState<MilestoneWithRelations[] | null>(null)

  // `dateRange` is computed on demand via `getDateRange()`

  const fetchValuationData = async () => {
    if (!selectedCompany?.id) return

    setLoading(true)
    try {
      const { start_date, end_date } = getDateRange()
      const params = new URLSearchParams({
        start_date: start_date.toISODate() || '',
        end_date: end_date.toISODate() || '',
      })

      const res = await fetch(`/api/stock-companies/${selectedCompany.id}/valuation?${params}`)
      if (res.ok) {
        const result = await res.json()
        setValuationData(result.data)
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
      const startDateIso = getDateRange().start_date.toISODate()
      const milestonePromises = industries.map((industryRelation: any) =>
        fetch(`/api/milestones?industryId=${industryRelation.industry_id}&startDate=${startDateIso}`)
          .then(res => res.ok ? res.json() : { data: [] })
          .then(result => result.data || [])
      )

      const milestonesArrays = await Promise.all(milestonePromises)
      const allMilestones = milestonesArrays.flat()

      // 去重（基于 id）
      const uniqueMilestones = Array.from(
        new Map(allMilestones.map((item: MilestoneWithRelations) => [item.id, item])).values()
      )

      setMilestones(uniqueMilestones)
    } catch (error) {
      console.error('获取里程碑数据失败:', error)
    }
  }

  useEffect(() => {
    if (selectedCompany) {
      fetchValuationData()
      fetchPredictData()
      fetchMilestones()
    }
  }, [selectedCompany, timeRange])

  useEffect(() => {
    if (!chartRef.current || !valuationData || !predictData || !milestones) return
    const totalShare = valuationData.results[valuationData.results.length - 1]?.total_shares!; // 总股本
    const quantileData = valuationData.quantileData?.[adjustType]?.[metric]; // 分位数数据
    const chartDatasourceMap = new Map<string, Partial<ValuationChartData & PredictChartData & JustMilestoneChartData>>()
    const mergeSetChartDatasourceMap = (key: string, chartData: ValuationChartData | PredictChartData | JustMilestoneChartData) => {
      if (chartDatasourceMap.has(key)) {
        const existingData = chartDatasourceMap.get(key)!
        const newData = {
          ...existingData,
          ...chartData,
        }
        newData.y = newData.closePrice || newData.predict_quantile_price_p50 || newData.y;
        chartDatasourceMap.set(key, newData)
      } else {
        const newData: Partial<ValuationChartData & PredictChartData & JustMilestoneChartData> = {
          ...chartData,
        }
        newData.y = newData.closePrice || newData.predict_quantile_price_p50 || newData.y;
        chartDatasourceMap.set(key, newData)
      }
    };

    // 预处理
    const milestonesMap = new Map<string, MilestoneWithRelations[]>()
    milestones.forEach(milestone => {
      const milestoneDatetime = tools.toLuxon(milestone.milestone_date)
      const key = `${milestoneDatetime.toFormat(DATE_FORMAT)}`;
      if (!milestonesMap.has(key)) {
        milestonesMap.set(key, [])
      }
      milestonesMap.get(key)?.push(milestone)
    })
    const stockValuationItemMap = new Map<string, StockValuationItem>()
    valuationData.results.forEach(item => {
      const key = `${tools.toLuxon(item.trade_date).toFormat(DATE_FORMAT)}`;
      stockValuationItemMap.set(key, item)
    })
    const predictDataQ4 = predictData.filter(item => {
      const reportDate = tools.toLuxon(item.report_date)
      return reportDate.isValid && reportDate.quarter === 4
    })

    // 开始
    const start_date = tools.toLuxon(valuationData.results[0].trade_date)
    const end_date = tools.toLuxon(valuationData.results[valuationData.results.length - 1].trade_date)
    let prevValuationChartData: ValuationChartData | undefined = undefined
    for (let i_date = tools.toLuxon(start_date); i_date <= end_date; i_date = i_date.plus({ days: 1 })) {
      const key = i_date.toFormat(DATE_FORMAT)
      const iMilestones = milestonesMap.get(key)
      milestonesMap.delete(key) // 从milestonesMap中删除这个日期的milestones，表示这个日期的milestones已经被处理过了，不需要再处理了
      const stockValuationItem = stockValuationItemMap.get(key)

      if (stockValuationItem) {
        const quantilePriceSet: QuantilePriceSet = stockValuationItem.quantile_prices?.[adjustType]?.[metric];
        const total_market_value = Number(stockValuationItem.qfq_close_price) * Number(stockValuationItem.total_shares)
        prevValuationChartData = {
          date: i_date.toJSDate(),
          closePrice: stockValuationItem[`${adjustType}_close_price`],
          valuation: (stockValuationItem[`${adjustType}_valuation`] as ValuationNumbers)?.[metric] as number,
          total_market_value: total_market_value,
          quantile_price_p10: quantilePriceSet['p10'] as number,
          quantile_price_p30: quantilePriceSet['p30'] as number,
          quantile_price_p50: quantilePriceSet['p50'] as number,
          quantile_price_p70: quantilePriceSet['p70'] as number,
          quantile_price_p90: quantilePriceSet['p90'] as number,
          predictDividendYields: predictDataQ4.reduce((acc, predictData) => {
            const reportDate = tools.toLuxon(predictData.report_date)
            const dividendYield = ((Number(predictData.parent_netprofit) * (Number(predictData.dividend_payout_ratio) / 100)) / total_market_value) * 100
            acc[reportDate.year] = dividendYield
            return acc
          }, {} as Record<number, number>),
          milestones: iMilestones,
        }
        mergeSetChartDatasourceMap(key, prevValuationChartData)
      } else if (iMilestones) {
        // 如果没有估值数据但有里程碑，也要把这个日期加到图表数据中，这样里程碑事件才能显示在图表上
        if (prevValuationChartData) {
          mergeSetChartDatasourceMap(key, {
            date: i_date.toJSDate(),
            y: prevValuationChartData.closePrice,
            total_market_value: prevValuationChartData.total_market_value,
            quantile_price_p10: prevValuationChartData.quantile_price_p10,
            quantile_price_p30: prevValuationChartData.quantile_price_p30,
            quantile_price_p50: prevValuationChartData.quantile_price_p50,
            quantile_price_p70: prevValuationChartData.quantile_price_p70,
            quantile_price_p90: prevValuationChartData.quantile_price_p90,
            milestones: iMilestones,
          })
        }
      }
    }

    predictData.forEach((item, index, arr) => {
      const reportDate = tools.toLuxon(item.report_date)
      if (!reportDate.isValid) return
      const fieldName = ValuationFieldMap[metric]
      const predictValue = Number(item[fieldName])
      if (!predictValue) return
      const predictChartData: PredictChartData = {
        date: reportDate.toJSDate(),
        predict_quantile_price_p10: (Number(predictValue) / totalShare) * quantileData[0],
        predict_quantile_price_p30: (Number(predictValue) / totalShare) * quantileData[1],
        predict_quantile_price_p50: (Number(predictValue) / totalShare) * quantileData[2],
        predict_quantile_price_p70: (Number(predictValue) / totalShare) * quantileData[3],
        predict_quantile_price_p90: (Number(predictValue) / totalShare) * quantileData[4],
      }
      const appendPredictMilestoneChartData = (start: DateTime, end: DateTime) => {
        Array.from(milestonesMap.values()).forEach(milestones => {
          const milestone_date = tools.toLuxon(milestones[0].milestone_date);
          if (start <= milestone_date && milestone_date <= end) {
            const key = milestone_date.toFormat(DATE_FORMAT)
            milestonesMap.delete(key)
            mergeSetChartDatasourceMap(key, {
              y: predictChartData.predict_quantile_price_p50,
              milestones,
              date: milestone_date.toJSDate(),
            })
          }
        })
      }

      // 如果第一个预测数据的报告日期在现有数据的最后一个日期之后，则在图表中添加一个过渡点，日期为最后一个现有数据日期的前一个季度交易日，数值与最后一个现有数据点相同
      if (index === 0 && end_date < reportDate) {
        const date = end_date.minus({ quarter: 1 })
        mergeSetChartDatasourceMap(date.toFormat(DATE_FORMAT), {
          ...predictChartData,
          date: date.toJSDate(),
        })
        appendPredictMilestoneChartData(date, reportDate)
      }

      // 正经的，当下的
      mergeSetChartDatasourceMap(reportDate.toFormat(DATE_FORMAT), predictChartData);

      const nextPredictData = arr[index + 1]
      if (nextPredictData) {
        // 在下一个预测数据前一天添加一个过渡点，数值与当前预测数据相同
        const nextReportDate = tools.toLuxon(nextPredictData.report_date).minus({ days: 1 }) // 下一个预测数据的报告日期的前一个交易日
        appendPredictMilestoneChartData(reportDate, nextReportDate)
        if (nextReportDate.isValid && reportDate < nextReportDate) {
          mergeSetChartDatasourceMap(nextReportDate.toFormat(DATE_FORMAT), {
            ...predictChartData,
            date: nextReportDate.toJSDate(),
          })
        }
      } else {
        // 如果是最后一个预测数据，则在图表中添加一个过渡点，日期为报告日期的后一个季度交易日，数值与当前预测数据相同
        const closePredictReportDate = reportDate.plus({ days: 90 })
        appendPredictMilestoneChartData(reportDate, closePredictReportDate)
        mergeSetChartDatasourceMap(closePredictReportDate.toFormat(DATE_FORMAT), {
          ...predictChartData,
          date: reportDate.plus({ days: 90 }).toJSDate(),
        })
      }
    });
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }
    const chartDatasource = Array.from(chartDatasourceMap.values())
    chartDatasource.sort((a, b) => (a?.date?.getTime() || 0) - (b?.date?.getTime() || 0))
    const chart = new Chart({
      container: chartRef.current,
      autoFit: true,
      height: 500,
    })
    chart.options({
      type: 'view',
      data: chartDatasource,
      encode: {
        x: 'date',
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
            return d.value !== 'undefined' && d.value !== '-'
          },
        }
      },
      children: [
        {
          type: 'line',
          encode: {
            y: `y`,
          },
          style: {
            lineWidth: 0,
          },
          tooltip: {
            title: (d) => {
              return `${tools.toLuxon(d.date).toFormat('yyyy-MM-dd')}`
            },
            items: [
              {
                name: `收盘价(${adjustTypeLabels[adjustType]})`,
                field: 'closePrice',
              },
              {
                name: metricLabels[metric],
                field: 'valuation',
                valueFormatter: tools.formatNumber,
              },
              {
                name: '总市值',
                field: 'total_market_value',
                valueFormatter: tools.formatNumber,
              },
              {
                name: '预测股息率',
                field: 'predictDividendYields',
                valueFormatter: (predictDividendYields: ValuationChartData['predictDividendYields']) => {
                  if (!predictDividendYields || Object.keys(predictDividendYields).length === 0) return undefined as any
                  return Object.entries(predictDividendYields).map(([year, dividendYield]) => `${year}年: ${dividendYield.toFixed(2)}%`).join('<br/>');
                },
              },
              ...Quantiles.map((q, index) => {
                return {
                  name: `${q}分位(${valuationData.quantileData[adjustType]?.[metric]?.[index] ? `${valuationData.quantileData[adjustType][metric][index].toFixed(2)}` : ''})`,
                  field: `quantile_price_p${q}`,
                  color: GrayGradient[index],
                  valueFormatter: tools.formatNumber,
                }
              }).reverse(),
              ...Quantiles.map((q, index) => {
                return {
                  name: `预测${q}分位(${valuationData.quantileData[adjustType]?.[metric]?.[index] ? `${valuationData.quantileData[adjustType][metric][index].toFixed(2)}` : ''})`,
                  field: `predict_quantile_price_p${q}`,
                  color: YellowGradient[index],
                  valueFormatter: tools.formatNumber,
                }
              }).reverse(),
              {
                name: '事件',
                field: 'milestones',
                color: '#51a2ff',
                valueFormatter: (milestones: MilestoneWithRelations[]) => {
                  if (!milestones || milestones.length === 0) return undefined as any
                  return milestones.map(m => m.keyword).join('<br/>')
                }
              },
            ]
          },
        },
        // 收盘价线
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
            connect: true,
            lineWidth: 2,
          },
          tooltip: false
        },
        // 分位数阶梯线
        ...Quantiles.map((q, index) => {
          return {
            type: 'line',
            encode: {
              y: `quantile_price_p${q}`,
            },
            style: {
              connect: true,
              lineWidth: 1,
              stroke: GrayGradient[index],
            },
            tooltip: false,
          }
        }),
        // 预测分位数阶梯线
        ...(predictData.length > 0 ? Quantiles.map((q, index) => {
          return {
            type: 'line',
            encode: {
              y: `predict_quantile_price_p${q}`,
            },
            style: {
              connect: true,
              lineWidth: 1,
              stroke: YellowGradient[index],
            },
            tooltip: false,
          }
        }) : []),
        // 显示预测分位数数据点
        ...(predictData.length > 0 ? Quantiles.map((q, index) => {
          return {
            type: 'point',
            encode: {
              y: `predict_quantile_price_p${q}`,
              size: 3
            },
            style: {
              fill: YellowGradient[index],
              stroke: YellowGradient[index],
            },
            tooltip: false,
          }
        }) : []),
        // 显示里程碑数据点
        {
          type: 'point',
          encode: {
            y: 'y',
            shape: 'diamond',
            size: 8,
          },
          style: {
            stroke: (d: ValuationChartData) => getMilestonePointColor(d.milestones),
            fill: (d: ValuationChartData) => getMilestonePointColor(d.milestones),
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
  }, [valuationData, adjustType, metric, predictData, selectedCompany])

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
      ) : !valuationData || valuationData.results.length === 0 ? (
        <div className="text-center py-12 text-slate-500">暂无数据</div>
      ) : (
        <div ref={chartRef} className="w-full"></div>
      )}
    </Panel>
  )
}
