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

      // 总股本
      const total_shares = Number(financial.total_shares);
      const parentNetprofitTtm = Number(financial.parent_netprofit_ttm) // 归母净利润TTM
      const totalParentEquity = Number(financial.total_parent_equity) // 归母权益
      const operateIncomeTtm = Number(financial.operate_income_ttm) // 营业收入TTM
      const netcashOperateTtm = Number(financial.netcash_operate_ttm) // 经营活动产生的现金流量净额TTM
      // 计算估值指标
      const calculateValuation = (closePrice: number) => {
        if (!total_shares) return {}



        return {
          pe: parentNetprofitTtm !== 0 ? closePrice / (parentNetprofitTtm / total_shares) : null,
          pb: totalParentEquity !== 0 ? closePrice / (totalParentEquity / total_shares) : null,
          ps: operateIncomeTtm !== 0 ? closePrice / (operateIncomeTtm / total_shares) : null,
          pc: netcashOperateTtm !== 0 ? closePrice / (netcashOperateTtm / total_shares) : null,
        }
      }

      return {
        trade_date: quote.trade_date,
        company_id: quote.company_id,
        company_code: company?.info__stock_company.company_code,
        company_name: company?.info__stock_company.company_name,
        weight: company?.weight,
        total_shares: total_shares,
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

    // 计算板块整体加权数据
    const calculateBoardWeightedData = () => {
      // 按交易日分组
      const dateMap = new Map<string, any[]>()
      result.forEach(item => {
        if (!item) return
        const dateKey = item.trade_date.toISOString()
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, [])
        }
        dateMap.get(dateKey)!.push(item)
      })

      // 计算每个交易日的板块整体数据
      const boardData = Array.from(dateMap.entries()).map(([dateKey, items]) => {
        const trade_date = new Date(dateKey)

        // 先计算加权财务数据
        let weightedTotalShares = 0
        let weightedParentNetprofit = 0
        let weightedTotalParentEquity = 0
        let weightedOperateIncome = 0
        let weightedNetcashOperate = 0
        let totalWeight = 0

        items.forEach(item => {
          const weight = Number(item.weight) || 0
          weightedTotalShares += item.total_shares * weight
          weightedParentNetprofit += item.parent_netprofit_ttm * weight
          weightedTotalParentEquity += item.total_parent_equity * weight
          weightedOperateIncome += item.operate_income_ttm * weight
          weightedNetcashOperate += item.netcash_operate_ttm * weight
          totalWeight += weight
        })

        // 计算加权估值指标和加权股价
        const calculateBoardValuation = (adjustType: 'none' | 'qfq' | 'hfq') => {
          let totalMarketCap = 0 // 总市值
          items.forEach(item => {
            const itemWeight = Number(item.weight) || 0
            const closePrice = item[`${adjustType}_close_price`]
            const totalShares = item.total_shares
            // 市值 = 股价 * 总股本 * 权重
            if (closePrice && totalShares) {
              totalMarketCap += closePrice * totalShares * itemWeight
            }
          })
          return {
            close_price: weightedTotalShares !== 0 ? totalMarketCap / weightedTotalShares : null,
            pe: weightedParentNetprofit !== 0 ? totalMarketCap / weightedParentNetprofit : null,
            pb: weightedTotalParentEquity !== 0 ? totalMarketCap / weightedTotalParentEquity : null,
            ps: weightedOperateIncome !== 0 ? totalMarketCap / weightedOperateIncome : null,
            pc: weightedNetcashOperate !== 0 ? totalMarketCap / weightedNetcashOperate : null,
          }
        }

        const noneData = calculateBoardValuation('none')
        const qfqData = calculateBoardValuation('qfq')
        const hfqData = calculateBoardValuation('hfq')

        return {
          trade_date,
          total_shares: weightedTotalShares,
          parent_netprofit_ttm: weightedParentNetprofit,
          total_parent_equity: weightedTotalParentEquity,
          operate_income_ttm: weightedOperateIncome,
          netcash_operate_ttm: weightedNetcashOperate,
          none_close_price: noneData.close_price,
          qfq_close_price: qfqData.close_price,
          hfq_close_price: hfqData.close_price,
          none_valuation: {
            pe: noneData.pe,
            pb: noneData.pb,
            ps: noneData.ps,
            pc: noneData.pc,
          },
          qfq_valuation: {
            pe: qfqData.pe,
            pb: qfqData.pb,
            ps: qfqData.ps,
            pc: qfqData.pc,
          },
          hfq_valuation: {
            pe: hfqData.pe,
            pb: hfqData.pb,
            ps: hfqData.ps,
            pc: hfqData.pc,
          },
        }
      }).sort((a, b) => a.trade_date.getTime() - b.trade_date.getTime())

      return boardData
    }

    const boardData = calculateBoardWeightedData()

    // 计算分位数的通用函数
    const processResultWithQuantiles = (dataList: any[]) => {
      // 计算分位数价格
      const calculateQuantiles = (values: number[], quantiles: number[]) => {
        const sorted = values.filter(v => v !== null && !isNaN(v)).sort((a, b) => a - b)
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

      // 为每种估值指标计算分位数
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

      // 为每个交易日添加分位数对应的价格
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

            // 根据财务指标计算每个分位数对应的价格
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

            quantilePrices[adjustType][metric] = {
              p10: quantiles[0] !== null && baseValue !== 0 ? quantiles[0] * baseValue : null,
              p30: quantiles[1] !== null && baseValue !== 0 ? quantiles[1] * baseValue : null,
              p50: quantiles[2] !== null && baseValue !== 0 ? quantiles[2] * baseValue : null,
              p70: quantiles[3] !== null && baseValue !== 0 ? quantiles[3] * baseValue : null,
              p90: quantiles[4] !== null && baseValue !== 0 ? quantiles[4] * baseValue : null,
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
        quantileData
      }
    }

    // 组装返回数据
    const responseData: Record<string, any> = {
      all: processResultWithQuantiles(boardData),
    }


    // 按公司分组数据
    const dataByCompany: Record<number, any[]> = {}
    result.forEach(item => {
      if (!item) return
      if (!dataByCompany[item.company_id]) {
        dataByCompany[item.company_id] = []
      }
      dataByCompany[item.company_id].push(item)
    })
    // 为每个公司计算分位数
    Object.keys(dataByCompany).forEach(companyIdStr => {
      const companyId = parseInt(companyIdStr)
      responseData[companyId] = processResultWithQuantiles(dataByCompany[companyId])
    })

    return NextResponse.json({ data: responseData })
  } catch (error) {
    console.error('获取估值数据失败:', error)
    return NextResponse.json({ error: '获取估值数据失败' }, { status: 500 })
  }
}
