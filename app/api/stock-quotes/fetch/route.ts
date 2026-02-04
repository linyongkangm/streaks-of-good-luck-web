import { NextRequest, NextResponse } from 'next/server';
import * as stools from '@/app/tools/stools';
import { prisma } from '@/lib/db';

// POST /api/stock-quotes/fetch - 从AKShare获取历史行情数据并保存
export async function POST(req: NextRequest) {
  try {
    const { company_id, start_date, end_date } = await req.json();

    if (!company_id || !start_date || !end_date) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 查找公司
    const company = await prisma.info__stock_company.findUnique({
      where: { id: company_id },
    });

    if (!company) {
      return NextResponse.json({ error: '公司不存在' }, { status: 404 });
    }

    // 分别获取三种复权方式的数据
    const [noneData, qfqData, hfqData] = await Promise.all([
      fetchQuoteData(company.company_code, start_date, end_date, ''), // 不复权
      fetchQuoteData(company.company_code, start_date, end_date, 'qfq'), // 前复权
      fetchQuoteData(company.company_code, start_date, end_date, 'hfq'), // 后复权
    ]);

    if (!noneData || !qfqData || !hfqData) {
      return NextResponse.json({ error: '获取行情数据失败' }, { status: 500 });
    }

    // 合并数据并保存
    const mergedData = mergeQuoteData(noneData, qfqData, hfqData);
    const savedCount = await saveQuoteData(company.id, mergedData);

    return NextResponse.json({
      success: true,
      message: `成功保存 ${savedCount} 条行情数据`,
      count: savedCount,
    });
  } catch (error) {
    console.error('获取历史行情失败:', error);
    return NextResponse.json({ error: '获取历史行情失败' }, { status: 500 });
  }
}

// 获取指定复权方式的行情数据
async function fetchQuoteData(
  symbol: string,
  start_date: string,
  end_date: string,
  adjust: string
): Promise<any[] | null> {
  try {
    const params: any = {
      symbol,
      period: 'daily',
      start_date: start_date.replace(/-/g, ''),
      end_date: end_date.replace(/-/g, ''),
    };

    if (adjust) {
      params.adjust = adjust;
    }

    const response = await stools.fetchWebIntellCallAKShare('stock_zh_a_hist', params);

    if (!response.ok) {
      console.error(`获取${adjust || 'none'}复权数据失败`);
      return null;
    }

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error(`获取${adjust || 'none'}复权数据异常:`, error);
    return null;
  }
}

// 合并三种复权数据
function mergeQuoteData(noneData: any[], qfqData: any[], hfqData: any[]): any[] {
  const dataMap = new Map();

  // 以日期为key，合并数据
  noneData.forEach((item) => {
    const date = item['日期'];
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
    });
  });

  qfqData.forEach((item) => {
    const date = item['日期'];
    if (dataMap.has(date)) {
      const existing = dataMap.get(date);
      existing.qfq_open_price = item['开盘'];
      existing.qfq_close_price = item['收盘'];
      existing.qfq_high_price = item['最高'];
      existing.qfq_low_price = item['最低'];
      existing.qfq_turnover = item['成交额'];
      existing.qfq_change_amt = item['涨跌额'];
    }
  });

  hfqData.forEach((item) => {
    const date = item['日期'];
    if (dataMap.has(date)) {
      const existing = dataMap.get(date);
      existing.hfq_open_price = item['开盘'];
      existing.hfq_close_price = item['收盘'];
      existing.hfq_high_price = item['最高'];
      existing.hfq_low_price = item['最低'];
      existing.hfq_turnover = item['成交额'];
      existing.hfq_change_amt = item['涨跌额'];
    }
  });

  return Array.from(dataMap.values());
}

// 保存行情数据到数据库
async function saveQuoteData(companyId: number, data: any[]): Promise<number> {
  let count = 0;

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
      });
      count++;
    } catch (error) {
      console.error(`保存行情数据失败 (${item.trade_date}):`, error);
    }
  }

  return count;
}
