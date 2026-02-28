'use client'

import { useState, useEffect } from 'react'
import type {
  info__stock_company,
} from '@/types'
import StockAnalysisStockList from './StockAnalysisStockList'
import StockAnalysisLoading from './StockAnalysisLoading'
import Loading from '@/app/widget/Loading'
import StockAnalysisVisual from './StockAnalysisVisual'
import StockAnalysisPredictions from './StockAnalysisPredictions'
import StockAnalysisFinancialViewChart from './StockAnalysisFinancialViewChart'
import Button from '@/app/widget/Button'
import Panel from '@/app/widget/Panel'

export default function StockAnalysis() {
  const [companies, setCompanies] = useState<info__stock_company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<info__stock_company | null>(null)
  const [loading, setLoading] = useState(true)
  const [sinkCompanyIds, setSinkCompanyIds] = useState<number[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('stockAnalysisSinkCompanyIds')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setSinkCompanyIds(parsed.filter((item) => Number.isInteger(item)))
      }
    } catch (error) {
      console.error('Failed to load sink companies from localStorage:', error)
    }
  }, [])

  const toggleSinkCompany = (companyId: number) => {
    setSinkCompanyIds((prev) => {
      const next = prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]

      try {
        localStorage.setItem('stockAnalysisSinkCompanyIds', JSON.stringify(next))
      } catch (error) {
        console.error('Failed to save sink companies to localStorage:', error)
      }

      return next
    })
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/stock-companies?limit=1000')
      const data = await response.json()
      setCompanies(data.data || [])
    } catch (error) {
      console.error('Failed to fetch companies:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loading></Loading>
  }

  return (
    <div className="grid grid-cols-12 gap-6 p-6 max-w-[1800px] mx-auto">
      {/* 左侧：个股列表 */}
      <div className="col-span-2">
        <StockAnalysisStockList
          companies={companies}
          selectedCompany={selectedCompany}
          sinkCompanyIds={sinkCompanyIds}
          onSelectCompany={setSelectedCompany}
        ></StockAnalysisStockList>
      </div>

      {/* 右侧：详细信息 */}
      <div className="col-span-10">
        <StockAnalysisLoading selectedCompany={selectedCompany}>
          {
            selectedCompany && <div className="space-y-6">
              <Panel
                title={`${selectedCompany.company_name} - ${selectedCompany.company_code}`}
                headerAction={
                  <Button
                    look={sinkCompanyIds.includes(selectedCompany.id) ? 'cancel' : 'danger'}
                    size="small"
                    onClick={() => toggleSinkCompany(selectedCompany.id)}
                  >
                    {sinkCompanyIds.includes(selectedCompany.id) ? 'UnSink' : 'Sink'}
                  </Button>
                }>
              </Panel>
              <StockAnalysisVisual selectedCompany={selectedCompany}></StockAnalysisVisual>
              <StockAnalysisPredictions selectedCompany={selectedCompany}></StockAnalysisPredictions>
              <StockAnalysisFinancialViewChart selectedCompany={selectedCompany}></StockAnalysisFinancialViewChart>
            </div>
          }
        </StockAnalysisLoading>
      </div>
    </div>
  )
}
