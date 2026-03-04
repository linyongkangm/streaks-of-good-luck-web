import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = parseInt((await params).id)
    if (isNaN(companyId)) {
      return NextResponse.json({ error: '无效的公司ID' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const company = await prisma.info__stock_company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        company_name: true,
        company_code: true,
      },
    })

    if (!company) {
      return NextResponse.json({ error: '公司不存在' }, { status: 404 })
    }

    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    const [quotes, financials] = await Promise.all([
      prisma.quote__stock_constituent_daily.findMany({
        where: {
          company_id: companyId,
          ...(Object.keys(dateFilter).length > 0 && { trade_date: dateFilter }),
        },
        orderBy: { trade_date: 'asc' },
      }),
      prisma.view_financial_statements.findMany({
        where: { company_id: companyId },
        orderBy: { report_date: 'asc' },
      }),
    ])

    const result = quotes.map((quote) => {
      const financial = financials
        .filter(
          (f) =>
            f.report_date !== null &&
            quote.trade_date !== null &&
            new Date(f.report_date) <= new Date(quote.trade_date)
        )
        .sort((a, b) => new Date(b.report_date!).getTime() - new Date(a.report_date!).getTime())[0]

      if (!financial) {
        return null
      }

      const totalShares = Number(financial.total_shares)
      const parentNetprofitTtm = Number(financial.parent_netprofit_ttm)
      const totalParentEquity = Number(financial.total_parent_equity)
      const operateIncomeTtm = Number(financial.operate_income_ttm)
      const netcashOperateTtm = Number(financial.netcash_operate_ttm)

      const calculateValuation = (closePrice: number) => {
        if (!totalShares) return {}

        return {
          pe: parentNetprofitTtm !== 0 ? closePrice / (parentNetprofitTtm / totalShares) : null,
          pb: totalParentEquity !== 0 ? closePrice / (totalParentEquity / totalShares) : null,
          ps: operateIncomeTtm !== 0 ? closePrice / (operateIncomeTtm / totalShares) : null,
          pc: netcashOperateTtm !== 0 ? closePrice / (netcashOperateTtm / totalShares) : null,
        }
      }

      return {
        trade_date: quote.trade_date,
        company_id: company.id,
        company_code: company.company_code,
        company_name: company.company_name,
        total_shares: totalShares,
        parent_netprofit_ttm: parentNetprofitTtm,
        total_parent_equity: totalParentEquity,
        operate_income_ttm: operateIncomeTtm,
        netcash_operate_ttm: netcashOperateTtm,
        none_close_price: Number(quote.none_close_price),
        qfq_close_price: Number(quote.qfq_close_price),
        hfq_close_price: Number(quote.hfq_close_price),
        none_valuation: calculateValuation(Number(quote.none_close_price)),
        qfq_valuation: calculateValuation(Number(quote.qfq_close_price)),
        hfq_valuation: calculateValuation(Number(quote.hfq_close_price)),
      }
    }).filter(Boolean)

    const processResultWithQuantiles = (dataList: any[]) => {
      const calculateQuantiles = (values: number[], quantiles: number[]) => {
        // 只保留正数进行分位数计算
        const sorted = values.filter(v => v !== null && !isNaN(v) && v > 0).sort((a, b) => a - b)
        if (sorted.length === 0) return quantiles.map(() => null)

        return quantiles.map(q => {
          const index = (sorted.length - 1) * q
          const lower = Math.floor(index)
          const upper = Math.ceil(index)
          const weight = index - lower

          if (lower === upper) return sorted[lower]
          return sorted[lower] * (1 - weight) + sorted[upper] * weight
        })
      }

      const quantileLevels = [0.1, 0.3, 0.5, 0.7, 0.9]
      const valuationTypes = ['pe', 'pb', 'ps', 'pc'] as const
      const adjustTypes = ['none', 'qfq', 'hfq'] as const
      const quantileData: Record<string, Record<string, number[]>> = {}

      adjustTypes.forEach(adjustType => {
        quantileData[adjustType] = {}
        valuationTypes.forEach(metric => {
          const allValues = dataList
            .map(r => r?.[`${adjustType}_valuation`]?.[metric])
            .filter(v => v !== null && v !== undefined && !isNaN(v)) as number[]

          quantileData[adjustType][metric] = calculateQuantiles(allValues, quantileLevels) as number[]
        })
      })

      const resultWithQuantiles = dataList.map(item => {
        if (!item) return null

        const quantilePrices: Record<string, Record<string, { p10: number | null; p30: number | null; p50: number | null; p70: number | null; p90: number | null }>> = {
          none: {},
          qfq: {},
          hfq: {},
        }

        adjustTypes.forEach(adjustType => {
          quantilePrices[adjustType] = {}

          valuationTypes.forEach(metric => {
            const quantiles = quantileData[adjustType][metric]

            let baseValue = 0
            if (item.total_shares) {
              if (metric === 'pe') {
                baseValue = item.total_shares ? item.parent_netprofit_ttm / item.total_shares : 0
              } else if (metric === 'pb') {
                baseValue = item.total_shares ? item.total_parent_equity / item.total_shares : 0
              } else if (metric === 'ps') {
                baseValue = item.total_shares ? item.operate_income_ttm / item.total_shares : 0
              } else if (metric === 'pc') {
                baseValue = item.total_shares ? item.netcash_operate_ttm / item.total_shares : 0
              }
            }

            // baseValue 为负数或零时，不计算分位价格
            quantilePrices[adjustType][metric] = {
              p10: quantiles[0] !== null && baseValue > 0 ? quantiles[0] * baseValue : null,
              p30: quantiles[1] !== null && baseValue > 0 ? quantiles[1] * baseValue : null,
              p50: quantiles[2] !== null && baseValue > 0 ? quantiles[2] * baseValue : null,
              p70: quantiles[3] !== null && baseValue > 0 ? quantiles[3] * baseValue : null,
              p90: quantiles[4] !== null && baseValue > 0 ? quantiles[4] * baseValue : null,
            }
          })
        })

        return {
          ...item,
          quantile_prices: quantilePrices,
        }
      })

      return {
        results: resultWithQuantiles,
        quantileData,
      }
    }

    return NextResponse.json({ data: processResultWithQuantiles(result) })
  } catch (error) {
    console.error('获取个股估值数据失败:', error)
    return NextResponse.json({ error: '获取个股估值数据失败' }, { status: 500 })
  }
}
