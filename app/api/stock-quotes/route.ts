import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/stock-quotes - 获取股票行情数据
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('company_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!companyId) {
      return NextResponse.json({ error: '缺少公司ID' }, { status: 400 });
    }

    const where: any = {
      company_id: parseInt(companyId),
    };

    if (startDate && endDate) {
      where.trade_date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [quotes, total] = await Promise.all([
      prisma.quote__stock_constituent_daily.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { trade_date: 'desc' },
        include: {
          info__stock_company: {
            select: {
              company_name: true,
              company_code: true,
            },
          },
        },
      }),
      prisma.quote__stock_constituent_daily.count({ where }),
    ]);

    return NextResponse.json({
      data: quotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取行情数据失败:', error);
    return NextResponse.json({ error: '获取行情数据失败' }, { status: 500 });
  }
}
