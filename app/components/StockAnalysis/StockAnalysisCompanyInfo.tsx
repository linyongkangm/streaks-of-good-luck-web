'use client'

import type { info__stock_company } from '@/types'
import Panel from '@/app/widget/Panel'
import Button from '@/app/widget/Button'

interface Props {
  selectedCompany: info__stock_company
  sinkCompanyIds: number[]
  onToggleSink: (companyId: number) => void
}

export default function StockAnalysisCompanyInfo({ selectedCompany, sinkCompanyIds, onToggleSink }: Props) {
  const isSunk = sinkCompanyIds.includes(selectedCompany.id)
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
    />
  )
}
