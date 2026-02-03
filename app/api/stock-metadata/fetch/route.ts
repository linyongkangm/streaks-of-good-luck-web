import { NextRequest, NextResponse } from 'next/server';
import * as stools from '@/app/tools/stools';

// POST /api/stock-metadata/fetch - 从AKShare获取公司元数据
export async function POST(req: NextRequest) {
  try {
    const { symbol } = await req.json();

    if (!symbol) {
      return NextResponse.json({ error: '缺少股票代码' }, { status: 400 });
    }
    // const response1 = await stools.fetchWebIntellCallAKShare('stock_cash_flow_sheet_by_quarterly_em', { symbol: 'sz000001' });
    // const result1 = await response1.json();
    // console.log('balance sheet result:', result1.data.slice(0, 2));
    // return NextResponse.json({ error: '测试中断' }, { status: 500 });
    // 调用 AKShare API 获取公司信息
    const response = await stools.fetchWebIntellCallAKShare('stock_individual_info_em', { symbol: symbol.slice(-6) });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: error.message || '获取元数据失败' }, { status: response.status });
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      return NextResponse.json({ error: '获取元数据失败' }, { status: 500 });
    }

    // 将数组格式转换为对象格式
    const metadata: Record<string, any> = {};
    result.data.forEach((item: { item: string; value: any }) => {
      metadata[item.item] = item.value;
    });

    // 格式化返回数据
    const formattedData = {
      company_name: metadata['股票简称'] || '',
      company_code: metadata['股票代码'] || '',
      company_akshare_code: symbol,
      industry: metadata['行业'] || null,
      ipo_date: metadata['上市时间'] ? parseIpoDate(metadata['上市时间']) : null,
      total_shares: metadata['总股本'] || null,
      circulating_shares: metadata['流通股'] || null,
    };

    return NextResponse.json({
      success: true,
      data: formattedData,
      raw: metadata, // 保留原始数据
    });
  } catch (error) {
    console.error('获取股票元数据失败:', error);
    return NextResponse.json({ error: '获取元数据失败' }, { status: 500 });
  }
}

// 解析上市时间（格式：19910403 -> 1991-04-03）
function parseIpoDate(dateNumber: number): string | null {
  try {
    const dateStr = dateNumber.toString();
    if (dateStr.length !== 8) return null;
    
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}
