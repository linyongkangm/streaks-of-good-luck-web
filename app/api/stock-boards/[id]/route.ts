import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/stock-boards/[id] - 获取行业板块详情（包含公司和分析报告）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const boardId = parseInt(params.id)

    const board = await prisma.info__stock_board.findUnique({
      where: { id: boardId },
      include: {
        relation__stock_board_company: {
          include: {
            info__stock_company: true,
          },
          orderBy: {
            weight: 'desc',
          },
        },
        relation__board_industry_analysis: {
          include: {
            info__industry_analysis: true,
          },
          orderBy: {
            create_time: 'desc',
          },
        },
      },
    })

    if (!board) {
      return NextResponse.json(
        { error: 'Stock board not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data: board,
    })
  } catch (error) {
    console.error('Failed to fetch stock board:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock board' },
      { status: 500 }
    )
  }
}
