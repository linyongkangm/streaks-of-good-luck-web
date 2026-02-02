import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import * as tools from '@/app/tools'
// GET /api/article-summaries - 获取文章摘要列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const title = searchParams.get('title')
    const tags = searchParams.get('tags')
    const publication = searchParams.get('publication')
    const issue_date = searchParams.get('issue_date')
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
    if (issue_date) {
      // 仅匹配日期部分
      const startET = tools.fromISOUseUTC(issue_date).startOf('day')
      where.issue_date = {
        gte: startET.toJSDate(),
        lt: startET.plus({ days: 1 }).toJSDate(),
      }
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
