'use client'

import { useState, useEffect } from 'react'
import type { info__stock_company } from '@/types'

interface Props {
  selectedCompany: info__stock_company
}

export default function SecuritiesMetadataFinancialView({ selectedCompany }: Props) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (selectedCompany) {
      setPage(1)
      fetchData()
    }
  }, [selectedCompany])

  useEffect(() => {
    if (selectedCompany) {
      fetchData()
    }
  }, [page])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/financial-statements/view?stock_code=${selectedCompany.company_code}&page=${page}&limit=20`
      )
      if (res.ok) {
        const result = await res.json()
        setData(result.data)
        setTotalPages(result.pagination.totalPages)
      }
    } catch (error) {
      console.error('获取财务报表视图数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (value: any, decimals: number = 2) => {
    if (value === null || value === undefined) return '-'
    const num = Number(value)
    if (num >= 100000000) return `${(num / 100000000).toFixed(2)}亿`
    if (num >= 10000) return `${(num / 10000).toFixed(2)}万`
    return num.toFixed(decimals)
  }

  const formatPercent = (current: any, last: any) => {
    if (!current || !last || last === 0) return '-'
    const change = ((Number(current) - Number(last)) / Number(last)) * 100
    const isPositive = change > 0
    return (
      <span className={isPositive ? 'text-red-600' : change < 0 ? 'text-green-600' : 'text-slate-900'}>
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </span>
    )
  }

  return (
    <div className="w-full">
      <h3 className="text-xl font-semibold mb-4 text-slate-800">📊 财务报表综合视图（滚动四季度）</h3>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-slate-500">暂无综合财务数据</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 sticky left-0 bg-slate-50">报告期</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">归母权益</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">基本每股收益(TTM)</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">稀释每股收益(TTM)</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">加权平均股本</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">归母净利(TTM)</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">归母净利(去年)</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700">同比</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">营收(TTM)</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">营收(去年)</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700">同比</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">经营现金流(TTM)</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">经营现金流(去年)</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700">同比</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">投资现金流(TTM)</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">筹资现金流(TTM)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 text-xs text-slate-900 font-medium sticky left-0 bg-white hover:bg-slate-50">
                      {new Date(item.report_date).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-900 text-right font-mono">
                      {formatNumber(item.total_parent_equity)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-900 text-right font-mono">
                      {formatNumber(item.basic_eps_ttm, 4)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-900 text-right font-mono">
                      {formatNumber(item.diluted_eps_ttm, 4)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-900 text-right font-mono">
                      {formatNumber(item.weighted_average_shares)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-900 text-right font-mono font-semibold">
                      {formatNumber(item.parent_netprofit_ttm)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 text-right font-mono">
                      {formatNumber(item.parent_netprofit_last_year)}
                    </td>
                    <td className="px-3 py-2 text-xs text-center font-mono font-semibold">
                      {formatPercent(item.parent_netprofit_ttm, item.parent_netprofit_last_year)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-900 text-right font-mono font-semibold">
                      {formatNumber(item.operate_income_ttm)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 text-right font-mono">
                      {formatNumber(item.operate_income_last_year)}
                    </td>
                    <td className="px-3 py-2 text-xs text-center font-mono font-semibold">
                      {formatPercent(item.operate_income_ttm, item.operate_income_last_year)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-900 text-right font-mono">
                      {formatNumber(item.netcash_operate_ttm)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600 text-right font-mono">
                      {formatNumber(item.netcash_operate_last_year)}
                    </td>
                    <td className="px-3 py-2 text-xs text-center font-mono">
                      {formatPercent(item.netcash_operate_ttm, item.netcash_operate_last_year)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-900 text-right font-mono">
                      {formatNumber(item.netcash_invest_ttm)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-900 text-right font-mono">
                      {formatNumber(item.netcash_finance_ttm)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
              <span className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium shadow-md">
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
        </>
      )}
    </div>
  )
}
