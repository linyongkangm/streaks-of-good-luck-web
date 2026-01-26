import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/tweets-by-summary - 根据 collect_from 和 date 获取相关推文
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const collectFrom = searchParams.get('collect_from')
    const date = searchParams.get('date')

    if (!collectFrom || !date) {
      return NextResponse.json(
        { error: 'collect_from and date are required' },
        { status: 400 }
      )
    }

    const targetDate = new Date(date)
    const nextDate = new Date(targetDate)
    nextDate.setDate(nextDate.getDate() + 1)

    const tweets = await prisma.info__tweet.findMany({
      where: {
        collect_from: collectFrom,
        tweet_date: {
          gte: targetDate,
          lt: nextDate,
        },
      },
      orderBy: {
        tweet_date: 'desc',
      },
    })

    return NextResponse.json({
      data: tweets,
    })
  } catch (error) {
    console.error('Failed to fetch tweets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tweets' },
      { status: 500 }
    )
  }
}
