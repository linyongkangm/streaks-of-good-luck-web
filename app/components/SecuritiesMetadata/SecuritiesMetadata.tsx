'use client'

import { useState } from 'react'
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
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <SecuritiesMetadataCompanies
        selectedCompany={selectedCompany}
        onSelectCompany={setSelectedCompany}
      />

      {selectedCompany && (
        <div className="space-y-6">
          <SecuritiesMetadataQuotes
            selectedCompany={selectedCompany}
          />
          <SecuritiesMetadataFinancialView selectedCompany={selectedCompany} />
          <SecuritiesMetadataBalanceSheet selectedCompany={selectedCompany} />
          <SecuritiesMetadataProfitSheet selectedCompany={selectedCompany} />
          <SecuritiesMetadataCashFlowSheet selectedCompany={selectedCompany} />
        </div>
      )}

    </div>
  )
}