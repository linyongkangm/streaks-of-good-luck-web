import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import * as stools from '@/app/tools/stools'

// POST /api/stock-quotes/sync - 同步所有公司的行情数据
export async function POST(req: NextRequest) {
  try {
    // 获取所有公司
    const companies = await prisma.info__stock_company.findMany({
      select: {
        id: true,
        company_code: true,
        company_name: true,
      },
    })

    if (companies.length === 0) {
      return NextResponse.json({ message: '没有找到公司数据', data: [] })
    }

    // 获取今天的日期
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = formatDate(today)

    // 查询每个公司的最新行情日期并同步数据
    const syncResults = []
    let successCount = 0
    let failCount = 0

    for (const company of companies) {
      const latestQuote = await prisma.quote__stock_constituent_daily.findFirst({
        where: { company_id: company.id },
        orderBy: { trade_date: 'desc' },
        select: { trade_date: true },
      })

      const latestDate = latestQuote?.trade_date
      const needsSync = !latestDate || new Date(latestDate).getTime() < today.getTime()

      if (needsSync) {
        // 计算同步起始日期（最新日期的下一天，如果没有数据则从30天前开始）
        let startDate: Date
        if (latestDate) {
          startDate = new Date(latestDate)
          startDate.setDate(startDate.getDate() + 1)
        } else {
          startDate = new Date(today)
          startDate.setDate(startDate.getDate() - 30) // 没有数据时，获取最近30天
        }

        const startDateStr = formatDate(startDate)

        try {
          console.log(`正在同步 ${company.company_name} (${company.company_code}) 从 ${startDateStr} 到 ${todayStr}`)
          
          // 获取并保存数据
          const savedCount = await fetchAndSaveQuoteData(company.id, company.company_code, startDateStr, todayStr)
          
          syncResults.push({
            company_id: company.id,
            company_code: company.company_code,
            company_name: company.company_name,
            latest_date: latestDate,
            sync_start_date: startDateStr,
            sync_end_date: todayStr,
            saved_count: savedCount,
            success: true,
          })
          successCount++
        } catch (error) {
          console.error(`同步 ${company.company_name} 失败:`, error)
          syncResults.push({
            company_id: company.id,
            company_code: company.company_code,
            company_name: company.company_name,
            latest_date: latestDate,
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false,
          })
          failCount++
        }
      } else {
        syncResults.push({
          company_id: company.id,
          company_code: company.company_code,
          company_name: company.company_name,
          latest_date: latestDate,
          skipped: true,
          message: '数据已是最新',
        })
      }
    }

    return NextResponse.json({
      message: `同步完成: 成功 ${successCount} 家, 失败 ${failCount} 家`,
      data: {
        total_companies: companies.length,
        success_count: successCount,
        fail_count: failCount,
        results: syncResults,
      },
    })
  } catch (error) {
    console.error('同步行情数据失败:', error)
    return NextResponse.json(
      { error: '同步行情数据失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET /api/stock-quotes/sync - 查询同步状态
export async function GET(req: NextRequest) {
  try {
    // 获取所有公司数量
    const totalCompanies = await prisma.info__stock_company.count()

    // 获取今天的日期
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 获取所有公司的最新行情日期
    const companies = await prisma.info__stock_company.findMany({
      select: {
        id: true,
        company_code: true,
        company_name: true,
      },
    })

    const syncStatus = await Promise.all(
      companies.map(async (company) => {
        const latestQuote = await prisma.quote__stock_constituent_daily.findFirst({
          where: { company_id: company.id },
          orderBy: { trade_date: 'desc' },
          select: { trade_date: true },
        })

        return {
          company_id: company.id,
          company_code: company.company_code,
          company_name: company.company_name,
          latest_date: latestQuote?.trade_date,
          is_synced: latestQuote?.trade_date && new Date(latestQuote.trade_date).getTime() >= today.getTime(),
        }
      })
    )

    const syncedCount = syncStatus.filter((s) => s.is_synced).length
    const needsSyncCount = totalCompanies - syncedCount

    return NextResponse.json({
      data: {
        total_companies: totalCompanies,
        synced_companies: syncedCount,
        companies_needing_sync: needsSyncCount,
        sync_status: syncStatus,
      },
    })
  } catch (error) {
    console.error('查询同步状态失败:', error)
    return NextResponse.json(
      { error: '查询同步状态失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// 辅助函数：格式化日期为 YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 获取并保存行情数据
async function fetchAndSaveQuoteData(
  companyId: number,
  companyCode: string,
  startDate: string,
  endDate: string
): Promise<number> {
  // 分别获取三种复权方式的数据
  const [noneData, qfqData, hfqData] = await Promise.all([
    fetchQuoteData(companyCode, startDate, endDate, ''), // 不复权
    fetchQuoteData(companyCode, startDate, endDate, 'qfq'), // 前复权
    fetchQuoteData(companyCode, startDate, endDate, 'hfq'), // 后复权
  ])

  if (!noneData || !qfqData || !hfqData) {
    throw new Error('获取行情数据失败')
  }

  // 合并数据并保存
  const mergedData = mergeQuoteData(noneData, qfqData, hfqData)
  const savedCount = await saveQuoteData(companyId, mergedData)

  return savedCount
}

// 获取指定复权方式的行情数据
async function fetchQuoteData(
  symbol: string,
  startDate: string,
  endDate: string,
  adjust: string
): Promise<any[] | null> {
  try {
    const params: any = {
      symbol,
      period: 'daily',
      start_date: startDate.replace(/-/g, ''),
      end_date: endDate.replace(/-/g, ''),
    }

    if (adjust) {
      params.adjust = adjust
    }

    const response = await stools.fetchWebIntellCallAKShare('stock_zh_a_hist', params)

    if (!response.ok) {
      console.error(`获取${adjust || 'none'}复权数据失败`)
      return null
    }

    const result = await response.json()
    return result.success ? result.data : null
  } catch (error) {
    console.error(`获取${adjust || 'none'}复权数据异常:`, error)
    return null
  }
}

// 合并三种复权数据
function mergeQuoteData(noneData: any[], qfqData: any[], hfqData: any[]): any[] {
  const dataMap = new Map()

  // 以日期为key，合并数据
  noneData.forEach((item) => {
    const date = item['日期']
    dataMap.set(date, {
      trade_date: date,
      volume: item['成交量'],
      turnover_rate: item['换手率'],
      price_range: item['振幅'],
      change_percent: item['涨跌幅'],
      none_open_price: item['开盘'],
      none_close_price: item['收盘'],
      none_high_price: item['最高'],
      none_low_price: item['最低'],
      none_turnover: item['成交额'],
      none_change_amt: item['涨跌额'],
    })
  })

  qfqData.forEach((item) => {
    const date = item['日期']
    if (dataMap.has(date)) {
      const existing = dataMap.get(date)
      existing.qfq_open_price = item['开盘']
      existing.qfq_close_price = item['收盘']
      existing.qfq_high_price = item['最高']
      existing.qfq_low_price = item['最低']
      existing.qfq_turnover = item['成交额']
      existing.qfq_change_amt = item['涨跌额']
    }
  })

  hfqData.forEach((item) => {
    const date = item['日期']
    if (dataMap.has(date)) {
      const existing = dataMap.get(date)
      existing.hfq_open_price = item['开盘']
      existing.hfq_close_price = item['收盘']
      existing.hfq_high_price = item['最高']
      existing.hfq_low_price = item['最低']
      existing.hfq_turnover = item['成交额']
      existing.hfq_change_amt = item['涨跌额']
    }
  })

  return Array.from(dataMap.values())
}

// 保存行情数据到数据库
async function saveQuoteData(companyId: number, data: any[]): Promise<number> {
  let count = 0

  for (const item of data) {
    try {
      await prisma.quote__stock_constituent_daily.upsert({
        where: {
          company_id_trade_date: {
            company_id: companyId,
            trade_date: new Date(item.trade_date),
          },
        },
        update: {
          volume: BigInt(item.volume || 0),
          turnover_rate: item.turnover_rate || 0,
          price_range: item.price_range || 0,
          change_percent: item.change_percent || 0,
          none_open_price: item.none_open_price || 0,
          none_close_price: item.none_close_price || 0,
          none_high_price: item.none_high_price || 0,
          none_low_price: item.none_low_price || 0,
          none_turnover: item.none_turnover || 0,
          none_change_amt: item.none_change_amt || 0,
          qfq_open_price: item.qfq_open_price || 0,
          qfq_close_price: item.qfq_close_price || 0,
          qfq_high_price: item.qfq_high_price || 0,
          qfq_low_price: item.qfq_low_price || 0,
          qfq_turnover: item.qfq_turnover || 0,
          qfq_change_amt: item.qfq_change_amt || 0,
          hfq_open_price: item.hfq_open_price || 0,
          hfq_close_price: item.hfq_close_price || 0,
          hfq_high_price: item.hfq_high_price || 0,
          hfq_low_price: item.hfq_low_price || 0,
          hfq_turnover: item.hfq_turnover || 0,
          hfq_change_amt: item.hfq_change_amt || 0,
        },
        create: {
          company_id: companyId,
          trade_date: new Date(item.trade_date),
          volume: BigInt(item.volume || 0),
          turnover_rate: item.turnover_rate || 0,
          price_range: item.price_range || 0,
          change_percent: item.change_percent || 0,
          none_open_price: item.none_open_price || 0,
          none_close_price: item.none_close_price || 0,
          none_high_price: item.none_high_price || 0,
          none_low_price: item.none_low_price || 0,
          none_turnover: item.none_turnover || 0,
          none_change_amt: item.none_change_amt || 0,
          qfq_open_price: item.qfq_open_price || 0,
          qfq_close_price: item.qfq_close_price || 0,
          qfq_high_price: item.qfq_high_price || 0,
          qfq_low_price: item.qfq_low_price || 0,
          qfq_turnover: item.qfq_turnover || 0,
          qfq_change_amt: item.qfq_change_amt || 0,
          hfq_open_price: item.hfq_open_price || 0,
          hfq_close_price: item.hfq_close_price || 0,
          hfq_high_price: item.hfq_high_price || 0,
          hfq_low_price: item.hfq_low_price || 0,
          hfq_turnover: item.hfq_turnover || 0,
          hfq_change_amt: item.hfq_change_amt || 0,
        },
      })
      count++
    } catch (error) {
      console.error(`保存行情数据失败 (${item.trade_date}):`, error)
    }
  }

  return count
}
