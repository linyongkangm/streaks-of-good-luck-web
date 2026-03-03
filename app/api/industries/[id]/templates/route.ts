import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/industries/[id]/templates - 关联核心统计模板到行业
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const industryId = parseInt(params.id)
    if (isNaN(industryId)) {
      return NextResponse.json({ error: 'Invalid industry ID' }, { status: 400 })
    }

    const body = await request.json()
    const { template_id, rename } = body

    if (!template_id) {
      return NextResponse.json(
        { error: 'Missing required field: template_id' },
        { status: 400 }
      )
    }

    const relation = await prisma.relation__industry_or_company_core_statistic_template.create({
      data: {
        industry_id: industryId,
        core_statistic_template_id: template_id,
        rename,
      },
      include: {
        info__core_statistic_template: true,
      },
    })

    return NextResponse.json({ data: relation }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to link template to industry:', error)
    
    // 处理唯一约束冲突
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Template already linked to this industry' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to link template to industry' },
      { status: 500 }
    )
  }
}

// DELETE /api/industries/[id]/templates - 取消行业的核心统计模板关联
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const industryId = parseInt(params.id)
    if (isNaN(industryId)) {
      return NextResponse.json({ error: 'Invalid industry ID' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('template_id')

    if (!templateId) {
      return NextResponse.json(
        { error: 'Missing required parameter: template_id' },
        { status: 400 }
      )
    }

    await prisma.relation__industry_or_company_core_statistic_template.deleteMany({
      where: {
        industry_id: industryId,
        core_statistic_template_id: parseInt(templateId),
      },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Failed to unlink template from industry:', error)
    return NextResponse.json(
      { error: 'Failed to unlink template from industry' },
      { status: 500 }
    )
  }
}
