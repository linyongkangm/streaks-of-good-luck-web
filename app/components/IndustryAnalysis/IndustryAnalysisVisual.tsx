'use client'

import { useState, useEffect, useRef } from 'react'
import { Chart } from '@antv/g2'
import type { StockBoardWithRelations } from '@/types'
import * as tools from '@/app/tools'
import Select from '@/app/widget/Select'
import { DateTime } from 'luxon'
import { FormLabel } from '@/app/widget/Form'
import Loading from '@/app/widget/Loading'
import Panel from '@/app/widget/Panel'
import Radio from '@/app/widget/Radio'

/**
 * 单个复权类型下的财务指标数据结构
 * 包含pe、pb、ps、pc四种指标，每种指标都是数值数组
 */
interface FinancialMetrics {
  /** 市盈率 (Price-to-Earnings Ratio) */
  pe: number[];
  /** 市净率 (Price-to-Book Ratio) */
  pb: number[];
  /** 市销率 (Price-to-Sales Ratio) */
  ps: number[];
  /** 市现率 (Price-to-Cash Flow Ratio) */
  pc: number[];
}

/**
 * 完整的财务指标数据结构
 * 包含三种复权类型：不复权(none)、前复权(qfq)、后复权(hfq)
 */
interface QuantileData {
  /** 不复权 */
  none: FinancialMetrics;
  /** 前复权 (Forward Fill) */
  qfq: FinancialMetrics;
  /** 后复权 (Historical Fill) */
  hfq: FinancialMetrics;
}
interface Props {
  selectedBoard: StockBoardWithRelations
  selectedCompanyId: number | null
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


export default function IndustryAnalysisVisual({ selectedBoard, selectedCompanyId }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<Chart | null>(null)
  const [loading, setLoading] = useState(false)
  const [adjustType, setAdjustType] = useState<AdjustType>('qfq')
  const [metric, setMetric] = useState<ValuationMetric>('pe')
  const [timeRange, setTimeRange] = useState<TimeRange>('3')
  const [data, setData] = useState<{ [key: string]: { results: any[], quantileData: any } }>({})
  const [dateRange, setDateRange] = useState({
    start_date: DateTime.now().minus({ years: 3 }),
    end_date: DateTime.now(),
  })
  const [predictData, setPredictData] = useState<any[]>([])
  
  // 处理时间范围变化
  useEffect(() => {
    const years = parseInt(timeRange)
    setDateRange({
      start_date: DateTime.now().minus({ years }),
      end_date: DateTime.now(),
    })
  }, [timeRange])
  
  // 获取数据
  const fetchData = async () => {
    if (!selectedBoard?.id) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        start_date: dateRange.start_date.toISODate() || '',
        end_date: dateRange.end_date.toISODate() || '',
      })

      const res = await fetch(`/api/board-companies/${selectedBoard.id}/valuation?${params}`)
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

  // 获取预测数据
  const fetchPredictData = async () => {
    if (!selectedBoard?.id) return

    try {
      const params = new URLSearchParams()

      if (selectedCompanyId) {
        params.append('company_id', selectedCompanyId.toString())
      } else {
        params.append('board_id', selectedBoard.id.toString())
      }

      // 启用日期过滤：公司只获取最新财报之后的预测，板块只获取当天之后的预测
      params.append('filter_by_date', 'true')

      const res = await fetch(`/api/financial-predictions?${params}`)
      if (res.ok) {
        const result = await res.json()
        setPredictData(result.data || [])
      }
    } catch (error) {
      console.error('获取预测数据失败:', error)
    }
  }



  useEffect(() => {
    if (selectedBoard) {
      fetchData()
      fetchPredictData()
    }
  }, [selectedBoard, dateRange])

  useEffect(() => {
    if (selectedBoard) {
      fetchPredictData()
    }
  }, [selectedCompanyId])

  // 绘制图表
  useEffect(() => {
    if (!chartRef.current || !data || Object.keys(data).length === 0) return

    // 根据 selectedCompanyId 选择数据源
    const dataKey = selectedCompanyId ? selectedCompanyId.toString() : 'all'
    const chartData = data[dataKey]?.results || []

    if (chartData.length === 0) return
    // 准备图表数据
    const chartDatasource: any[] = []
    chartData.forEach((item) => {
      const valuation = item[`${adjustType}_valuation`]?.[metric]
      if (!valuation) return

      const dataPoint: any = {
        trade_date: new Date(item.trade_date),
        valuation: parseFloat(valuation.toFixed(2)),
      }
      if (item.company_id) {
        dataPoint.company_name = item.company_name
        dataPoint.company_code = item.company_code
        dataPoint.company_id = item.company_id
      }
      const closePrice = item[`${adjustType}_close_price`]
      dataPoint.closePrice = parseFloat(closePrice.toFixed(2))
      const quantile_price = item.quantile_prices?.[adjustType]?.[metric] || {}
      Object.keys(quantile_price).forEach((key) => {
        if (quantile_price[key] !== null) {
          dataPoint[`quantile_price_${key}`] = parseFloat(quantile_price[key].toFixed(2))
        }
      })
      chartDatasource.push(dataPoint)
    })

    const quantileData: QuantileData = data[dataKey]?.quantileData || {}

    // 字段名映射
    const fieldMap: Record<ValuationMetric, string> = {
      pe: 'parent_netprofit',
      pb: 'total_parent_equity',
      ps: 'operate_income',
      pc: 'netcash_operate',
    }
    // 使用从API获取的预测数据
    predictData.forEach((item, index, array) => {
      const fieldName = fieldMap[metric]
      const metricValue = item[fieldName]

      // 如果该指标没有预测值，跳过
      if (!metricValue) return
      const trade_date = new Date(item.report_date)
      const dataPoint: any = {
        trade_date: trade_date,
      }
      const totalShare = chartData[chartData.length - 1].total_shares
      Quantiles.forEach((q, index) => {
        const quantile = quantileData[adjustType]?.[metric]?.[index]
        // 使用对应字段的预测值
        dataPoint[`predict_quantile_price_p${q}`] = parseFloat(((metricValue / totalShare) * quantile).toFixed(2))
      });

      if (index === 0 && dataPoint.trade_date > chartDatasource[chartDatasource.length - 1].trade_date) {
        // 如果第一个预测数据的报告期在图表数据的最后一个交易日期之后，添加一个连接点
        const lastChartDataPoint = chartDatasource[chartDatasource.length - 1]
        const lastTradeDate = new Date(lastChartDataPoint.trade_date)
        lastTradeDate.setDate(lastTradeDate.getDate() - 30) // 连接点的trade_date设置为图表数据最后一个交易日期的后一天
        chartDatasource.push({
          ...dataPoint,
          trade_date: lastTradeDate,
        })
      }
      chartDatasource.push(dataPoint)

      // 设置连接点：当前预测数据的trade_date设置为report_date，如果下一个预测数据的report_date与当前预测数据的report_date相同，则不设置连接点；如果下一个预测数据的report_date在当前预测数据的report_date之后，则设置连接点为下一个预测数据的report_date的前一天；如果没有下一个预测数据，则设置连接点为当前预测数据的report_date的后30天
      const nextPredictData = array[index + 1]
      const endTradeDate = nextPredictData ? new Date(nextPredictData.report_date) : new Date(item.report_date)
      if (nextPredictData) {
        endTradeDate.setDate(endTradeDate.getDate() - 1) // 预测数据的trade_date设置为report_date的前一天
      } else {
        endTradeDate.setDate(endTradeDate.getDate() + 3 * 30) // 最后一个预测数据的trade_date设置为report_date的后30天
      }
      chartDatasource.push({
        ...dataPoint,
        trade_date: endTradeDate,
      })
    });
    // 销毁旧图表
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    // 创建新图表
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
          title: (selectedBoard.relation__stock_board_company.find(company => company.company_id === selectedCompanyId)?.info__stock_company?.company_name || 'All') + ' - 交易日期',
        },
      },
      scale: {
        y: {
          nice: true,
        },
        x: {
          nice: true,
        }
      },
      interaction: {
        tooltip: {
          filter: (d) => {
            return d.value !== 'undefined'
          }, // 关闭默认tooltip
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
          tooltip: {
            name: `收盘价(${adjustTypeLabels[adjustType]})`,
            channel: 'y',
          },
        },
        {
          type: 'line',
          encode: {
            y: 'valuation',
          },
          scale: {
            y: { independent: true },
          },
          axis: {
            y: {
              position: 'right',
              title: metricLabels[metric],
            },
          },
          style: {
            lineWidth: 2,
            stroke: '#EE6666',
          },
          tooltip: {
            name: metricLabels[metric],
            channel: 'y',
          }
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
              name: `${q}分位价`,
              channel: 'y',
            }
          }
        }),
        ...(chartDatasource[chartDatasource.length - 1]?.predict_quantile_price_p10 ? Quantiles.map((q, index) => {
          return {
            type: 'line',
            encode: {
              y: `predict_quantile_price_p${q}`,
            },
            style: {
              lineWidth: 1,
              stroke: YellowGradient[index],
            },
            tooltip: {
              name: `预测${q}分位价`,
              channel: 'y',
            },
          }
        }) : []),
      ],
    })
    chart.render()
    chartInstance.current = chart

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data, adjustType, metric, selectedCompanyId, predictData])

  return (
    <Panel>
      {/* 控制栏 */}
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

      {/* 图表容器 */}
      {loading ? (
        <Loading />
      ) : Object.keys(data).length === 0 ? (
        <div className="text-center py-12 text-slate-500">暂无数据</div>
      ) : (
        <div ref={chartRef} className="w-full"></div>
      )}
    </Panel>
  )
}