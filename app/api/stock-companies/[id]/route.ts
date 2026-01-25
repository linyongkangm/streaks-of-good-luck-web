import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { StockCompanyDetailResponse, ApiError } from '@/types'

// GET /api/stock-companies/[id] - 获取单个股票公司信息
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<StockCompanyDetailResponse | ApiError>> {
  try {
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: '无效的公司ID' },
        { status: 400 }
      )
    }

    const company = await prisma.info__stock_company.findUnique({
      where: { id },
      include: {
        indicator__company_finance: {
          orderBy: {
            report_date: 'desc',
          },
          take: 10, // 最近10期财务数据
        },
      },
    })
    if (!company) {
      return NextResponse.json(
        { error: '公司不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: company })
  } catch (error) {
    console.error('获取公司信息失败:', error)
    return NextResponse.json(
      { error: '获取公司信息失败' },
      { status: 500 }
    )
  }
}
