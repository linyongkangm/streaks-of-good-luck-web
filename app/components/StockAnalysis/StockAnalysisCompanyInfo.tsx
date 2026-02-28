'use client'

import { useEffect, useMemo, useState } from 'react'
import type { info__stock_company } from '@/types'
import type { view_financial_statements } from '@/types'
import Panel from '@/app/widget/Panel'
import Button from '@/app/widget/Button'
import { formatNumber } from '@/app/tools'

interface Props {
  selectedCompany: info__stock_company
  sinkCompanyIds: number[]
  onToggleSink: (companyId: number) => void
}

export default function StockAnalysisCompanyInfo({ selectedCompany, sinkCompanyIds, onToggleSink }: Props) {
  const isSunk = sinkCompanyIds.includes(selectedCompany.id)
  const [latestFinancial, setLatestFinancial] = useState<view_financial_statements | null>(null)
  const [latestClosePrice, setLatestClosePrice] = useState<number | null>(null)
  const [latestDividendYield, setLatestDividendYield] = useState<number | null>(null)

  useEffect(() => {
    const fetchSummaryData = async () => {
      if (!selectedCompany?.id) return

      try {
        const [financialRes, quoteRes, predictionRes] = await Promise.all([
          fetch(`/api/financial-statements/view?company_id=${selectedCompany.id}&page=1&limit=1`),
          fetch(`/api/stock-quotes?company_id=${selectedCompany.id}&page=1&limit=1`),
          fetch(`/api/stock-predictions?company_id=${selectedCompany.id}`),
        ])

        let nextFinancial: view_financial_statements | null = null
        let nextClosePrice: number | null = null
        let nextDividendYield: number | null = null

        if (financialRes.ok) {
          const financialResult = await financialRes.json()
          nextFinancial = financialResult?.data?.[0] || null
        }

        if (quoteRes.ok) {
          const quoteResult = await quoteRes.json()
          const closePrice = Number(quoteResult?.data?.[0]?.qfq_close_price)
          nextClosePrice = Number.isFinite(closePrice) ? closePrice : null
        }

        if (predictionRes.ok) {
          const predictionResult = await predictionRes.json()
          const predictions = Array.isArray(predictionResult?.data) ? predictionResult.data : []
          const latestPrediction = [...predictions]
            .reverse()
            .find((item) => Number.isFinite(Number(item?.parent_netprofit)) && Number.isFinite(Number(item?.dividend_payout_ratio)))

          const totalShares = Number(nextFinancial?.total_shares)
          const marketValue = Number(nextClosePrice) * totalShares

          if (
            latestPrediction
            && Number.isFinite(marketValue)
            && marketValue > 0
          ) {
            nextDividendYield = (Number(latestPrediction.parent_netprofit) * (Number(latestPrediction.dividend_payout_ratio) / 100)) / marketValue
          }
        }

        setLatestFinancial(nextFinancial)
        setLatestClosePrice(nextClosePrice)
        setLatestDividendYield(nextDividendYield)
      } catch (error) {
        console.error('获取公司摘要数据失败:', error)
      }
    }

    fetchSummaryData()
  }, [selectedCompany])

  const summaryItems = useMemo(() => {
    const totalShares = Number(latestFinancial?.total_shares)
    const marketCap = Number(latestClosePrice) * totalShares

    const netcashOperateTtm = Number(latestFinancial?.netcash_operate_ttm)
    const parentNetprofitTtm = Number(latestFinancial?.parent_netprofit_ttm)
    const cashflowRatioTtm =
      Number.isFinite(netcashOperateTtm) && Number.isFinite(parentNetprofitTtm) && parentNetprofitTtm !== 0
        ? netcashOperateTtm / parentNetprofitTtm
        : null

    const operateIncomeTtm = Number(latestFinancial?.operate_income_ttm)
    const operateCostTtm = Number(latestFinancial?.operate_cost_ttm)
    const grossProfitMarginTtm =
      Number.isFinite(operateIncomeTtm) && Number.isFinite(operateCostTtm) && operateIncomeTtm !== 0
        ? (operateIncomeTtm - operateCostTtm) / operateIncomeTtm
        : null

    const netprofitTtm = Number(latestFinancial?.netprofit_ttm)
    const netProfitMarginTtm =
      Number.isFinite(operateIncomeTtm) && Number.isFinite(netprofitTtm) && operateIncomeTtm !== 0
        ? netprofitTtm / operateIncomeTtm
        : null

    const formatPercent = (value: number | null) => {
      if (!Number.isFinite(Number(value))) return '--'
      return `${(Number(value) * 100).toFixed(2)}%`
    }

    return [
      {
        label: '最新市值',
        value: Number.isFinite(marketCap) ? formatNumber(marketCap) : '--',
      },
      {
        label: '最新现金流量比率',
        value: Number.isFinite(Number(cashflowRatioTtm)) ? Number(cashflowRatioTtm).toFixed(2) : '--',
      },
      {
        label: '最新毛利率',
        value: formatPercent(grossProfitMarginTtm),
      },
      {
        label: '最新净利率',
        value: formatPercent(netProfitMarginTtm),
      },
      {
        label: '预测最近股息率',
        value: formatPercent(latestDividendYield),
      },
    ]
  }, [latestFinancial, latestClosePrice, latestDividendYield])

  return (
    <Panel
      title={`${selectedCompany.company_name} - ${selectedCompany.company_code}`}
      headerAction={
        <Button
          look={isSunk ? 'cancel' : 'danger'}
          size="small"
          onClick={() => onToggleSink(selectedCompany.id)}
        >
          {isSunk ? 'UnSink' : 'Sink'}
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {summaryItems.map((item) => (
          <div key={item.label} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
            <div className="text-xs text-slate-500">{item.label}</div>
            <div className="text-sm font-semibold text-slate-800 mt-1">{item.value}</div>
          </div>
        ))}
      </div>
    </Panel>
  )
}
