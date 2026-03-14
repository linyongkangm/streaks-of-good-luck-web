import { fetchWebIntellCallAKShare } from '@/app/tools/stools'
import { prisma } from '@/lib/db'

export interface FinancialStatementSyncCounts {
  balanceSheet: number
  profitSheet: number
  cashFlowSheet: number
}

export async function fetchAndSaveFinancialStatements(companyId: number): Promise<FinancialStatementSyncCounts> {
  const company = await prisma.info__stock_company.findUnique({
    where: { id: companyId },
  })

  if (!company) {
    throw new Error('公司不存在')
  }

  const symbol = company.company_akshare_code
  const [balanceSheetRes, profitSheetRes, cashFlowSheetRes] = await Promise.all([
    fetchWebIntellCallAKShare('stock_balance_sheet_by_report_em', { symbol }),
    fetchWebIntellCallAKShare('stock_profit_sheet_by_quarterly_em', { symbol }),
    fetchWebIntellCallAKShare('stock_cash_flow_sheet_by_quarterly_em', { symbol }),
  ])

  if (!balanceSheetRes.ok) {
    throw new Error('获取资产负债表数据失败')
  }
  if (!profitSheetRes.ok) {
    throw new Error('获取利润表数据失败')
  }
  if (!cashFlowSheetRes.ok) {
    throw new Error('获取现金流量表数据失败')
  }

  const balanceSheetResult = await balanceSheetRes.json()
  const profitSheetResult = await profitSheetRes.json()
  const cashFlowSheetResult = await cashFlowSheetRes.json()

  const balanceSheetData = Array.isArray(balanceSheetResult.data) ? balanceSheetResult.data : []
  const profitSheetData = Array.isArray(profitSheetResult.data) ? profitSheetResult.data : []
  const cashFlowSheetData = Array.isArray(cashFlowSheetResult.data) ? cashFlowSheetResult.data : []

  let balanceSheetCount = 0
  for (const item of balanceSheetData) {
    const contractLiab = item.CONTRACT_LIAB || item.ADVANCE_RECEIVABLES || 0
    const balanceData = {
      total_parent_equity: item.TOTAL_PARENT_EQUITY || 0,
      total_assets: item.TOTAL_ASSETS || 0,
      total_current_assets: item.TOTAL_CURRENT_ASSETS || 0,
      total_noncurrent_assets: item.TOTAL_NONCURRENT_ASSETS || 0,
      total_current_liab: item.TOTAL_CURRENT_LIAB || 0,
      total_noncurrent_liab: item.TOTAL_NONCURRENT_LIAB || 0,
      total_liabilities: item.TOTAL_LIABILITIES || 0,
      contract_liab: contractLiab,
      note_accounts_payable: item.NOTE_ACCOUNTS_PAYABLE || 0,
      prepayment: item.PREPAYMENT || 0,
      note_accounts_rece: item.NOTE_ACCOUNTS_RECE || 0,
    }

    await prisma.quote__balance_sheet.upsert({
      where: {
        company_id_report_date: {
          company_id: company.id,
          report_date: new Date(item.REPORT_DATE),
        },
      },
      update: balanceData,
      create: {
        company_id: company.id,
        report_date: new Date(item.REPORT_DATE),
        ...balanceData,
      },
    })
    balanceSheetCount++
  }

  let profitSheetCount = 0
  for (const item of profitSheetData) {
    const operateIncome = item.OPERATE_INCOME || 0
    const operateCost = item.OPERATE_COST || item.OPERATE_EXPENSE || 0
    const profitData = {
      operate_income: operateIncome,
      total_operate_income: item.TOTAL_OPERATE_INCOME || operateIncome,
      operate_cost: operateCost,
      total_operate_cost: item.TOTAL_OPERATE_COST || operateCost,
      netprofit: item.NETPROFIT || 0,
      parent_netprofit: item.PARENT_NETPROFIT || 0,
    }

    await prisma.quote__profit_sheet.upsert({
      where: {
        company_id_report_date: {
          company_id: company.id,
          report_date: new Date(item.REPORT_DATE),
        },
      },
      update: profitData,
      create: {
        company_id: company.id,
        report_date: new Date(item.REPORT_DATE),
        ...profitData,
      },
    })
    profitSheetCount++
  }

  let cashFlowSheetCount = 0
  for (const item of cashFlowSheetData) {
    const cashFlowData = {
      netcash_operate: item.NETCASH_OPERATE || 0,
      netcash_invest: item.NETCASH_INVEST || 0,
      netcash_finance: item.NETCASH_FINANCE || 0,
      rate_change_effect: item.RATE_CHANGE_EFFECT || 0,
      capex: item.CONSTRUCT_LONG_ASSET || 0,
    }

    await prisma.quote__cash_flow_sheet.upsert({
      where: {
        company_id_report_date: {
          company_id: company.id,
          report_date: new Date(item.REPORT_DATE),
        },
      },
      update: cashFlowData,
      create: {
        company_id: company.id,
        report_date: new Date(item.REPORT_DATE),
        ...cashFlowData,
      },
    })
    cashFlowSheetCount++
  }

  return {
    balanceSheet: balanceSheetCount,
    profitSheet: profitSheetCount,
    cashFlowSheet: cashFlowSheetCount,
  }
}