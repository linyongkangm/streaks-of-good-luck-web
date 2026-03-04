import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchWebIntellCallAKShare } from '@/app/tools/stools'

// POST /api/financial-statements/sync - 同步所有公司的财报数据
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

    // 同步结果统计
    const syncResults = []
    let successCount = 0
    let failCount = 0

    for (const company of companies) {
      try {
        console.log(`正在同步 ${company.company_name} (${company.company_code}) 的财报数据`)
        
        const symbol = company.company_akshare_code

        // 并行获取三种财报数据
        const [
          balanceSheetRes,
          profitSheetRes,
          cashFlowSheetRes,
        ] = await Promise.all([
          fetchWebIntellCallAKShare('stock_balance_sheet_by_report_em', { symbol }),
          fetchWebIntellCallAKShare('stock_profit_sheet_by_quarterly_em', { symbol }),
          fetchWebIntellCallAKShare('stock_cash_flow_sheet_by_quarterly_em', { symbol })
        ])

        // 1. 处理资产负债表数据
        let balanceSheetCount = 0
        if (balanceSheetRes.ok) {
          const balanceSheetResult = await balanceSheetRes.json()
          if (balanceSheetResult.success && Array.isArray(balanceSheetResult.data)) {
            for (const item of balanceSheetResult.data) {
              const balanceData = {
                total_parent_equity: item.TOTAL_PARENT_EQUITY || 0,
                total_assets: item.TOTAL_ASSETS || 0,
                total_current_assets: item.TOTAL_CURRENT_ASSETS || 0,
                total_noncurrent_assets: item.TOTAL_NONCURRENT_ASSETS || 0,
                total_current_liab: item.TOTAL_CURRENT_LIAB || 0,
                total_noncurrent_liab: item.TOTAL_NONCURRENT_LIAB || 0,
                total_liabilities: item.TOTAL_LIABILITIES || 0,
              }
              await prisma.quote__balance_sheet.upsert({
                where: {
                  company_id_report_date: {
                    company_id: company.id,
                    report_date: new Date(item.REPORT_DATE)
                  }
                },
                update: balanceData,
                create: {
                  company_id: company.id,
                  report_date: new Date(item.REPORT_DATE),
                  ...balanceData,
                }
              })
              balanceSheetCount++
            }
          }
        }

        // 2. 处理利润表数据
        let profitSheetCount = 0
        if (profitSheetRes.ok) {
          const profitSheetResult = await profitSheetRes.json()
          if (profitSheetResult.success && Array.isArray(profitSheetResult.data)) {
            for (const item of profitSheetResult.data) {
              const operate_income = item.OPERATE_INCOME || 0
              const operate_cost = item.OPERATE_COST || item.OPERATE_EXPENSE || 0
              const data = {
                operate_income: operate_income,
                total_operate_income: item.TOTAL_OPERATE_INCOME || operate_income,
                operate_cost: operate_cost,
                total_operate_cost: item.TOTAL_OPERATE_COST || operate_cost,  
                netprofit: item.NETPROFIT || 0,
                parent_netprofit: item.PARENT_NETPROFIT || 0,
              }
              await prisma.quote__profit_sheet.upsert({
                where: {
                  company_id_report_date: {
                    company_id: company.id,
                    report_date: new Date(item.REPORT_DATE)
                  }
                },
                update: data,
                create: {
                  company_id: company.id,
                  report_date: new Date(item.REPORT_DATE),
                  ...data,
                }
              })
              profitSheetCount++
            }
          }
        }

        // 3. 处理现金流量表数据
        let cashFlowSheetCount = 0
        if (cashFlowSheetRes.ok) {
          const cashFlowSheetResult = await cashFlowSheetRes.json()
          if (cashFlowSheetResult.success && Array.isArray(cashFlowSheetResult.data)) {
            for (const item of cashFlowSheetResult.data) {
              await prisma.quote__cash_flow_sheet.upsert({
                where: {
                  company_id_report_date: {
                    company_id: company.id,
                    report_date: new Date(item.REPORT_DATE)
                  }
                },
                update: {
                  netcash_operate: item.NETCASH_OPERATE || 0,
                  netcash_invest: item.NETCASH_INVEST || 0,
                  netcash_finance: item.NETCASH_FINANCE || 0,
                  rate_change_effect: item.RATE_CHANGE_EFFECT || 0,
                  capex: item.CONSTRUCT_LONG_ASSET || 0,
                },
                create: {
                  company_id: company.id,
                  report_date: new Date(item.REPORT_DATE),
                  netcash_operate: item.NETCASH_OPERATE || 0,
                  netcash_invest: item.NETCASH_INVEST || 0,
                  netcash_finance: item.NETCASH_FINANCE || 0,
                  rate_change_effect: item.RATE_CHANGE_EFFECT || 0,
                  capex: item.CONSTRUCT_LONG_ASSET || 0,
                }
              })
              cashFlowSheetCount++
            }
          }
        }

        syncResults.push({
          company_id: company.id,
          company_code: company.company_code,
          company_name: company.company_name,
          counts: {
            balanceSheet: balanceSheetCount,
            profitSheet: profitSheetCount,
            cashFlowSheet: cashFlowSheetCount
          },
          success: true,
        })
        successCount++
        
        console.log(`✓ ${company.company_name} 同步完成: 资产负债表 ${balanceSheetCount} 条, 利润表 ${profitSheetCount} 条, 现金流量表 ${cashFlowSheetCount} 条`)

      } catch (error) {
        console.error(`同步 ${company.company_name} 失败:`, error)
        syncResults.push({
          company_id: company.id,
          company_code: company.company_code,
          company_name: company.company_name,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        })
        failCount++
      }
    }

    return NextResponse.json({
      message: `同步完成: 成功 ${successCount} 家, 失败 ${failCount} 家`,
      data: {
        total_companies: companies.length,
        success_count: successCount,
        fail_count: failCount,
        results: syncResults,
      }
    })

  } catch (error: any) {
    console.error('同步财报数据失败:', error)
    return NextResponse.json(
      { error: '同步财报数据失败', details: error.message },
      { status: 500 }
    )
  }
}
