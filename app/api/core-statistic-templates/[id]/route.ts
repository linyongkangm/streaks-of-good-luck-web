import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/core-statistic-templates/[id] - 获取单个核心统计模板
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 })
    }

    const template = await prisma.info__core_statistic_template.findUnique({
      where: { id },
      include: {
        relation__industry_or_company_core_statistic_template: {
          include: {
            info__industry: true,
            info__stock_company: true,
          },
        },
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ data: template })
  } catch (error) {
    console.error('Failed to fetch core statistic template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch core statistic template' },
      { status: 500 }
    )
  }
}

// PUT /api/core-statistic-templates/[id] - 更新核心统计模板
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 })
    }

    const body = await request.json()
    const { name, relate_table, core_formula, description } = body

    const template = await prisma.info__core_statistic_template.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(relate_table !== undefined && { relate_table }),
        ...(core_formula !== undefined && { core_formula }),
        ...(description !== undefined && { description }),
      },
    })

    return NextResponse.json({ data: template })
  } catch (error) {
    console.error('Failed to update core statistic template:', error)
    return NextResponse.json(
      { error: 'Failed to update core statistic template' },
      { status: 500 }
    )
  }
}

// DELETE /api/core-statistic-templates/[id] - 删除核心统计模板
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 })
    }

    await prisma.info__core_statistic_template.delete({
      where: { id },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Failed to delete core statistic template:', error)
    return NextResponse.json(
      { error: 'Failed to delete core statistic template' },
      { status: 500 }
    )
  }
}
