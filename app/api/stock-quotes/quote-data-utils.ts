import * as stools from '@/app/tools/stools'
import { prisma } from '@/lib/db'

enum StockHist {
  DF = 'stock_zh_a_hist',
  TX = 'stock_zh_a_hist_tx',
}

// 获取指定复权方式的行情数据
export async function fetchQuoteData(
  symbol: string,
  akSymbol: string,
  startDate: string,
  endDate: string,
  adjust: string
): Promise<any[] | null> {
  try {
    const method: StockHist = StockHist.TX as StockHist;
    const params: any = {
      symbol: method === StockHist.DF ? symbol : akSymbol,
      start_date: startDate.replace(/-/g, ''),
      end_date: endDate.replace(/-/g, ''),
    }

    if (adjust) {
      params.adjust = adjust
    }
    if (method === StockHist.DF) {
      params.period = 'daily';
    }

    const response = await stools.fetchWebIntellCallAKShare(method, params)

    if (!response.ok) {
      console.error(`获取${adjust || 'none'}复权数据失败`)
      return null
    }

    const result = await response.json()
    if (result.success) {
      if (method === StockHist.DF) {
        return result.data;
      } else {
        return result.data.map((item: any) => ({
          '日期': item.date,
          '开盘': item.open,
          '收盘': item.close,
          '最高': item.high,
          '最低': item.low,
          '成交量':  parseInt(item.amount),
          '振幅': ((item.high - item.low) / item.open) * 100,
          '涨跌幅': ((item.close - item.open) / item.open) * 100,
        }));
      }
    }
    return null

  } catch (error) {
    console.error(`获取${adjust || 'none'}复权数据异常:`, error)
    return null
  }
}

// 合并三种复权数据
export function mergeQuoteData(noneData: any[], qfqData: any[], hfqData: any[]): any[] {
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
export async function saveQuoteData(companyId: number, data: any[]): Promise<number> {
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

// 获取并保存行情数据（组合方法）
export async function fetchAndSaveQuoteData(
  companyId: number,
  companyCode: string,
  akCompanyCode: string,
  startDate: string,
  endDate: string
): Promise<number> {
  // 分别获取三种复权方式的数据
  const [noneData, qfqData, hfqData] = await Promise.all([
    fetchQuoteData(companyCode, akCompanyCode, startDate, endDate, ''), // 不复权
    fetchQuoteData(companyCode, akCompanyCode, startDate, endDate, 'qfq'), // 前复权
    fetchQuoteData(companyCode, akCompanyCode, startDate, endDate, 'hfq'), // 后复权
  ])

  if (!noneData || !qfqData || !hfqData) {
    throw new Error('获取行情数据失败')
  }

  // 合并数据并保存
  const mergedData = mergeQuoteData(noneData, qfqData, hfqData)
  const savedCount = await saveQuoteData(companyId, mergedData)

  return savedCount
}
