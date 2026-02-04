'use client'

import { useState, useEffect, useRef } from 'react'
import { Chart } from '@antv/g2'
import type { StockBoardWithRelations } from '@/types'
import * as tools from '@/app/tools'
interface Props {
  selectedBoard: StockBoardWithRelations
}

type AdjustType = 'none' | 'qfq' | 'hfq'
type ValuationMetric = 'pe' | 'pb' | 'ps' | 'pc'

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

export default function IndustryAnalysisVisual({ selectedBoard }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<Chart | null>(null)
  const [loading, setLoading] = useState(false)
  const [adjustType, setAdjustType] = useState<AdjustType>('qfq')
  const [metric, setMetric] = useState<ValuationMetric>('pe')
  const [data, setData] = useState<any[]>([])
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  })

  // 获取数据
  const fetchData = async () => {
    if (!selectedBoard?.id) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
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

  useEffect(() => {
    if (selectedBoard) {
      fetchData()
    }
  }, [selectedBoard, dateRange])

  // 绘制图表
  useEffect(() => {
    if (!chartRef.current || data.length === 0) return

    // 准备图表数据
    const chartDatasource: any[] = []
    data.forEach((item) => {
      const closePrice = item[`${adjustType}_close_price`]
      const valuation = item[`${adjustType}_valuation`]?.[metric]
      if (closePrice && valuation) {
        const quantile_price = item.quantile_prices?.[adjustType]?.[metric] || {}
        const obj = new Map<string, number>();
        quantile_price && Object.keys(quantile_price).forEach((key) => {
          obj.set(`quantile_price_${key}`, parseFloat((quantile_price[key]).toFixed(2)));
        });
        const data = {
          trade_date: new Date(item.trade_date),
          closePrice,
          valuation: parseFloat(valuation.toFixed(2)),
          company_name: item.company_name,
          company_code: item.company_code,
          company_id: item.company_id,
          ...Object.fromEntries(obj),
        }
        chartDatasource.push(data)
      }
    })

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
    console.log(chartDatasource)
    const ps = [10, 30, 50, 70, 90];
    const grayGradient = tools.genColorGradient(ps.length, '#edc29a', '#bca08e');
    chart.options({
      type: 'view',
      data: chartDatasource,
      encode: {
        x: 'trade_date',
      },
      axis: {
        x: {
          title: '交易日期',
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
          }
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
        ...ps.map((q, index) => ({
          type: 'line',
          encode: {
            y: `quantile_price_p${q}`,
          },
          style: {
            lineWidth: 1,
            stroke: grayGradient[index],
          },
          tooltip: {
            name: `${q}分位价`,
            channel: 'y',
          }
        }))
      ],
    })
    chart.render()
    chartInstance.current = chart

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data, adjustType, metric])

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* 控制栏 */}
      <div className="flex gap-4 mb-6 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-slate-700 mb-2">开始日期</label>
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-slate-700 mb-2">结束日期</label>
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-slate-700 mb-2">复权方式</label>
          <div className="flex gap-2">
            {(Object.keys(adjustTypeLabels) as AdjustType[]).map((type) => (
              <button
                key={type}
                onClick={() => setAdjustType(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${adjustType === type
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                {adjustTypeLabels[type]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-slate-700 mb-2">估值指标</label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as ValuationMetric)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
          >
            {(Object.keys(metricLabels) as ValuationMetric[]).map((m) => (
              <option key={m} value={m}>
                {metricLabels[m]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 图表容器 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-slate-500">暂无数据</div>
      ) : (
        <div ref={chartRef} className="w-full"></div>
      )}
    </div>
  )
}