import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/stock-boards/[id] - 获取行业板块详情（包含公司和分析报告）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const boardId = parseInt((await params).id)
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

// PUT /api/stock-boards/[id] - 更新板块名称
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const boardId = parseInt((await params).id)
    const body = await request.json()
    const { board_name } = body

    if (!board_name) {
      return NextResponse.json(
        { error: 'Board name is required' },
        { status: 400 }
      )
    }

    const board = await prisma.info__stock_board.update({
      where: { id: boardId },
      data: { board_name },
    })

    return NextResponse.json({
      data: board,
    })
  } catch (error) {
    console.error('Failed to update stock board:', error)
    return NextResponse.json(
      { error: 'Failed to update stock board' },
      { status: 500 }
    )
  }
}

// DELETE /api/stock-boards/[id] - 删除板块
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const boardId = parseInt((await params).id)

    await prisma.info__stock_board.delete({
      where: { id: boardId },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Failed to delete stock board:', error)
    return NextResponse.json(
      { error: 'Failed to delete stock board' },
      { status: 500 }
    )
  }
}
