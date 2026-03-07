import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface LinkMilestonesBody {
  milestone_ids?: number[]
  industry_id?: number
  company_id?: number
}

// POST /api/milestones/link - 批量写入里程碑关联关系
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LinkMilestonesBody
    const milestoneIds = Array.from(new Set(body.milestone_ids || []))
    const industryId = body.industry_id
    const companyId = body.company_id

    if (!milestoneIds.length) {
      return NextResponse.json({ error: '请选择至少一个事件' }, { status: 400 })
    }

    if (!industryId && !companyId) {
      return NextResponse.json({ error: 'industry_id 或 company_id 必须提供一个' }, { status: 400 })
    }

    if (industryId && companyId) {
      return NextResponse.json({ error: 'industry_id 和 company_id 不能同时提供' }, { status: 400 })
    }

    const existing = await prisma.relation__industry_or_company_milestone.findMany({
      where: {
        milestone_id: {
          in: milestoneIds,
        },
        ...(industryId ? { industry_id: industryId } : {}),
        ...(companyId ? { company_id: companyId } : {}),
      },
      select: {
        milestone_id: true,
      },
    })

    const existingMilestoneIdSet = new Set(existing.map((item) => item.milestone_id))

    const createData = milestoneIds
      .filter((id) => !existingMilestoneIdSet.has(id))
      .map((id) => ({
        milestone_id: id,
        ...(industryId ? { industry_id: industryId } : {}),
        ...(companyId ? { company_id: companyId } : {}),
      }))

    if (createData.length > 0) {
      await prisma.relation__industry_or_company_milestone.createMany({
        data: createData,
      })
    }

    return NextResponse.json({
      data: {
        created: createData.length,
        skipped: milestoneIds.length - createData.length,
      },
    })
  } catch (error) {
    console.error('Failed to link milestones:', error)
    return NextResponse.json(
      { error: 'Failed to link milestones' },
      { status: 500 }
    )
  }
}
