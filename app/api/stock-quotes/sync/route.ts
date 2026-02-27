import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchAndSaveQuoteData } from '../quote-data-utils'

// POST /api/stock-quotes/sync - 同步所有公司的行情数据
export async function POST(req: NextRequest) {
  try {
    // 获取所有公司
    const companies = await prisma.info__stock_company.findMany({
      select: {
        id: true,
        company_code: true,
        company_name: true,
        company_akshare_code: true,
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
          const savedCount = await fetchAndSaveQuoteData(company.id, company.company_code, company.company_akshare_code, startDateStr, todayStr)
          
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
