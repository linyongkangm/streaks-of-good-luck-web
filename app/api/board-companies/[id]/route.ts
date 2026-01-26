import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PUT /api/board-companies/[id] - 更新公司权重
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const relationId = parseInt((await params).id)
    const body = await request.json()
    const { weight } = body

    if (weight === undefined) {
      return NextResponse.json(
        { error: 'Weight is required' },
        { status: 400 }
      )
    }

    const relation = await prisma.relation__stock_board_company.update({
      where: { id: relationId },
      data: { weight },
      include: {
        info__stock_company: true,
      },
    })

    return NextResponse.json({
      data: relation,
    })
  } catch (error) {
    console.error('Failed to update company weight:', error)
    return NextResponse.json(
      { error: 'Failed to update company weight' },
      { status: 500 }
    )
  }
}

// DELETE /api/board-companies/[id] - 从板块移除公司
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const relationId = parseInt((await params).id)

    await prisma.relation__stock_board_company.delete({
      where: { id: relationId },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Failed to remove company from board:', error)
    return NextResponse.json(
      { error: 'Failed to remove company from board' },
      { status: 500 }
    )
  }
}
