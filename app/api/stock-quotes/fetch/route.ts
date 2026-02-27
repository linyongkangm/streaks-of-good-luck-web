import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchAndSaveQuoteData } from '../quote-data-utils';

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

    // 获取并保存数据
    const savedCount = await fetchAndSaveQuoteData(company.id, company.company_code, company.company_akshare_code, start_date, end_date);

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
