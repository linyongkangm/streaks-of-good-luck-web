'use client'

import { useState, useEffect } from 'react'
import type { info__stock_company } from '@/types'

interface Props {
  selectedCompany: info__stock_company
}

export default function SecuritiesMetadataCashFlowSheet({ selectedCompany }: Props) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedCompany) {
      fetchData()
    }
  }, [selectedCompany])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/financial-statements?company_id=${selectedCompany.id}&sheet_type=cash_flow`
      )
      if (res.ok) {
        const result = await res.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('获取现金流量表数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (value: any) => {
    if (value === null || value === undefined) return '-'
    const num = Number(value)
    if (num >= 100000000) return `${(num / 100000000).toFixed(2)}亿`
    if (num >= 10000) return `${(num / 10000).toFixed(2)}万`
    return num.toFixed(2)
  }

  return (
    <div className="w-full">
      <h3 className="text-xl font-semibold mb-4 text-slate-800">现金流量表（按单季度）</h3>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-600"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-slate-500">暂无现金流量表数据</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">报告期</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">经营活动现金流净额</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">投资活动现金流净额</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">筹资活动现金流净额</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">汇率变动对现金的影响</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                    {new Date(item.report_date).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 text-right font-mono">
                    {formatNumber(item.netcash_operate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 text-right font-mono">
                    {formatNumber(item.netcash_invest)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 text-right font-mono">
                    {formatNumber(item.netcash_finance)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 text-right font-mono">
                    {formatNumber(item.rate_change_effect)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
