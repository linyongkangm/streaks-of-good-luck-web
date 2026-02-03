'use client'

import { useState, useEffect } from 'react'
import type { info__stock_company } from '@/types'
import SecuritiesMetadataCompanies from './SecuritiesMetadataCompanies'
import SecuritiesMetadataQuotes from './SecuritiesMetadataQuotes'
import SecuritiesMetadataBalanceSheet from './SecuritiesMetadataBalanceSheet'
import SecuritiesMetadataProfitSheet from './SecuritiesMetadataProfitSheet'
import SecuritiesMetadataCashFlowSheet from './SecuritiesMetadataCashFlowSheet'
import SecuritiesMetadataFinancialView from './SecuritiesMetadataFinancialView'

export default function SecuritiesMetadata() {
  const [selectedCompany, setSelectedCompany] = useState<info__stock_company | null>(null)

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          📊 证券元数据管理
        </h2>
        <SecuritiesMetadataCompanies 
          selectedCompany={selectedCompany}
          onSelectCompany={setSelectedCompany}
        />
      </div>
      
      {selectedCompany && (
        <>
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              📈 历史行情数据
            </h2>
            <SecuritiesMetadataQuotes 
              selectedCompany={selectedCompany}
            />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <SecuritiesMetadataFinancialView selectedCompany={selectedCompany} />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <SecuritiesMetadataBalanceSheet selectedCompany={selectedCompany} />
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <SecuritiesMetadataProfitSheet selectedCompany={selectedCompany} />
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <SecuritiesMetadataCashFlowSheet selectedCompany={selectedCompany} />
            </div>
          </div>
        </>
      )}

    </div>
  )
}