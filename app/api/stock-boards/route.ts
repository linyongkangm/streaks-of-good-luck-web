import { NextResponse } from 'next/server'
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
