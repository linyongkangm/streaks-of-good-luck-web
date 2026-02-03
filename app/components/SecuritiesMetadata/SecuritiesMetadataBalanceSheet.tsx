'use client'

import { useState, useEffect } from 'react'
import type { info__stock_company } from '@/types'

interface Props {
  selectedCompany: info__stock_company
}

export default function SecuritiesMetadataBalanceSheet({ selectedCompany }: Props) {
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
        `/api/financial-statements?company_id=${selectedCompany.id}&sheet_type=balance`
      )
      if (res.ok) {
        const result = await res.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('获取资产负债表数据失败:', error)
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
      <h3 className="text-xl font-semibold mb-4 text-slate-800">资产负债表（按报告期）</h3>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-slate-500">暂无资产负债表数据</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">报告期</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">归属母公司股东权益</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                    {new Date(item.report_date).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 text-right font-mono">
                    {formatNumber(item.total_parent_equity)}
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
