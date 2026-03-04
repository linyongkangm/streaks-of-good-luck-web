'use client'

import { useEffect, useMemo, useState } from 'react'
import type { info__stock_company, info__industry } from '@/types'
import type { view_financial_statements } from '@/types'
import Panel from '@/app/widget/Panel'
import Button from '@/app/widget/Button'
import { formatNumber } from '@/app/tools'
import Modal from '@/app/widget/Modal'
import Select from '@/app/widget/Select'

interface CompanyIndustry {
  id: number
  company_id: number
  industry_id: number
  weight: number
  info__industry: info__industry
}

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
  const [companyIndustries, setCompanyIndustries] = useState<CompanyIndustry[]>([])
  const [allIndustries, setAllIndustries] = useState<info__industry[]>([])
  const [showAddIndustryModal, setShowAddIndustryModal] = useState(false)
  const [selectedIndustryId, setSelectedIndustryId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchSummaryData = async () => {
      if (!selectedCompany?.id) return

      try {
        const [financialRes, quoteRes, predictionRes, industriesRes] = await Promise.all([
          fetch(`/api/financial-statements/view?company_id=${selectedCompany.id}&page=1&limit=1`),
          fetch(`/api/stock-quotes?company_id=${selectedCompany.id}&page=1&limit=1`),
          fetch(`/api/stock-predictions?company_id=${selectedCompany.id}`),
          fetch(`/api/company-industries?company_id=${selectedCompany.id}`),
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

        if (industriesRes.ok) {
          const industriesResult = await industriesRes.json()
          setCompanyIndustries(industriesResult?.data || [])
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

  useEffect(() => {
    const fetchAllIndustries = async () => {
      try {
        const res = await fetch('/api/industries')
        if (res.ok) {
          const result = await res.json()
          setAllIndustries(result?.data || [])
        }
      } catch (error) {
        console.error('获取行业列表失败:', error)
      }
    }

    fetchAllIndustries()
  }, [])

  const handleAddIndustry = async () => {
    if (!selectedIndustryId) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/company-industries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          industry_id: selectedIndustryId,
          weight: 0,
        }),
      })

      if (res.ok) {
        const result = await res.json()
        setCompanyIndustries([...companyIndustries, result.data])
        setShowAddIndustryModal(false)
        setSelectedIndustryId(null)
      } else {
        alert('添加行业失败')
      }
    } catch (error) {
      console.error('添加行业失败:', error)
      alert('添加行业失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveIndustry = async (relationId: number) => {
    if (!confirm('确认删除该行业关联吗？')) return

    try {
      const res = await fetch(`/api/company-industries/${relationId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setCompanyIndustries(companyIndustries.filter(item => item.id !== relationId))
      } else {
        alert('删除行业失败')
      }
    } catch (error) {
      console.error('删除行业失败:', error)
      alert('删除行业失败')
    }
  }

  const availableIndustries = useMemo(() => {
    const existingIndustryIds = new Set(companyIndustries.map(ci => ci.industry_id))
    return allIndustries.filter(industry => !existingIndustryIds.has(industry.id))
  }, [allIndustries, companyIndustries])

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
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-slate-700">行业列表</div>
          <Button 
            size="small" 
            onClick={() => setShowAddIndustryModal(true)}
            disabled={availableIndustries.length === 0}
          >
            添加行业
          </Button>
        </div>
        {companyIndustries.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {companyIndustries.map((ci) => (
              <div
                key={ci.id}
                className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm border border-blue-200"
              >
                <span>{ci.info__industry.name}</span>
                <button
                  onClick={() => handleRemoveIndustry(ci.id)}
                  className="text-blue-500 hover:text-blue-700 font-bold"
                  title="删除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400">暂无关联行业</div>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {summaryItems.map((item) => (
          <div key={item.label} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
            <div className="text-xs text-slate-500">{item.label}</div>
            <div className="text-sm font-semibold text-slate-800 mt-1">{item.value}</div>
          </div>
        ))}
      </div>

      <Modal
        title="添加行业"
        open={showAddIndustryModal}
        onClose={() => {
          setShowAddIndustryModal(false)
          setSelectedIndustryId(null)
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              选择行业
            </label>
            <Select
              value={selectedIndustryId?.toString() || ''}
              onChange={(val) => setSelectedIndustryId(val ? Number(val) : null)}
              options={availableIndustries.map(industry => ({
                value: industry.id.toString(),
                label: industry.name,
              }))}
              placeholder="请选择行业"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              look="cancel"
              onClick={() => {
                setShowAddIndustryModal(false)
                setSelectedIndustryId(null)
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleAddIndustry}
              disabled={!selectedIndustryId || isLoading}
            >
              {isLoading ? '添加中...' : '确定'}
            </Button>
          </div>
        </div>
      </Modal>
    </Panel>
  )
}
