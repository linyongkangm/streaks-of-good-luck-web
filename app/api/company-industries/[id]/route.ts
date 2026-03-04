import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// DELETE /api/company-industries/[id] - 删除公司-行业关联
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const relationId = Number(id)

    if (Number.isNaN(relationId)) {
      return NextResponse.json({ error: 'Invalid relation ID' }, { status: 400 })
    }

    await prisma.relation__industry_company.delete({
      where: { id: relationId },
    })

    return NextResponse.json({ message: 'Relation deleted successfully' })
  } catch (error) {
    console.error('删除公司-行业关联失败:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/company-industries/[id] - 更新权重
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const relationId = Number(id)

    if (Number.isNaN(relationId)) {
      return NextResponse.json({ error: 'Invalid relation ID' }, { status: 400 })
    }

    const body = await req.json()
    const { weight } = body

    const relation = await prisma.relation__industry_company.update({
      where: { id: relationId },
      data: { weight },
      include: {
        info__industry: true,
        info__stock_company: true,
      },
    })

    return NextResponse.json({ data: relation })
  } catch (error) {
    console.error('更新公司-行业关联失败:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
