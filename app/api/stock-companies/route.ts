import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { StockCompanyListResponse } from '@/types'

// GET /api/stock-companies - 获取所有股票公司信息
export async function GET(request: NextRequest): Promise<NextResponse<StockCompanyListResponse | { error: string }>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const name = searchParams.get('name')
    const industry = searchParams.get('industry')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}

    if (code) {
      where.company_code = { contains: code }
    }

    if (name) {
      where.company_name = { contains: name }
    }

    if (industry) {
      where.industry = industry
    }

    const [companies, total] = await Promise.all([
      prisma.info__stock_company.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          company_code: 'asc',
        },
      }),
      prisma.info__stock_company.count({ where }),
    ])

    return NextResponse.json({
      data: companies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取股票公司列表失败:', error)
    return NextResponse.json(
      { error: '获取股票公司列表失败' },
      { status: 500 }
    )
  }
}

// POST /api/stock-companies - 创建公司
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // 校验必填字段
    if (!data.company_name || !data.company_code || !data.company_akshare_code) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 检查是否已存在
    const existing = await prisma.info__stock_company.findFirst({
      where: {
        OR: [
          { company_code: data.company_code },
          { company_akshare_code: data.company_akshare_code },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ error: '公司代码已存在' }, { status: 400 });
    }

    // 创建公司
    const company = await prisma.info__stock_company.create({
      data: {
        company_name: data.company_name,
        company_code: data.company_code,
        company_akshare_code: data.company_akshare_code,
        industry: data.industry || null,
        ipo_date: data.ipo_date ? new Date(data.ipo_date) : null,
        total_shares: data.total_shares ? parseFloat(data.total_shares) : null,
        circulating_shares: data.circulating_shares ? parseFloat(data.circulating_shares) : null,
      },
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error('创建公司失败:', error);
    return NextResponse.json({ error: '创建公司失败' }, { status: 500 });
  }
}
