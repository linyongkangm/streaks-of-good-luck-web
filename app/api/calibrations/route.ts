import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/calibrations - 获取所有口径
export async function GET(request: NextRequest) {
  try {
    const calibrations = await prisma.info__calibration.findMany({
      orderBy: { create_time: 'desc' },
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

    return NextResponse.json({ data: calibrations })
  } catch (error) {
    console.error('Failed to fetch calibrations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calibrations' },
      { status: 500 }
    )
  }
}

// POST /api/calibrations - 创建口径
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      )
    }

    const calibration = await prisma.info__calibration.create({
      data: {
        name,
        description,
      },
    })

    return NextResponse.json({ data: calibration }, { status: 201 })
  } catch (error) {
    console.error('Failed to create calibration:', error)
    return NextResponse.json(
      { error: 'Failed to create calibration' },
      { status: 500 }
    )
  }
}
