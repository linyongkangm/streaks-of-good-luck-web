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
