import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extractMilestoneKeyword } from '@/app/tools/extractMilestoneKeyword'

// GET /api/milestones/:id - 获取单个里程碑详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id)

    const milestone = await prisma.info__milestone.findUnique({
      where: { id },
      include: {
        relation__industry_or_company_milestone: {
          include: {
            info__industry: true,
            info__stock_company: true,
          },
        },
      },
    })

    if (!milestone) {
      return NextResponse.json(
        { error: '里程碑不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: milestone })
  } catch (error) {
    console.error('Failed to fetch milestone:', error)
    return NextResponse.json(
      { error: 'Failed to fetch milestone' },
      { status: 500 }
    )
  }
}

// PUT /api/milestones/:id - 更新里程碑
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id)
    const body = await request.json()
    const { title, description, milestone_date, status, industry_ids = [], company_ids = [] } = body

    if (!title || !milestone_date) {
      return NextResponse.json(
        { error: '标题和日期不能为空' },
        { status: 400 }
      )
    }

    const keyword = await extractMilestoneKeyword(title, description)

    // 先删除旧的关联，再创建新的
    await prisma.relation__industry_or_company_milestone.deleteMany({
      where: { milestone_id: id },
    })

    const milestone = await prisma.info__milestone.update({
      where: { id },
      data: {
        title,
        description: description || null,
        milestone_date: new Date(milestone_date),
        status,
        keyword,
        relation__industry_or_company_milestone: {
          create: [
            ...industry_ids.map((industryId: number) => ({ industry_id: industryId })),
            ...company_ids.map((companyId: number) => ({ company_id: companyId })),
          ],
        },
      },
      include: {
        relation__industry_or_company_milestone: {
          include: {
            info__industry: true,
            info__stock_company: true,
          },
        },
      },
    })

    return NextResponse.json({ data: milestone })
  } catch (error) {
    console.error('Failed to update milestone:', error)
    return NextResponse.json(
      { error: 'Failed to update milestone' },
      { status: 500 }
    )
  }
}

// DELETE /api/milestones/:id - 删除里程碑
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id)

    await prisma.info__milestone.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete milestone:', error)
    return NextResponse.json(
      { error: 'Failed to delete milestone' },
      { status: 500 }
    )
  }
}
