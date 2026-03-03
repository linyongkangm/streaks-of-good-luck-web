import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PUT /api/industries/[id]/templates/[relationId] - 更新模板关联的自定义名称和公式
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
    const { rename, core_formula } = body

    // 验证该关联确实属于该行业
    const existingRelation = await prisma.relation__industry_or_company_core_statistic_template.findUnique({
      where: { id: relationId },
      include: { info__core_statistic_template: true },
    })

    if (!existingRelation || existingRelation.industry_id !== industryId) {
      return NextResponse.json(
        { error: 'Relation not found or does not belong to this industry' },
        { status: 404 }
      )
    }

    // 如果要更新公式，先更新模板
    let templateData = existingRelation.info__core_statistic_template
    if (core_formula !== undefined && core_formula !== null) {
      templateData = await prisma.info__core_statistic_template.update({
        where: { id: existingRelation.core_statistic_template_id },
        data: {
          core_formula: core_formula || templateData.core_formula,
        },
      })
    }

    // 更新关联关系中的rename字段
    const updatedRelation = await prisma.relation__industry_or_company_core_statistic_template.update({
      where: { id: relationId },
      data: {
        rename: rename !== undefined ? (rename || null) : undefined,
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
