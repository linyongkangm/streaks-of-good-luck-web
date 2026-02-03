import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const stock_code = searchParams.get('stock_code')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!stock_code) {
      return NextResponse.json({ error: '缺少stock_code参数' }, { status: 400 })
    }

    const skip = (page - 1) * limit

    // 查询视图数据
    const data = await prisma.$queryRaw`
      SELECT * FROM view_financial_statements
      WHERE stock_code = ${stock_code}
      ORDER BY report_date DESC
      LIMIT ${limit} OFFSET ${skip}
    `

    // 查询总数
    const countResult = await prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*) as total FROM view_financial_statements
      WHERE stock_code = ${stock_code}
    `
    
    const total = Number(countResult[0]?.total || 0)
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
