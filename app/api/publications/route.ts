import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/publications - 获取所有刊物列表（去重）
export async function GET() {
  try {
    const publications = await prisma.summary__article.findMany({
      where: {
        publication: {
          not: null
        }
      },
      select: {
        publication: true
      },
      distinct: ['publication'],
      orderBy: {
        publication: 'asc'
      }
    })

    const publicationList = publications
      .map(p => p.publication)
      .filter((p): p is string => p !== null)

    return NextResponse.json({
      data: publicationList
    })
  } catch (error) {
    console.error('Failed to fetch publications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch publications' },
      { status: 500 }
    )
  }
}
