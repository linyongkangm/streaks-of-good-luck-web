import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import * as tools from '@/app/tools'
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

    const startET = tools.fromISOUseEastern(date).startOf('day')
    console.log('Fetching tweets for', collectFrom, 'on', startET.toJSDate())  
    const tweets = await prisma.info__tweet.findMany({
      where: {
        collect_from: collectFrom,
        tweet_date: {
          gte: startET.toJSDate(),
          lt: startET.plus({ days: 1 }).toJSDate(),
        },
      },
      orderBy: {
        tweet_date: 'desc',
      },
    })
    console.log(`Found ${tweets.length} tweets for ${collectFrom} on ${date}`)
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
