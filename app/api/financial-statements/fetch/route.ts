import { NextRequest, NextResponse } from 'next/server'
import {prisma} from '@/lib/db'
import { fetchWebIntellCallAKShare } from '@/app/tools/stools'

export async function POST(req: NextRequest) {
  try {
    const { company_id } = await req.json()

    if (!company_id) {
      return NextResponse.json({ error: '缺少company_id参数' }, { status: 400 })
    }

    // 获取公司信息
    const company = await prisma.info__stock_company.findUnique({
      where: { id: parseInt(company_id) }
    })

    if (!company) {
      return NextResponse.json({ error: '公司不存在' }, { status: 404 })
    }

    const symbol = company.company_akshare_code

    // 1. 获取资产负债表数据
    const balanceSheetRes = await fetchWebIntellCallAKShare(
      'stock_balance_sheet_by_report_em',
      { symbol }
    )
    if (!balanceSheetRes.ok) {
      throw new Error('获取资产负债表数据失败')
    }
    const balanceSheetData = []
    const balanceSheetResult = await balanceSheetRes.json()
    if (balanceSheetResult.success && balanceSheetResult.data) {
      balanceSheetData.push(...balanceSheetResult.data)
    }

    // 2. 获取利润表数据
    const profitSheetRes = await fetchWebIntellCallAKShare(
      'stock_profit_sheet_by_quarterly_em',
      { symbol }
    )
    if (!profitSheetRes.ok) {
      throw new Error('获取利润表数据失败')
    }
    const profitSheetData = []
    const profitSheetResult = await profitSheetRes.json()
    if (profitSheetResult.success && profitSheetResult.data) {
      profitSheetData.push(...profitSheetResult.data)
    }
    // 3. 获取现金流量表数据
    const cashFlowSheetRes = await fetchWebIntellCallAKShare(
      'stock_cash_flow_sheet_by_quarterly_em',
      { symbol }
    )
    if (!cashFlowSheetRes.ok) {
      throw new Error('获取现金流量表数据失败')
    }
    const cashFlowSheetData = []
    const cashFlowSheetResult = await cashFlowSheetRes.json()
    if (cashFlowSheetResult.success && cashFlowSheetResult.data) {
      cashFlowSheetData.push(...cashFlowSheetResult.data)
    }
    // 保存资产负债表数据
    let balanceSheetCount = 0
    if (Array.isArray(balanceSheetData) && balanceSheetData.length > 0) {
      for (const item of balanceSheetData) {
        await prisma.quote__balance_sheet.upsert({
          where: {
            company_id_report_date: {
              company_id: company.id,
              report_date: new Date(item.REPORT_DATE)
            }
          },
          update: {
            total_parent_equity: item.TOTAL_PARENT_EQUITY || 0,
          },
          create: {
            company_id: company.id,
            report_date: new Date(item.REPORT_DATE),
            total_parent_equity: item.TOTAL_PARENT_EQUITY || 0,
          }
        })
        balanceSheetCount++
      }
    }

    // 保存利润表数据
    let profitSheetCount = 0
    if (Array.isArray(profitSheetData) && profitSheetData.length > 0) {
      for (const item of profitSheetData) {
        await prisma.quote__profit_sheet.upsert({
          where: {
            company_id_report_date: {
              company_id: company.id,
              report_date: new Date(item.REPORT_DATE)
            }
          },
          update: {
            operate_income: item.OPERATE_INCOME || 0,
            parent_netprofit: item.PARENT_NETPROFIT || 0,
          },
          create: {
            company_id: company.id,
            report_date: new Date(item.REPORT_DATE),
            operate_income: item.OPERATE_INCOME || 0,
            parent_netprofit: item.PARENT_NETPROFIT || 0,
          }
        })
        profitSheetCount++
      }
    }

    // 保存现金流量表数据
    let cashFlowSheetCount = 0
    if (Array.isArray(cashFlowSheetData) && cashFlowSheetData.length > 0) {
      for (const item of cashFlowSheetData) {
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
          },
          create: {
            company_id: company.id,
            report_date: new Date(item.REPORT_DATE),
            netcash_operate: item.NETCASH_OPERATE || 0,
            netcash_invest: item.NETCASH_INVEST || 0,
            netcash_finance: item.NETCASH_FINANCE || 0,
            rate_change_effect: item.RATE_CHANGE_EFFECT || 0,
          }
        })
        cashFlowSheetCount++
      }
    }

    return NextResponse.json({
      message: '财报数据获取成功',
      counts: {
        balanceSheet: balanceSheetCount,
        profitSheet: profitSheetCount,
        cashFlowSheet: cashFlowSheetCount
      }
    })

  } catch (error: any) {
    console.error('获取财报数据失败:', error)
    return NextResponse.json(
      { error: '获取财报数据失败', details: error.message },
      { status: 500 }
    )
  }
}
