import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/article-summaries - 获取文章摘要列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const title = searchParams.get('title')
    const tags = searchParams.get('tags')
    const publication = searchParams.get('publication')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}

    if (title) {
      where.title = { contains: title }
    }

    if (tags) {
      where.tags = { contains: tags }
    }

    if (publication) {
      where.publication = publication
    }

    const [articles, total] = await Promise.all([
      prisma.summary__article.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { issue_date: "desc" },
          { update_time: "desc" }
        ],
      }),
      prisma.summary__article.count({ where }),
    ])

    return NextResponse.json({
      data: articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch article summaries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch article summaries' },
      { status: 500 }
    )
  }
}
