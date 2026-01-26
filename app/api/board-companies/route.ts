import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/board-companies - 添加公司到板块
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { board_id, company_id, weight } = body

    if (!board_id || !company_id) {
      return NextResponse.json(
        { error: 'Board ID and Company ID are required' },
        { status: 400 }
      )
    }

    const relation = await prisma.relation__stock_board_company.create({
      data: {
        board_id,
        company_id,
        weight: weight || 0,
      },
      include: {
        info__stock_company: true,
      },
    })

    return NextResponse.json({
      data: relation,
    })
  } catch (error) {
    console.error('Failed to add company to board:', error)
    return NextResponse.json(
      { error: 'Failed to add company to board' },
      { status: 500 }
    )
  }
}
