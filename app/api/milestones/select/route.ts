import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/milestones/select - 从 info__milestone 拉取候选事件（支持筛选）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const industryIdParam = searchParams.get('industryId')
    const companyIdParam = searchParams.get('companyId')
    const title = searchParams.get('title')?.trim()
    const keyword = searchParams.get('keyword')?.trim()
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const onlyUnlinked = searchParams.get('onlyUnlinked') !== 'false'
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 300)

    const industryId = industryIdParam ? parseInt(industryIdParam, 10) : undefined
    const companyId = companyIdParam ? parseInt(companyIdParam, 10) : undefined

    const where: any = {}

    if (title) {
      where.title = {
        contains: title,
      }
    }

    if (keyword) {
      where.keyword = {
        contains: keyword,
      }
    }

    if (startDate || endDate) {
      where.milestone_date = {}
      if (startDate) {
        where.milestone_date.gte = new Date(startDate)
      }
      if (endDate) {
        where.milestone_date.lte = new Date(endDate)
      }
    }

    // 仅返回未关联项时，提前在查询层排除已关联事件
    if (onlyUnlinked && (industryId || companyId)) {
      where.relation__industry_or_company_milestone = {
        none: {
          ...(industryId ? { industry_id: industryId } : {}),
          ...(companyId ? { company_id: companyId } : {}),
        },
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
        summary__article: true,
      },
      orderBy: [
        {
          milestone_date: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: Number.isNaN(limit) ? 100 : limit,
    })

    const result = milestones.map((milestone) => {
      const linked = milestone.relation__industry_or_company_milestone.some((relation) => {
        if (industryId) {
          return relation.industry_id === industryId
        }
        if (companyId) {
          return relation.company_id === companyId
        }
        return false
      })

      return {
        ...milestone,
        linked,
      }
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Failed to select milestones:', error)
    return NextResponse.json(
      { error: 'Failed to select milestones' },
      { status: 500 }
    )
  }
}
