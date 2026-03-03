import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/calibrations/[id] - 获取单个口径
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid calibration ID' }, { status: 400 })
    }

    const calibration = await prisma.info__calibration.findUnique({
      where: { id },
      include: {
        relation__industry_or_company_calibration_industry: {
          include: {
            sub_industry: true,
            info__industry: true,
            info__stock_company: true,
          },
        },
      },
    })

    if (!calibration) {
      return NextResponse.json({ error: 'Calibration not found' }, { status: 404 })
    }

    return NextResponse.json({ data: calibration })
  } catch (error) {
    console.error('Failed to fetch calibration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calibration' },
      { status: 500 }
    )
  }
}

// PUT /api/calibrations/[id] - 更新口径
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid calibration ID' }, { status: 400 })
    }

    const body = await request.json()
    const { name, description } = body

    const calibration = await prisma.info__calibration.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
    })

    return NextResponse.json({ data: calibration })
  } catch (error) {
    console.error('Failed to update calibration:', error)
    return NextResponse.json(
      { error: 'Failed to update calibration' },
      { status: 500 }
    )
  }
}

// DELETE /api/calibrations/[id] - 删除口径
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid calibration ID' }, { status: 400 })
    }

    await prisma.info__calibration.delete({
      where: { id },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Failed to delete calibration:', error)
    return NextResponse.json(
      { error: 'Failed to delete calibration' },
      { status: 500 }
    )
  }
}
