import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/industries/[id]/calibrations - 关联口径及子行业到行业
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const industryId = parseInt((await params).id)
    if (isNaN(industryId)) {
      return NextResponse.json({ error: 'Invalid industry ID' }, { status: 400 })
    }

    const body = await request.json()
    const { calibration_id, sub_industry_ids } = body

    if (!calibration_id || !sub_industry_ids || !Array.isArray(sub_industry_ids)) {
      return NextResponse.json(
        { error: 'Missing required fields: calibration_id, sub_industry_ids (array)' },
        { status: 400 }
      )
    }

    // 批量创建关联
    const relations = await Promise.all(
      sub_industry_ids.map((subIndustryId: number) =>
        prisma.relation__industry_or_company_calibration_industry.create({
          data: {
            industry_id: industryId,
            calibration_id,
            sub_industry_id: subIndustryId,
          },
          include: {
            info__calibration: true,
            sub_industry: true,
          },
        })
      )
    )

    return NextResponse.json({ data: relations }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to link calibration to industry:', error)
    
    // 处理唯一约束冲突
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Calibration with this sub-industry already linked' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to link calibration to industry' },
      { status: 500 }
    )
  }
}

// DELETE /api/industries/[id]/calibrations - 取消行业的口径关联
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const industryId = parseInt((await params).id)
    if (isNaN(industryId)) {
      return NextResponse.json({ error: 'Invalid industry ID' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const calibrationId = searchParams.get('calibration_id')
    const subIndustryId = searchParams.get('sub_industry_id')

    if (!calibrationId) {
      return NextResponse.json(
        { error: 'Missing required parameter: calibration_id' },
        { status: 400 }
      )
    }

    const where: any = {
      industry_id: industryId,
      calibration_id: parseInt(calibrationId),
    }

    // 如果指定了子行业，只删除特定的关联
    if (subIndustryId) {
      where.sub_industry_id = parseInt(subIndustryId)
    }

    await prisma.relation__industry_or_company_calibration_industry.deleteMany({
      where,
    })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Failed to unlink calibration from industry:', error)
    return NextResponse.json(
      { error: 'Failed to unlink calibration from industry' },
      { status: 500 }
    )
  }
}
