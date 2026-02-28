import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/industries - 获取行业列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const name = searchParams.get('name')

    const where: any = {}
    if (name) {
      where.name = { contains: name }
    }

    const industries = await prisma.info__industry.findMany({
      where,
      orderBy: { create_time: 'desc' },
      include: {
        _count: {
          select: { relation__industry_articles: true }
        }
      }
    })

    return NextResponse.json({ data: industries })
  } catch (error) {
    console.error('Failed to fetch industries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch industries' },
      { status: 500 }
    )
  }
}

// POST /api/industries - 新建行业
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: '行业名称不能为空' },
        { status: 400 }
      )
    }

    const industry = await prisma.info__industry.create({
      data: {
        name,
        description: description || null,
      },
    })

    return NextResponse.json({ data: industry })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: '该行业名称已存在' },
        { status: 400 }
      )
    }
    console.error('Failed to create industry:', error)
    return NextResponse.json(
      { error: 'Failed to create industry' },
      { status: 500 }
    )
  }
}
