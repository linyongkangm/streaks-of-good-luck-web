import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const boardId = parseInt((await params).id)
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // 获取板块下的公司
    const boardCompanies = await prisma.relation__stock_board_company.findMany({
      where: { board_id: boardId },
      include: {
        info__stock_company: true,
      },
      orderBy: { weight: 'desc' },
    })

    if (boardCompanies.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const companyIds = boardCompanies.map((bc) => bc.company_id)

    // 构建日期过滤条件
    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    // 获取行情数据
    const quotes = await prisma.quote__stock_constituent_daily.findMany({
      where: {
        company_id: { in: companyIds },
        ...(Object.keys(dateFilter).length > 0 && { trade_date: dateFilter }),
      },
      orderBy: { trade_date: 'asc' },
    })

    // 获取财务数据
    const financials = await prisma.view_financial_statements.findMany({
      where: {
        company_id: { in: companyIds },
      },
      orderBy: { report_date: 'asc' },
    })

    // 合并数据并计算估值指标
    const result = quotes.map((quote) => {
      const company = boardCompanies.find((bc) => bc.company_id === quote.company_id)
      // 查找最近的财务数据（报告日期 <= 交易日期）
      const financial = financials
        .filter(
          (f) =>
            f.company_id === quote.company_id &&
            f.report_date !== null &&
            quote.trade_date !== null &&
            new Date(f.report_date) <= new Date(quote.trade_date)
        )
        .sort((a, b) => new Date(b.report_date!).getTime() - new Date(a.report_date!).getTime())[0]

      if (!financial) {
        return null
      }

      // 计算加权平均股本
      const weightedAvgShares = Number(financial.weighted_average_shares);

      // 计算估值指标
      const calculateValuation = (closePrice: number) => {
        if (!weightedAvgShares) return {}

        const basicEpsTtm = Number(financial.basic_eps_ttm)
        const totalParentEquity = Number(financial.total_parent_equity) // 归母权益
        const operateIncomeTtm = Number(financial.operate_income_ttm) // 营业收入TTM
        const netcashOperateTtm = Number(financial.netcash_operate_ttm) // 经营活动产生的现金流量净额TTM

        return {
          pe: basicEpsTtm !== 0 ? closePrice / basicEpsTtm : null,
          pb:
            totalParentEquity !== 0
              ? closePrice / (totalParentEquity / weightedAvgShares)
              : null,
          ps:
            operateIncomeTtm !== 0
              ? closePrice / (operateIncomeTtm / weightedAvgShares)
              : null,
          pc:
            netcashOperateTtm !== 0
              ? closePrice / (netcashOperateTtm / weightedAvgShares)
              : null,
        }
      }

      return {
        trade_date: quote.trade_date,
        company_id: quote.company_id,
        company_code: company?.info__stock_company.company_code,
        company_name: company?.info__stock_company.company_name,
        weighted_average_shares: weightedAvgShares,
        basic_eps_ttm: Number(financial.basic_eps_ttm),
        total_parent_equity: Number(financial.total_parent_equity),
        operate_income_ttm: Number(financial.operate_income_ttm),
        netcash_operate_ttm: Number(financial.netcash_operate_ttm),
        none_close_price: Number(quote.none_close_price),
        qfq_close_price: Number(quote.qfq_close_price),
        hfq_close_price: Number(quote.hfq_close_price),
        none_valuation: calculateValuation(Number(quote.none_close_price)),
        qfq_valuation: calculateValuation(Number(quote.qfq_close_price)),
        hfq_valuation: calculateValuation(Number(quote.hfq_close_price)),
      }
    }).filter(Boolean)
    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('获取估值数据失败:', error)
    return NextResponse.json({ error: '获取估值数据失败' }, { status: 500 })
  }
}
