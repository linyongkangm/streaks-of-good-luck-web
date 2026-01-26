import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/stock-boards - 获取所有行业板块
export async function GET() {
  try {
    const boards = await prisma.info__stock_board.findMany({
      orderBy: {
        board_name: 'asc',
      },
    })

    return NextResponse.json({
      data: boards,
    })
  } catch (error) {
    console.error('Failed to fetch stock boards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock boards' },
      { status: 500 }
    )
  }
}

// POST /api/stock-boards - 创建新板块
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { board_name } = body

    if (!board_name) {
      return NextResponse.json(
        { error: 'Board name is required' },
        { status: 400 }
      )
    }

    const board = await prisma.info__stock_board.create({
      data: {
        board_name,
      },
    })

    return NextResponse.json({
      data: board,
    })
  } catch (error) {
    console.error('Failed to create stock board:', error)
    return NextResponse.json(
      { error: 'Failed to create stock board' },
      { status: 500 }
    )
  }
}
