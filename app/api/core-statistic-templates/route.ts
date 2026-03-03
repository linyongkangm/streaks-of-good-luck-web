import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/core-statistic-templates - 获取所有核心统计模板
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const relateTable = searchParams.get('relate_table')

    const where = relateTable ? { relate_table: relateTable } : undefined

    const templates = await prisma.info__core_statistic_template.findMany({
      where,
      orderBy: { create_time: 'desc' },
    })

    return NextResponse.json({ data: templates })
  } catch (error) {
    console.error('Failed to fetch core statistic templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch core statistic templates' },
      { status: 500 }
    )
  }
}

// POST /api/core-statistic-templates - 创建核心统计模板
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, relate_table, core_formula, description } = body

    if (!name || !relate_table || !core_formula) {
      return NextResponse.json(
        { error: 'Missing required fields: name, relate_table, core_formula' },
        { status: 400 }
      )
    }

    const template = await prisma.info__core_statistic_template.create({
      data: {
        name,
        relate_table,
        core_formula,
        description,
      },
    })

    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    console.error('Failed to create core statistic template:', error)
    return NextResponse.json(
      { error: 'Failed to create core statistic template' },
      { status: 500 }
    )
  }
}
