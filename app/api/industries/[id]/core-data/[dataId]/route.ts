import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PUT /api/industries/[id]/core-data/[dataId] - 更新核心数据
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; dataId: string } }
) {
  try {
    const industryId = parseInt((await params).id)
    const dataId = parseInt((await params).dataId)

    if (isNaN(industryId) || isNaN(dataId)) {
      return NextResponse.json(
        { error: 'Invalid industry ID or data ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { data, date } = body

    if (!data) {
      return NextResponse.json(
        { error: 'Missing required field: data' },
        { status: 400 }
      )
    }

    // 验证数据包含工业ID
    const existingData = await prisma.info__core_data.findUnique({
      where: { id: dataId },
    })

    if (!existingData || existingData.industry_id !== industryId) {
      return NextResponse.json(
        { error: 'Core data not found or does not belong to this industry' },
        { status: 404 }
      )
    }

    // 解析日期如果提供了的话
    let parsedDate = existingData.date
    if (date) {
      parsedDate = new Date(date)
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        )
      }
    }

    const updatedData = await prisma.info__core_data.update({
      where: { id: dataId },
      data: {
        data,
        date: parsedDate,
      },
    })

    return NextResponse.json({ data: updatedData })
  } catch (error) {
    console.error('Failed to update core data:', error)
    return NextResponse.json(
      { error: 'Failed to update core data' },
      { status: 500 }
    )
  }
}

// DELETE /api/industries/[id]/core-data/[dataId] - 删除核心数据
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; dataId: string } }
) {
  try {
    const industryId = parseInt((await params).id)
    const dataId = parseInt((await params).dataId)

    if (isNaN(industryId) || isNaN(dataId)) {
      return NextResponse.json(
        { error: 'Invalid industry ID or data ID' },
        { status: 400 }
      )
    }

    // 验证数据包含工业ID
    const existingData = await prisma.info__core_data.findUnique({
      where: { id: dataId },
    })

    if (!existingData || existingData.industry_id !== industryId) {
      return NextResponse.json(
        { error: 'Core data not found or does not belong to this industry' },
        { status: 404 }
      )
    }

    await prisma.info__core_data.delete({
      where: { id: dataId },
    })

    return NextResponse.json({ data: { id: dataId } })
  } catch (error) {
    console.error('Failed to delete core data:', error)
    return NextResponse.json(
      { error: 'Failed to delete core data' },
      { status: 500 }
    )
  }
}
