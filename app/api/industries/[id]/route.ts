import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/industries/:id - 获取行业详情（含关联文章、核心统计）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id)

    const industry = await prisma.info__industry.findUnique({
      where: { id },
      include: {
        relation__industry_articles: {
          include: {
            summary__article: true,
          },
          orderBy: {
            summary__article: { issue_date: 'desc' }
          }
        },
        relation__industry_or_company_core_statistic_template: {
          include: {
            info__core_statistic_template: true,
          },
        },
        info__core_data: {
          orderBy: { create_time: 'desc' },
        },
        relation__industry_or_company_calibration_industry: {
          include: {
            info__calibration: true,
            sub_industry: true,
          },
        },
      },
    })

    if (!industry) {
      return NextResponse.json(
        { error: '行业不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: industry })
  } catch (error) {
    console.error('Failed to fetch industry:', error)
    return NextResponse.json(
      { error: 'Failed to fetch industry' },
      { status: 500 }
    )
  }
}

// PUT /api/industries/:id - 编辑行业
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id)
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: '行业名称不能为空' },
        { status: 400 }
      )
    }

    const industry = await prisma.info__industry.update({
      where: { id },
      data: {
        name,
        description: description || null,
      },
    })

    return NextResponse.json({ data: industry })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: '该行业名称已存在' },
        { status: 400 }
      )
    }
    console.error('Failed to update industry:', error)
    return NextResponse.json(
      { error: 'Failed to update industry' },
      { status: 500 }
    )
  }
}

// DELETE /api/industries/:id - 删除行业
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id)

    await prisma.info__industry.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete industry:', error)
    return NextResponse.json(
      { error: 'Failed to delete industry' },
      { status: 500 }
    )
  }
}
