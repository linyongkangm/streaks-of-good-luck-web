'use client'

import { useState, useEffect } from 'react'
import type { info__stock_company, quote__stock_constituent_daily } from '@/types'
import { formatNumber, formatVolume } from '@/app/tools'

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
  const [adjustType, setAdjustType] = useState<'none' | 'qfq' | 'hfq'>('none')

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

  return (
    <div className="w-full">
      {/* 筛选栏 */}
      <div className="flex gap-4 mb-6 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">开始日期</label>
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">结束日期</label>
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">复权方式</label>
          <select
            value={adjustType}
            onChange={(e) => setAdjustType(e.target.value as any)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
          >
            <option value="none">不复权</option>
            <option value="qfq">前复权</option>
            <option value="hfq">后复权</option>
          </select>
        </div>
        <button
          onClick={fetchQuotes}
          className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all shadow-md hover:shadow-lg font-medium"
        >
          查询
        </button>
      </div>

      {/* 行情数据表格 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
        </div>
      ) : quotes.length === 0 ? (
        <div className="text-center py-12 text-slate-500">暂无行情数据</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">交易日期</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">开盘</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">收盘</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">最高</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">最低</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">成交量</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">成交额</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">涨跌额</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">涨跌幅</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">振幅</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">换手率</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => {
                const data = getDisplayData(quote)
                const isPositive = Number(quote.change_percent) > 0
                const isNegative = Number(quote.change_percent) < 0
                
                return (
                  <tr key={quote.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                      {new Date(quote.trade_date).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right font-mono">
                      {formatNumber(data.open)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-mono font-semibold ${
                      isPositive ? 'text-red-600' : isNegative ? 'text-green-600' : 'text-slate-900'
                    }`}>
                      {formatNumber(data.close)}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600 text-right font-mono">
                      {formatNumber(data.high)}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600 text-right font-mono">
                      {formatNumber(data.low)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right font-mono">
                      {formatVolume(quote.volume)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right font-mono">
                      {formatVolume(data.turnover)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-mono ${
                      isPositive ? 'text-red-600' : isNegative ? 'text-green-600' : 'text-slate-900'
                    }`}>
                      {formatNumber(data.change_amt)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-mono font-semibold ${
                      isPositive ? 'text-red-600' : isNegative ? 'text-green-600' : 'text-slate-900'
                    }`}>
                      {isPositive ? '+' : ''}{formatNumber(quote.change_percent)}%
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right font-mono">
                      {formatNumber(quote.price_range)}%
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right font-mono">
                      {formatNumber(quote.turnover_rate, 3)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border-2 border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all font-medium text-slate-900"
          >
            ← 上一页
          </button>
          <span className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-medium shadow-md">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border-2 border-slate-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all font-medium text-slate-900"
          >
            下一页 →
          </button>
        </div>
      )}
    </div>
  )
}