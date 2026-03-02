import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/milestones - 获取里程碑列表（支持按行业ID、公司ID和日期范围筛选）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const industryId = searchParams.get('industryId')
    const companyId = searchParams.get('companyId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    // 按关联的行业或公司筛选
    if (industryId || companyId) {
      where.relation__industry_or_company_milestone = {
        some: {
          ...(industryId && { industry_id: parseInt(industryId) }),
          ...(companyId && { company_id: parseInt(companyId) }),
        }
      }
    }

    // 按日期范围筛选
    if (startDate || endDate) {
      where.milestone_date = {}
      if (startDate) {
        where.milestone_date.gte = new Date(startDate)
      }
      if (endDate) {
        where.milestone_date.lte = new Date(endDate)
      }
    }

    const milestones = await prisma.info__milestone.findMany({
      where,
      include: {
        relation__industry_or_company_milestone: {
          include: {
            info__industry: true,
            info__stock_company: true,
          },
        },
      },
      orderBy: {
        milestone_date: 'asc',
      },
    })

    return NextResponse.json({ data: milestones })
  } catch (error) {
    console.error('Failed to fetch milestones:', error)
    return NextResponse.json(
      { error: 'Failed to fetch milestones' },
      { status: 500 }
    )
  }
}

// POST /api/milestones - 创建里程碑
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, milestone_date, status = 'planned', keyword, industry_ids = [], company_ids = [] } = body

    if (!title || !milestone_date) {
      return NextResponse.json(
        { error: '标题和日期不能为空' },
        { status: 400 }
      )
    }

    // 创建里程碑及其关联
    const milestone = await prisma.info__milestone.create({
      data: {
        title,
        description: description || null,
        milestone_date: new Date(milestone_date),
        status,
        keyword: keyword || null,
        relation__industry_or_company_milestone: {
          create: [
            ...industry_ids.map((id: number) => ({ industry_id: id })),
            ...company_ids.map((id: number) => ({ company_id: id })),
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
    console.error('Failed to create milestone:', error)
    return NextResponse.json(
      { error: 'Failed to create milestone' },
      { status: 500 }
    )
  }
}
