'use client'

import { useState, useEffect } from 'react'
import type {
  info__stock_company,
} from '@/types'
import IndustryAnalysisStockBoards from './IndustryAnalysisStockBoards'
import IndustryAnalysisLoading from './IndustryAnalysisLoading'
import Loading from '@/app/widget/Loading'
import IndustryAnalysisVisual from './IndustryAnalysisVisual'
import IndustryAnalysisPredictions from './IndustryAnalysisPredictions'

export default function IndustryAnalysis() {
  const [companies, setCompanies] = useState<info__stock_company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<info__stock_company | null>(null)
  const [loading, setLoading] = useState(true)

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
      <div className="col-span-3">
        <IndustryAnalysisStockBoards
          companies={companies}
          selectedCompany={selectedCompany}
          onSelectCompany={setSelectedCompany}
        ></IndustryAnalysisStockBoards>
      </div>

      {/* 右侧：详细信息 */}
      <div className="col-span-9">
        <IndustryAnalysisLoading selectedCompany={selectedCompany}>
          {
            selectedCompany && <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {selectedCompany.company_name}
                </h2>
                <div className="mt-2 text-slate-500">{selectedCompany.company_code}</div>
              </div>
              <IndustryAnalysisVisual selectedCompany={selectedCompany}></IndustryAnalysisVisual>
              <IndustryAnalysisPredictions selectedCompany={selectedCompany}></IndustryAnalysisPredictions>
            </div>
          }
        </IndustryAnalysisLoading>
      </div>
    </div>
  )
}
