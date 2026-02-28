'use client'

import { useEffect, useMemo, useState } from 'react'
import type {
  info__stock_company,
} from '@/types'

interface StockValuationSummary {
  company_id: number;
  latest_trade_date: string | null;
  qfq_close_price: number | null;
  pe: number | null;
  pe_percentile_3y: number | null;
  pb: number | null;
  pb_percentile_3y: number | null;
}

interface Props {
  companies: info__stock_company[];
  selectedCompany: info__stock_company | null;
  sinkCompanyIds: number[];
  onSelectCompany: (company: info__stock_company) => void;
}

/* 个股列表 */
export default function StockAnalysisStockList({ companies, selectedCompany, sinkCompanyIds, onSelectCompany }: Props) {
  const [valuationMap, setValuationMap] = useState<Record<number, StockValuationSummary>>({})

  useEffect(() => {
    if (companies.length === 0) {
      setValuationMap({})
      return
    }

    let isMounted = true

    const fetchValuationSummaries = async () => {
      try {
        const res = await fetch('/api/stock-companies/valuation-summaries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company_ids: companies.map((company) => company.id),
          }),
        })

        if (!res.ok) return

        const result = await res.json()
        const dataList: StockValuationSummary[] = result?.data || []

        if (!isMounted) return

        const nextMap = dataList.reduce<Record<number, StockValuationSummary>>((acc, item) => {
          acc[item.company_id] = item
          return acc
        }, {})

        setValuationMap(nextMap)
      } catch (error) {
        console.error('Failed to fetch valuation summaries:', error)
      }
    }

    fetchValuationSummaries()

    return () => {
      isMounted = false
    }
  }, [companies])

  const formatter = useMemo(() => {
    return {
      price: (value: number | null | undefined) => {
        if (value === null || value === undefined || Number.isNaN(value)) return '--'
        return value.toFixed(2)
      },
      ratio: (value: number | null | undefined) => {
        if (value === null || value === undefined || Number.isNaN(value)) return '--'
        return value.toFixed(2)
      },
      percentile: (value: number | null | undefined) => {
        if (value === null || value === undefined || Number.isNaN(value)) return '--'
        return `${value.toFixed(1)}%`
      },
      date: (value: string | null | undefined) => {
        if (!value) return '--'
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return '--'
        return date.toISOString().slice(0, 10)
      },
    }
  }, [])

  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      const aSink = sinkCompanyIds.includes(a.id)
      const bSink = sinkCompanyIds.includes(b.id)

      if (aSink !== bSink) {
        return aSink ? 1 : -1
      }

      const aValue = valuationMap[a.id]?.pe_percentile_3y
      const bValue = valuationMap[b.id]?.pe_percentile_3y
      const aInvalid = aValue === null || aValue === undefined || Number.isNaN(aValue)
      const bInvalid = bValue === null || bValue === undefined || Number.isNaN(bValue)

      if (aInvalid && bInvalid) return 0
      if (aInvalid) return 1
      if (bInvalid) return -1

      return aValue - bValue
    })
  }, [companies, sinkCompanyIds, valuationMap])

  return <div className="bg-white rounded-xl shadow-lg p-4 sticky">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        个股列表
      </h2>
    </div>
    <div className="space-y-1.5 max-h-[calc(100vh-230px)] overflow-y-auto scrollbar-thin pr-1">
      {sortedCompanies.map((company) => {
        const summary = valuationMap[company.id]
        const isSelected = selectedCompany?.id === company.id
        const isSink = sinkCompanyIds.includes(company.id)

        return (
          <div key={company.id} className="relative group">
            <button
              onClick={() => onSelectCompany(company)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-200 ${isSelected
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-blue-400 shadow-lg'
                : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100 hover:border-slate-200 hover:shadow-sm'
                }`}
            >
              <div className='flex'>
                <div className='flex-1'>
                  <div className="flex items-center gap-1">
                    <div className="font-medium text-sm leading-5 line-clamp-1 flex-1">{company.company_name}</div>

                  </div>
                  <div className={`text-[11px] leading-4 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                    {company.company_code}
                    {isSink && (
                      <span className={`text-[10px] leading-4 px-1.5 py-0.5 rounded ml-2 ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        Sink
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-sm leading-5 line-clamp-1 text-right">{formatter.price(summary?.qfq_close_price)}</div>
                  <div className={`text-[10px] leading-4 text-right ${isSelected ? 'text-blue-100/90' : 'text-slate-500'}`}>
                    {formatter.date(summary?.latest_trade_date)}
                  </div>
                </div>
              </div>
              <div className={`mt-1.5 text-[11px] leading-4 ${isSelected ? 'text-blue-100' : 'text-slate-600'}`}>
                <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className={`${isSelected ? 'text-blue-100/90' : 'text-slate-500'}`}>PE</span>
                    <span>{formatter.ratio(summary?.pe)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`${isSelected ? 'text-blue-100/90' : 'text-slate-500'}`}>三年分位</span>
                    <span>{formatter.percentile(summary?.pe_percentile_3y)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`${isSelected ? 'text-blue-100/90' : 'text-slate-500'}`}>PB</span>
                    <span>{formatter.ratio(summary?.pb)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`${isSelected ? 'text-blue-100/90' : 'text-slate-500'}`}>三年分位</span>
                    <span>{formatter.percentile(summary?.pb_percentile_3y)}</span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        )
      })}
    </div>
  </div>
}
