'use client'

import { use, useEffect, useRef, useState } from 'react'
import { Chart } from '@antv/g2'
import { DateTime } from 'luxon'
import type { info__stock_company, view_financial_statements, info__milestone, MilestoneWithRelations } from '@/types'
import Panel from '@/app/widget/Panel'
import Select from '@/app/widget/Select'
import Radio from '@/app/widget/Radio'
import { FormLabel } from '@/app/widget/Form'
import Loading from '@/app/widget/Loading'
import { formatNumber, toLuxon } from '@/app/tools'

interface Props {
  selectedCompany: info__stock_company
}

type DataType = 'ttm' | 'annual'

type FinancialViewField =
  Exclude<keyof view_financial_statements, 'total_shares' | 'company_id' | 'report_date' | 'total_operate_income_last_year' | 'operate_income_last_year' | 'total_operate_cost_last_year' | 'operate_cost_last_year' | 'netprofit_last_year' | 'parent_netprofit_last_year' | 'netcash_operate_last_year' | 'netcash_invest_last_year' | 'netcash_finance_last_year' | 'rate_change_effect_last_year' | 'free_cash_flow_last_year' | 'contract_liab_last_year' | 'note_accounts_payable_last_year' | 'prepayment_last_year' | 'note_accounts_rece_last_year'>
  | 'cashflow_ratio_ttm' | 'gross_profit_margin_ttm' | 'net_profit_margin_ttm' | 'sales_net_margin_ttm' | 'total_asset_turnover_ttm' | 'equity_multiplier_ttm' | 'roe_ttm' | 'contract_liab_margin_ttm' | 'note_accounts_payable_margin_ttm' | 'prepayment_margin_ttm' | 'note_accounts_rece_margin_ttm'

const fieldLabels: Record<FinancialViewField, string> = {
  // 销售净利率 = 归母净利润(TTM) / 营业收入(TTM)
  sales_net_margin_ttm: '销售净利率',
  // 总资产周转率 = 营业收入(TTM) / 期末总资产
  total_asset_turnover_ttm: '总资产周转率',
  // 权益乘数 = 期末总资产 / 期末归母权益
  equity_multiplier_ttm: '权益乘数',
  // ROE = 销售净利率 × 总资产周转率 × 权益乘数
  roe_ttm: 'ROE',
  // 净利润现金含量 = 经营现金流(TTM) / 归母净利润(TTM)
  cashflow_ratio_ttm: '净利润现金含量',
  // 毛利率 = (营业收入(TTM) - 营业成本(TTM)) / 营业收入(TTM)
  gross_profit_margin_ttm: '毛利率',
  // 净利率 = 净利润(TTM) / 营业收入(TTM)
  net_profit_margin_ttm: '净利率',
  // 合同负债占营业收入比率 = 合同负债(TTM) / 营业收入(TTM)
  contract_liab_margin_ttm: '合同负债占营业收入比率',
  // 应付账款占营业收入比率 = 应付账款(TTM) / 营业收入(TTM)
  note_accounts_payable_margin_ttm: '应付账款占营业收入比率',
  // 预付款项占营业收入比率 = 预付款项(TTM) / 营业收入(TTM)
  prepayment_margin_ttm: '预付款项占营业收入比率',
  // 应收账款占营业收入比率 = 应收账款(TTM) / 营业收入(TTM)
  note_accounts_rece_margin_ttm: '应收账款占营业收入比率',

  total_assets: '资产总计',
  total_parent_equity: '归母权益',
  total_operate_income_ttm: '营业总收入',
  operate_income_ttm: '营业收入',
  total_operate_cost_ttm: '营业总成本',
  operate_cost_ttm: '营业成本',
  netprofit_ttm: '净利润',
  parent_netprofit_ttm: '归母净利润',
  netcash_operate_ttm: '经营现金流',
  netcash_invest_ttm: '投资现金流',
  netcash_finance_ttm: '筹资现金流',
  rate_change_effect_ttm: '汇率变动影响',
  free_cash_flow_ttm: '自由现金流',
  contract_liab_ttm: '合同负债',
  note_accounts_payable_ttm: '应付账款和应付票据',
  prepayment_ttm: '预付款项',
  note_accounts_rece_ttm: '应收账款和应收票据',
}

const fieldDescriptions: Record<FinancialViewField, string> = {
  cashflow_ratio_ttm: '衡量净利润的现金含量，即公司每赚取1元净利润产生的现金流。数值越高越好，说明企业盈利质量好。计算公式：经营活动现金流(TTM) ÷ 归母净利润(TTM)',
  gross_profit_margin_ttm: '衡量公司的生产经营效率，反映产品的获利能力。数值越高越好。计算公式：(营业收入 - 营业成本) ÷ 营业收入(TTM)',
  net_profit_margin_ttm: '衡量公司的盈利能力，反映每元营业收入能产生多少利润。数值越高越好。计算公式：净利润 ÷ 营业收入(TTM)',
  sales_net_margin_ttm: '衡量公司的真实盈利能力，反映归属母公司的净利润率。数值越高越好。计算公式：归母净利润 ÷ 营业收入(TTM)',
  total_asset_turnover_ttm: '衡量公司资产的利用效率，反映每单位资产产生的营业收入。数值越高越好，表示资产利用效率越高。计算公式：营业收入(TTM) ÷ 期末总资产',
  equity_multiplier_ttm: '衡量公司的财务杠杆程度，反映每单位股东权益产生的资产。数值高表示财务杠杆大，风险相对较高。计算公式：期末总资产 ÷ 期末归母权益',
  roe_ttm: '衡量公司净资产收益率，反映股东权益的盈利能力。是评估公司盈利能力的最重要指标之一。计算公式：销售净利率 × 总资产周转率 × 权益乘数',
  total_assets: '反映公司在报告期末的资产规模，包括流动资产和非流动资产。',
  total_parent_equity: '反映归属于母公司的股东权益总额，代表母公司所有者的权益。',
  total_operate_income_ttm: '最近12个月的营业总收入，包括营业收入和其他业务收入。',
  operate_income_ttm: '最近12个月的主营业务收入，是公司核心业务的收入部分。',
  total_operate_cost_ttm: '最近12个月的营业总成本，包括营业成本、税金及附加、期间费用等。',
  operate_cost_ttm: '最近12个月的主营业务成本，对应主营业务收入的成本。',
  netprofit_ttm: '最近12个月的净利润，是公司实现的最终利润。',
  parent_netprofit_ttm: '最近12个月归属于母公司的净利润，代表母公司实现的利润。',
  netcash_operate_ttm: '最近12个月经营活动产生的净现金流，反映公司核心业务的现金生成能力。',
  netcash_invest_ttm: '最近12个月投资活动产生的净现金流，通常为负数，反映公司的投资支出。',
  netcash_finance_ttm: '最近12个月筹资活动产生的净现金流，反映公司的融资和分配活动。',
  rate_change_effect_ttm: '最近12个月汇率变动对现金及现金等价物的影响，反映汇兑损益。',
  free_cash_flow_ttm: '最近12个月的自由现金流，衡量公司的真实现金生成能力和可支配能力。',
  contract_liab_ttm: '最近12个月的合同负债，反映公司已收款但尚未履约的金额，代表未来的收入确认。',
  note_accounts_payable_ttm: '最近12个月的应付账款和应付票据，反映公司因购买商品或接受劳务而产生的短期债务。',
  prepayment_ttm: '最近12个月的预付款项，反映公司已支付但尚未收到商品或服务的金额，代表未来的成本确认。',
  note_accounts_rece_ttm: '最近12个月的应收账款和应收票据，反映公司因销售商品或提供劳务而产生的短期债权。',
  contract_liab_margin_ttm: '衡量公司合同负债占营业收入的比率，反映公司预收款项的规模和未来收入的确认情况。数值越高可能意味着公司预收款项较多，未来收入确认较快。计算公式：合同负债(TTM) ÷ 营业收入(TTM)',
  note_accounts_payable_margin_ttm: '衡量公司应付账款占营业收入的比率，反映公司利用供应商信用的程度。数值较高可能意味着公司在利用供应商信用进行融资，但过高可能存在偿债风险。计算公式：应付账款(TTM) ÷ 营业收入(TTM)',
  prepayment_margin_ttm: '衡量公司预付款项占营业收入的比率，反映公司预付货款或服务款的规模。数值较高可能意味着公司预付账款较多，未来成本确认较快。计算公式：预付款项(TTM) ÷ 营业收入(TTM)',
  note_accounts_rece_margin_ttm: '衡量公司应收账款占营业收入的比率，反映公司赊销业务的规模和回款风险。数值较高可能意味着公司赊销较多，存在较大的回款风险。计算公式：应收账款(TTM) ÷ 营业收入(TTM)',
}

const fieldOrder: FinancialViewField[] = [
  'roe_ttm',
  'sales_net_margin_ttm',
  'total_asset_turnover_ttm',
  'equity_multiplier_ttm',
  'cashflow_ratio_ttm',
  'gross_profit_margin_ttm',
  'net_profit_margin_ttm',
  'free_cash_flow_ttm',
  'total_parent_equity',
  'total_operate_income_ttm',
  'operate_income_ttm',
  'total_operate_cost_ttm',
  'operate_cost_ttm',
  'netprofit_ttm',
  'parent_netprofit_ttm',
  'netcash_operate_ttm',
  'netcash_invest_ttm',
  'netcash_finance_ttm',
  'rate_change_effect_ttm',
  'contract_liab_ttm',
  'note_accounts_payable_ttm',
  'prepayment_ttm',
  'note_accounts_rece_ttm',
  'contract_liab_margin_ttm',
  'note_accounts_payable_margin_ttm',
  'prepayment_margin_ttm',
  'note_accounts_rece_margin_ttm',
]

const quickSelectFields: FinancialViewField[] = [
  'roe_ttm',
  'sales_net_margin_ttm',
  'total_asset_turnover_ttm',
  'equity_multiplier_ttm',
  'cashflow_ratio_ttm',
  'gross_profit_margin_ttm',
  'net_profit_margin_ttm',
  'free_cash_flow_ttm',
  'contract_liab_margin_ttm',
  'note_accounts_payable_margin_ttm',
  'prepayment_margin_ttm',
  'note_accounts_rece_margin_ttm',
]

const otherFields: FinancialViewField[] = fieldOrder.filter((field) => !quickSelectFields.includes(field))

function getMilestonePointColor(milestones: MilestoneWithRelations[] | undefined): string {
  if (!milestones || milestones.length === 0) return '#ffffff00'
  const hasNegative = milestones.some(milestone => milestone.relation__industry_or_company_milestone?.some(relation => /负面/.test(relation.impact || '')))
  const hasPositive = milestones.some(milestone => milestone.relation__industry_or_company_milestone?.some(relation => /正面/.test(relation.impact || '')))
  if (!hasNegative && !hasPositive) return '#51a2ff'
  return hasNegative ? '#00c950' : '#fb2c36'
}

function calculateMetricValue(field: FinancialViewField, record: view_financial_statements) {


  const operateIncomeTtm = Number(record.operate_income_ttm || 0)
  const operateCostTtm = Number(record.operate_cost_ttm || 0)
  const netprofitTtm = Number(record.netprofit_ttm || 0)
  const parentNetprofitTtm = Number(record.parent_netprofit_ttm || 0)
  const netcashOperateTtm = Number(record.netcash_operate_ttm || 0)
  const totalParentEquity = Number(record.total_parent_equity || 0)
  const totalAssets = Number(record.total_assets || 0)

  if (field === 'cashflow_ratio_ttm') {
    if (!Number.isFinite(netcashOperateTtm) || !Number.isFinite(parentNetprofitTtm) || parentNetprofitTtm === 0) {
      return Number.NaN
    }
    return netcashOperateTtm / parentNetprofitTtm
  }

  if (field === 'gross_profit_margin_ttm') {
    if (!Number.isFinite(operateIncomeTtm) || !Number.isFinite(operateCostTtm) || operateIncomeTtm === 0) {
      return Number.NaN
    }
    return (operateIncomeTtm - operateCostTtm) / operateIncomeTtm
  }

  if (field === 'net_profit_margin_ttm') {
    if (!Number.isFinite(operateIncomeTtm) || !Number.isFinite(netprofitTtm) || operateIncomeTtm === 0) {
      return Number.NaN
    }
    return netprofitTtm / operateIncomeTtm
  }

  if (field === 'sales_net_margin_ttm') {
    if (!Number.isFinite(operateIncomeTtm) || !Number.isFinite(parentNetprofitTtm) || operateIncomeTtm === 0) {
      return Number.NaN
    }
    return parentNetprofitTtm / operateIncomeTtm
  }

  if (field === 'total_asset_turnover_ttm') {
    if (!Number.isFinite(operateIncomeTtm) || !Number.isFinite(totalAssets) || totalAssets === 0) {
      return Number.NaN
    }
    return operateIncomeTtm / totalAssets
  }

  if (field === 'equity_multiplier_ttm') {
    if (!Number.isFinite(totalAssets) || !Number.isFinite(totalParentEquity) || totalParentEquity === 0) {
      return Number.NaN
    }
    return totalAssets / totalParentEquity
  }

  if (field === 'roe_ttm') {
    if (!Number.isFinite(operateIncomeTtm) || !Number.isFinite(parentNetprofitTtm) || !Number.isFinite(totalAssets) || !Number.isFinite(totalParentEquity) || operateIncomeTtm === 0 || totalAssets === 0 || totalParentEquity === 0) {
      return Number.NaN
    }
    const salesNetMargin = parentNetprofitTtm / operateIncomeTtm
    const totalAssetTurnover = operateIncomeTtm / totalAssets
    const equityMultiplier = totalAssets / totalParentEquity
    return salesNetMargin * totalAssetTurnover * equityMultiplier
  }

  if (
    'contract_liab_margin_ttm' === field ||
    'note_accounts_payable_margin_ttm' === field ||
    'prepayment_margin_ttm' === field ||
    'note_accounts_rece_margin_ttm' === field
  ) {
    if (!Number.isFinite(operateIncomeTtm) || operateIncomeTtm === 0) {
      return Number.NaN
    }
    return Number((record as any)[`${field.replace('_margin_ttm', '_ttm')}`]) / operateIncomeTtm
  }

  return record[field] !== undefined ? Number((record as any)[field]) : Number.NaN
}

function isPercentageField(field: string) {
  return [
    'gross_profit_margin_ttm',
    'net_profit_margin_ttm',
    'cashflow_ratio_ttm',
    'sales_net_margin_ttm',
    'roe_ttm',
    'contract_liab_margin_ttm',
    'note_accounts_payable_margin_ttm',
    'prepayment_margin_ttm',
    'note_accounts_rece_margin_ttm'
  ].includes(field)
}

// 计算合理的坐标轴范围（排除极值）
function calculateReasonableRange(values: number[]) {
  const validValues = values.filter(v => Number.isFinite(v))
  if (validValues.length === 0) return { min: undefined, max: undefined }
  if (validValues.length === 1) {
    const val = validValues[0]
    const offset = Math.abs(val) * 0.1 || 0.1
    return { min: val - offset, max: val + offset }
  }

  // 使用百分位数方法：保留 1%-99% 的数据范围（数据少时使用 5%-95%）
  const sorted = [...validValues].sort((a, b) => a - b)
  const useWideRange = sorted.length < 20
  const lowPercentile = useWideRange ? 0.05 : 0.01
  const highPercentile = useWideRange ? 0.95 : 0.99

  const lowIndex = Math.max(0, Math.floor(sorted.length * lowPercentile))
  const highIndex = Math.min(sorted.length - 1, Math.floor(sorted.length * highPercentile))

  const min = sorted[lowIndex]
  const max = sorted[highIndex]

  // 计算范围
  let range = max - min

  // 如果范围太小（方差很小），使用均值的10%作为最小范围
  if (Math.abs(range) < 1e-10) {
    const mean = validValues.reduce((a, b) => a + b, 0) / validValues.length
    range = Math.abs(mean) * 0.1 || 0.1 // 至少10%或0.1
  }

  // 添加缓冲空间（10%）
  const buffer = Math.abs(range) * 0.1

  return {
    min: min - buffer,
    max: max + buffer,
  }
}

function useFetchFinancialData(selectedCompany: Props['selectedCompany']) {
  const [records, setRecords] = useState<view_financial_statements[] | null>(null)
  const [milestones, setMilestones] = useState<MilestoneWithRelations[] | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedCompany?.id) return

      setLoading(true)
      try {
        const limit = 200
        let page = 1
        let totalPages = 1
        const allRows: view_financial_statements[] = []

        while (page <= totalPages) {
          const res = await fetch(
            `/api/financial-statements/view?company_id=${selectedCompany.id}&page=${page}&limit=${limit}`
          )
          if (!res.ok) break

          const result = await res.json()
          allRows.push(...(result.data || []))
          totalPages = result.pagination?.totalPages || 1
          page += 1
        }

        setRecords(allRows)
      } catch (error) {
        console.error('获取财务报表综合视图折线图失败:', error)
      } finally {
        setLoading(false)
      }
    }



    fetchData()
  }, [selectedCompany])
  useEffect(() => {
    const fetchMilestones = async () => {
      if (!selectedCompany?.id || !records || records.length === 0) return

      try {
        // 获取公司关联的行业列表
        const industriesRes = await fetch(`/api/company-industries?company_id=${selectedCompany.id}`)
        if (!industriesRes.ok) return

        const industriesResult = await industriesRes.json()
        const industries = industriesResult?.data || []

        if (industries.length === 0) {
          setMilestones([])
          return
        }

        // 获取数据范围
        const sortedRecords = [...records].sort((a, b) => new Date(a.report_date as any).getTime() - new Date(b.report_date as any).getTime()
        )
        const startDate = DateTime.fromJSDate(new Date(sortedRecords[0].report_date as any)).toISODate()
        const endDate = DateTime.fromJSDate(new Date(sortedRecords[sortedRecords.length - 1].report_date as any)).toISODate()

        // 获取每个行业的里程碑
        const milestonePromises = industries.map((industryRelation: any) => fetch(`/api/milestones?industryId=${industryRelation.industry_id}&startDate=${startDate}&endDate=${endDate}`)
          .then(res => res.ok ? res.json() : { data: [] })
          .then(result => result.data || [])
        )

        const milestonesArrays = await Promise.all(milestonePromises)
        const allMilestones = milestonesArrays.flat()

        // 去重（基于 id）
        const uniqueMilestones = Array.from(
          new Map(allMilestones.map((item: MilestoneWithRelations) => [item.id, item])).values()
        )

        setMilestones(uniqueMilestones)
      } catch (error) {
        console.error('获取里程碑数据失败:', error)
      }
    }
    if (records && records.length > 0) {
      fetchMilestones()
    }
  }, [records])
  return { records, milestones, loading }
}


export default function StockAnalysisFinancialViewChart({ selectedCompany }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<Chart | null>(null)
  const { records, milestones, loading } = useFetchFinancialData(selectedCompany)
  const [field, setField] = useState<FinancialViewField>('parent_netprofit_ttm')
  const [dataType, setDataType] = useState<DataType>('ttm')
  const isPercentField = isPercentageField(field)

  useEffect(() => {
    if (!chartRef.current || !records || records.length === 0 || !milestones) return
    const charDataMap = new Map<string, { report_date: Date; value: number; sequential_ratio: number; milestones: MilestoneWithRelations[] }>()
    // 将数据按照报告期聚合，并计算指标值和关联的里程碑事件
    records.forEach((item) => {
      const metricValue = calculateMetricValue(field, item)
      const date = toLuxon(item.report_date!)
      charDataMap.set(date.toFormat('yyyy-Qq'), {
        report_date: date.toJSDate(),
        value: metricValue,
        sequential_ratio: Number.NaN,
        milestones: milestones.filter(milestone => {
          const milestoneDate = toLuxon(milestone.milestone_date)
          // 先按年份过滤
          let isFiltered = milestoneDate.year === date.year
          // 如果是 TTM 数据，进一步按季度过滤，确保里程碑事件与数据点在同一季度
          if (isFiltered && dataType === 'ttm') {
            isFiltered = milestoneDate.quarter === date.quarter
          }
          return isFiltered
        }),
      })
    })
    let chartData = Array.from(charDataMap.values()).sort((a, b) => a.report_date.getTime() - b.report_date.getTime())
    // 如果是年度数据，只保留每年第四季度的数据点（如果存在），因为年度数据通常以第四季度的 TTM 数据为代表
    if (dataType === 'annual') {
      const lastChartData = chartData[chartData.length - 1]
      chartData = chartData.filter(d => toLuxon(d.report_date).quarter === 4)
      // 如果最后一个数据点不是第四季度的，说明缺失了年度数据，可以考虑保留这个数据点（虽然它不完整，但总比没有好）
      if (lastChartData && toLuxon(lastChartData.report_date).quarter !== 4) {
        chartData.push(lastChartData)
      }
    }
    // 计算环比增长率
    chartData.forEach((d, i) => {
      if (i === 0) {
        d.sequential_ratio = Number.NaN
      } else {
        const prevValue = chartData[i - 1].value
        if (Number.isFinite(d.value) && Number.isFinite(prevValue) && prevValue !== 0) {
          d.sequential_ratio = (d.value - prevValue) / Math.abs(prevValue)
        } else {
          d.sequential_ratio = Number.NaN
        }
      }
    })

    if (chartData.length === 0) return
    if (chartInstance.current) {
      chartInstance.current.destroy()
      chartInstance.current = null
    }


    const valueRange = calculateReasonableRange(chartData.map(d => d.value))
    const chart = new Chart({
      container: chartRef.current,
      autoFit: true,
      height: 380,
    })

    chart.options({
      type: 'view',
      data: chartData,
      encode: {
        x: 'report_date',
      },
      legend: false,
      axis: {
        x: {
          title: `${selectedCompany.company_name} - ${dataType === 'ttm' ? 'TTM' : '年度'}报告期`,
        },
      },
      interaction: {
        tooltip: {
          filter: (d) => {
            return d.value !== 'undefined'
          },
        }
      },
      children: [
        {
          type: 'line',
          encode: {
            y: 'value',
          },
          style: {
            lineWidth: 2,
            stroke: '#1f77b4',
          },
          scale: {
            y: {
              nice: true,
              domainMin: valueRange.min,
              domainMax: valueRange.max,
            }
          },
          axis: {
            y: {
              title: fieldLabels[field],
              labelFormatter: (value: number) => {
                if (isPercentField) {
                  return `${(Number(value) * 100).toFixed(2)}%`
                }
                return formatNumber(value, 2)
              },
            },
          },
          tooltip: {
            title: (d) => {
              return `${toLuxon(d.report_date).toFormat('yyyy-Qq')}`
            },
            items: [
              {
                name: '报告期',
                channel: 'x',
                valueFormatter: (value) => toLuxon(value).toFormat('yyyy-Qq'),
              },
              {
                name: fieldLabels[field],
                field: 'value',
                valueFormatter: (value) =>
                  isPercentField
                    ? `${(Number(value) * 100).toFixed(2)}%`
                    : formatNumber(Number(value)),
              },
              {
                name: '环比',
                field: 'sequential_ratio',
                color: '#ff7f0e',
                valueFormatter: (value) => {
                  const v = Number(value)
                  return Number.isFinite(v) ? `${(v * 100).toFixed(2)}%` : '-'
                },
              },
              {
                name: '事件',
                field: 'milestones',
                color: '#ff6b6b',
                valueFormatter: (value) => {
                  const milestones = value as MilestoneWithRelations[] | undefined
                  if (!milestones || milestones.length === 0) return undefined as any
                  return milestones.map(m => m.keyword).join('<br/>')
                },
              },
            ],
          }
        },
        {
          type: 'point',
          encode: {
            y: 'value',
            shape: 'diamond',
            size: 8,
          },
          style: {
            stroke: (d: typeof chartData[number]) => getMilestonePointColor(d.milestones),
            fill: (d: typeof chartData[number]) => getMilestonePointColor(d.milestones),
          },
          tooltip: false
        },
      ],
    })

    chart.render()
    chartInstance.current = chart

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
        chartInstance.current = null
      }
    }
  }, [records, milestones, field, dataType, isPercentField])

  return (
    <Panel>
      <div className="flex gap-4 items-end flex-wrap">
        <FormLabel label="数据类型">
          <Radio
            options={[
              { value: 'ttm', label: 'TTM' },
              { value: 'annual', label: '年度末TTM' },
            ] as const}
            value={dataType}
            onChange={(v) => setDataType(v as DataType)}
          />
        </FormLabel>
        <FormLabel label="常用指标">
          <Radio
            options={quickSelectFields.map((value) => ({
              value,
              label: fieldLabels[value],
            }))}
            value={field}
            onChange={setField}
          />
        </FormLabel>
        <FormLabel label="其他指标">
          <Select
            options={otherFields.map((value) => ({
              value,
              label: fieldLabels[value],
            }))}
            value={field}
            onChange={setField}
          />
        </FormLabel>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 text-sm text-blue-900">
        <h3 className="font-semibold mb-2">{fieldLabels[field]}</h3>
        <p className="leading-relaxed">{fieldDescriptions[field]}</p>
      </div>
      {loading ? (
        <Loading />
      ) : !records || records.length === 0 ? (
        <div className="text-center py-10 text-slate-500">暂无可绘制数据</div>
      ) : (
        <div ref={chartRef} className="w-full" />
      )}
    </Panel>
  )
}



