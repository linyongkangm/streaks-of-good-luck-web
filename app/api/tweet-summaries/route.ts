import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/tweet-summaries - 获取推文摘要列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const collectFrom = searchParams.get('collect_from')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const collectFromOnly = searchParams.get('collect_from_only')

    // 如果只需要获取 unique collect_from 列表
    if (collectFromOnly === 'true') {
      try {
        const uniqueCollectFroms = await prisma.summary__tweet.findMany({
          select: {
            collect_from: true,
          },
          distinct: ['collect_from'],
          orderBy: {
            collect_from: 'asc',
          },
        })

        return NextResponse.json({
          data: uniqueCollectFroms.map(item => item.collect_from),
        })
      } catch (error) {
        console.error('Failed to fetch unique collect_from list:', error)
        return NextResponse.json(
          { error: 'Failed to fetch unique collect_from list' },
          { status: 500 }
        )
      }
    }

    const where: any = {}

    if (collectFrom) {
      where.collect_from = { contains: collectFrom }
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = new Date(startDate)
      }
      if (endDate) {
        where.date.lte = new Date(endDate)
      }
    }

    const [summaries, total] = await Promise.all([
      prisma.summary__tweet.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { date: 'desc' },
          { collect_from: 'asc' },
        ],
      }),
      prisma.summary__tweet.count({ where }),
    ])

    return NextResponse.json({
      data: summaries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch tweet summaries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tweet summaries' },
      { status: 500 }
    )
  }
}
