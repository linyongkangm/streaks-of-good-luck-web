import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface ValuationSummaryItem {
  company_id: number
  company_code: string
  company_name: string
  latest_trade_date: Date | null
  qfq_close_price: number | null
  pe: number | null
  pe_percentile_3y: number | null
  pb: number | null
  pb_percentile_3y: number | null
}

const QUANTILE_LEVELS = [0.1, 0.3, 0.5, 0.7, 0.9]

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const calculateValuation = (
  closePrice: number | null,
  totalShares: number | null,
  parentNetprofitTtm: number | null,
  totalParentEquity: number | null,
) => {
  if (!closePrice || !totalShares) {
    return { pe: null, pb: null }
  }

  return {
    pe: parentNetprofitTtm && parentNetprofitTtm !== 0 ? closePrice / (parentNetprofitTtm / totalShares) : null,
    pb: totalParentEquity && totalParentEquity !== 0 ? closePrice / (totalParentEquity / totalShares) : null,
  }
}

const calculateQuantiles = (values: number[], quantiles: number[]) => {
  const sorted = values.filter((v) => v !== null && !Number.isNaN(v)).sort((a, b) => a - b)
  if (sorted.length === 0) return quantiles.map(() => null)

  return quantiles.map((q) => {
    const index = (sorted.length - 1) * q
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index - lower

    if (lower === upper) return sorted[lower]
    return sorted[lower] * (1 - weight) + sorted[upper] * weight
  })
}

const calculatePercentile = (values: number[], target: number | null): number | null => {
  if (target === null) return null

  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (sorted.length === 0) return null

  let lessCount = 0
  let equalCount = 0

  sorted.forEach((value) => {
    if (value < target) {
      lessCount += 1
      return
    }
    if (value === target) {
      equalCount += 1
    }
  })

  return ((lessCount + 0.5 * equalCount) / sorted.length) * 100
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const rawCompanyIds: unknown[] = Array.isArray((body as { company_ids?: unknown[] })?.company_ids)
      ? ((body as { company_ids: unknown[] }).company_ids)
      : []
    const companyIds: number[] = Array.from(
      new Set(
        rawCompanyIds
          .map((id) => Number(id))
          .filter((id): id is number => Number.isInteger(id) && id > 0),
      ),
    )

    if (companyIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const endDate = new Date()
    const startDate = new Date(endDate)
    startDate.setFullYear(startDate.getFullYear() - 3)

    const [companies, quotes, financials] = await Promise.all([
      prisma.info__stock_company.findMany({
        where: { id: { in: companyIds } },
        select: {
          id: true,
          company_code: true,
          company_name: true,
        },
      }),
      prisma.quote__stock_constituent_daily.findMany({
        where: {
          company_id: { in: companyIds },
          trade_date: { gte: startDate, lte: endDate },
        },
        select: {
          company_id: true,
          trade_date: true,
          qfq_close_price: true,
        },
        orderBy: [{ company_id: 'asc' }, { trade_date: 'asc' }],
      }),
      prisma.view_financial_statements.findMany({
        where: {
          company_id: { in: companyIds },
        },
        select: {
          company_id: true,
          report_date: true,
          total_shares: true,
          parent_netprofit_ttm: true,
          total_parent_equity: true,
        },
        orderBy: [{ company_id: 'asc' }, { report_date: 'asc' }],
      }),
    ])

    const companyMap = new Map(companies.map((company) => [company.id, company]))

    const quotesByCompany = new Map<number, typeof quotes>()
    quotes.forEach((quote) => {
      const list = quotesByCompany.get(quote.company_id) || []
      list.push(quote)
      quotesByCompany.set(quote.company_id, list)
    })

    const financialsByCompany = new Map<number, typeof financials>()
    financials.forEach((financial) => {
      const companyId = financial.company_id
      if (!companyId) return
      const list = financialsByCompany.get(companyId) || []
      list.push(financial)
      financialsByCompany.set(companyId, list)
    })

    const summaries: ValuationSummaryItem[] = companyIds.map((companyId) => {
      const company = companyMap.get(companyId)
      const quoteList = quotesByCompany.get(companyId) || []
      const financialList = financialsByCompany.get(companyId) || []

      if (!company || quoteList.length === 0 || financialList.length === 0) {
        return {
          company_id: companyId,
          company_code: company?.company_code || '',
          company_name: company?.company_name || '',
          latest_trade_date: null,
          qfq_close_price: null,
          pe: null,
          pe_percentile_3y: null,
          pb: null,
          pb_percentile_3y: null,
        }
      }

      let financialIndex = 0
      const peValues: number[] = []
      const pbValues: number[] = []
      let latestTradeDate: Date | null = null
      let latestClosePrice: number | null = null
      let latestPe: number | null = null
      let latestPb: number | null = null

      quoteList.forEach((quote) => {
        while (
          financialIndex + 1 < financialList.length
          && financialList[financialIndex + 1].report_date
          && quote.trade_date
          && new Date(financialList[financialIndex + 1].report_date as Date) <= new Date(quote.trade_date)
        ) {
          financialIndex += 1
        }

        const currentFinancial = financialList[financialIndex]
        if (!currentFinancial?.report_date || !quote.trade_date) return
        if (new Date(currentFinancial.report_date as Date) > new Date(quote.trade_date)) return

        const valuation = calculateValuation(
          toNumber(quote.qfq_close_price),
          toNumber(currentFinancial.total_shares),
          toNumber(currentFinancial.parent_netprofit_ttm),
          toNumber(currentFinancial.total_parent_equity),
        )

        if (valuation.pe !== null && Number.isFinite(valuation.pe)) {
          peValues.push(valuation.pe)
          latestPe = valuation.pe
        }

        if (valuation.pb !== null && Number.isFinite(valuation.pb)) {
          pbValues.push(valuation.pb)
          latestPb = valuation.pb
        }

        latestTradeDate = quote.trade_date
        latestClosePrice = toNumber(quote.qfq_close_price)
      })

      return {
        company_id: company.id,
        company_code: company.company_code,
        company_name: company.company_name,
        latest_trade_date: latestTradeDate,
        qfq_close_price: latestClosePrice,
        pe: latestPe,
        pe_percentile_3y: calculatePercentile(peValues, latestPe),
        pb: latestPb,
        pb_percentile_3y: calculatePercentile(pbValues, latestPb),
      }
    })

    return NextResponse.json({ data: summaries })
  } catch (error) {
    console.error('获取估值摘要失败:', error)
    return NextResponse.json({ error: '获取估值摘要失败' }, { status: 500 })
  }
}
