import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/industries/[id]/core-data - 获取行业的核心数据
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const industryId = parseInt((await params).id)
    if (isNaN(industryId)) {
      return NextResponse.json({ error: 'Invalid industry ID' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')

    const where: any = { industry_id: industryId }
    if (table) {
      where.table = table
    }

    const coreData = await prisma.info__core_data.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { create_time: 'desc' },
      ],
    })

    return NextResponse.json({ data: coreData })
  } catch (error) {
    console.error('Failed to fetch core data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch core data' },
      { status: 500 }
    )
  }
}

// POST /api/industries/[id]/core-data - 创建行业的核心数据
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
    const { table, data, date } = body

    if (!table || !data || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: table, data, date' },
        { status: 400 }
      )
    }

    const parsedDate = new Date(date)
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    const coreData = await prisma.info__core_data.create({
      data: {
        industry_id: industryId,
        date: parsedDate,
        table,
        data,
      },
    })

    return NextResponse.json({ data: coreData }, { status: 201 })
  } catch (error) {
    console.error('Failed to create core data:', error)
    return NextResponse.json(
      { error: 'Failed to create core data' },
      { status: 500 }
    )
  }
}

// PUT /api/industries/[id]/core-data - 更新行业的核心数据
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const industryId = parseInt((await params).id)
    if (isNaN(industryId)) {
      return NextResponse.json({ error: 'Invalid industry ID' }, { status: 400 })
    }

    const body = await request.json()
    const { core_data_id, table, data, date } = body

    if (!core_data_id) {
      return NextResponse.json(
        { error: 'Missing required field: core_data_id' },
        { status: 400 }
      )
    }

    const parsedDate = date !== undefined ? new Date(date) : undefined
    if (date !== undefined && parsedDate && Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    const coreData = await prisma.info__core_data.update({
      where: {
        id: core_data_id,
        industry_id: industryId,
      },
      data: {
        ...(date !== undefined && { date: parsedDate }),
        ...(table !== undefined && { table }),
        ...(data !== undefined && { data }),
      },
    })

    return NextResponse.json({ data: coreData })
  } catch (error) {
    console.error('Failed to update core data:', error)
    return NextResponse.json(
      { error: 'Failed to update core data' },
      { status: 500 }
    )
  }
}

// DELETE /api/industries/[id]/core-data - 删除行业的核心数据
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
    const coreDataId = searchParams.get('core_data_id')

    if (!coreDataId) {
      return NextResponse.json(
        { error: 'Missing required parameter: core_data_id' },
        { status: 400 }
      )
    }

    await prisma.info__core_data.delete({
      where: {
        id: parseInt(coreDataId),
        industry_id: industryId,
      },
    })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Failed to delete core data:', error)
    return NextResponse.json(
      { error: 'Failed to delete core data' },
      { status: 500 }
    )
  }
}
