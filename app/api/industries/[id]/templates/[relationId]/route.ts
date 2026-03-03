import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PUT /api/industries/[id]/templates/[relationId] - 更新模板关联的自定义名称
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; relationId: string } }
) {
  try {
    const industryId = parseInt((await params).id)
    const relationId = parseInt((await params).relationId)

    if (isNaN(industryId) || isNaN(relationId)) {
      return NextResponse.json({ error: 'Invalid industry ID or relation ID' }, { status: 400 })
    }

    const body = await request.json()
    const { rename } = body

    // 验证该关联确实属于该行业
    const existingRelation = await prisma.relation__industry_or_company_core_statistic_template.findUnique({
      where: { id: relationId },
    })

    if (!existingRelation || existingRelation.industry_id !== industryId) {
      return NextResponse.json(
        { error: 'Relation not found or does not belong to this industry' },
        { status: 404 }
      )
    }

    const updatedRelation = await prisma.relation__industry_or_company_core_statistic_template.update({
      where: { id: relationId },
      data: {
        rename: rename || null,
      },
      include: {
        info__core_statistic_template: true,
      },
    })

    return NextResponse.json({ data: updatedRelation })
  } catch (error) {
    console.error('Failed to update template relation:', error)
    return NextResponse.json(
      { error: 'Failed to update template relation' },
      { status: 500 }
    )
  }
}
