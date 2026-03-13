import { fetchAndSaveFinancialStatements } from '../financial-statements/financial-data-utils'
import { fetchAndSaveQuoteData } from '../stock-quotes/quote-data-utils'

interface CompanyForInitialSync {
  id: number
  company_code: string
  company_akshare_code: string
  ipo_date: Date | null
}

export interface InitialCompanySyncResult {
  success: boolean
  financials: {
    counts: {
      balanceSheet: number
      profitSheet: number
      cashFlowSheet: number
    }
    error?: string
  }
  quotes: {
    count: number
    startDate: string
    endDate: string
    error?: string
  }
}

export async function runInitialCompanySync(company: CompanyForInitialSync): Promise<InitialCompanySyncResult> {
  const endDate = new Date()
  endDate.setHours(0, 0, 0, 0)

  const startDate = company.ipo_date ? new Date(company.ipo_date) : new Date(endDate)
  if (!company.ipo_date) {
    startDate.setDate(startDate.getDate() - 30)
  }
  startDate.setHours(0, 0, 0, 0)

  const startDateStr = formatDate(startDate)
  const endDateStr = formatDate(endDate)

  const [financialResult, quoteResult] = await Promise.allSettled([
    fetchAndSaveFinancialStatements(company.id),
    fetchAndSaveQuoteData(
      company.id,
      company.company_code,
      company.company_akshare_code,
      startDateStr,
      endDateStr
    ),
  ])

  const financialCounts = financialResult.status === 'fulfilled'
    ? financialResult.value
    : { balanceSheet: 0, profitSheet: 0, cashFlowSheet: 0 }
  const quoteCount = quoteResult.status === 'fulfilled' ? quoteResult.value : 0

  return {
    success: financialResult.status === 'fulfilled' && quoteResult.status === 'fulfilled',
    financials: {
      counts: financialCounts,
      error: financialResult.status === 'rejected' ? financialResult.reason instanceof Error ? financialResult.reason.message : '财报同步失败' : undefined,
    },
    quotes: {
      count: quoteCount,
      startDate: startDateStr,
      endDate: endDateStr,
      error: quoteResult.status === 'rejected' ? quoteResult.reason instanceof Error ? quoteResult.reason.message : '行情同步失败' : undefined,
    },
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}