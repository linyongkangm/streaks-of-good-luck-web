import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const company_id = parseInt(searchParams.get('company_id') || '')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!company_id) {
      return NextResponse.json({ error: '缺少company_id参数' }, { status: 400 })
    }

    const skip = (page - 1) * limit

    // 查询视图数据
    const data = await prisma.view_financial_statements.findMany({
      where: {
        company_id: company_id,
      },
      orderBy: {
        report_date: 'desc',
      },
      take: limit,
      skip: skip,
    })

    // 查询总数
    const total = await prisma.view_financial_statements.count({
      where: {
        company_id: company_id,
      },
    })
    
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })

  } catch (error: any) {
    console.error('查询财务报表视图失败:', error)
    return NextResponse.json(
      { error: '查询财务报表视图失败', details: error.message },
      { status: 500 }
    )
  }
}
