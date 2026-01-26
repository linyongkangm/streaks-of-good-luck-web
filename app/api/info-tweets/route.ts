import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { TweetListResponse, ApiError } from '@/types'

// GET /api/info-tweets - 获取推文列表
export async function GET(request: NextRequest): Promise<NextResponse<TweetListResponse | ApiError>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const userName = searchParams.get('user_name')
    const tweetFrom = searchParams.get('tweet_from')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}

    if (userName) {
      where.user_name = { contains: userName }
    }

    if (tweetFrom) {
      where.tweet_from = tweetFrom
    }

    if (startDate || endDate) {
      where.tweet_date = {}
      if (startDate) {
        where.tweet_date.gte = new Date(startDate)
      }
      if (endDate) {
        where.tweet_date.lte = new Date(endDate)
      }
    }

    const [tweets, total] = await Promise.all([
      prisma.info__tweet.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          tweet_date: 'desc',
        },
      }),
      prisma.info__tweet.count({ where }),
    ])

    return NextResponse.json({
      data: tweets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('获取推文列表失败:', error)
    return NextResponse.json(
      { error: '获取推文列表失败' },
      { status: 500 }
    )
  }
}

// POST /api/info-tweets - 创建推文
export async function POST(request: NextRequest): Promise<NextResponse<{ data: any } | ApiError>> {
  try {
    const body = await request.json()
    
    const {
      tweet_id,
      user_name,
      tweet_date,
      tweet_text,
      reply_count,
      retweet_count,
      like_count,
      view_count,
      tweet_url,
      tweet_from,
      collect_from,
    } = body

    // 验证必填字段
    if (!tweet_id || !user_name || !tweet_date || !tweet_text || !tweet_url || !tweet_from || !collect_from) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 检查 tweet_id 是否已存在
    const existingTweet = await prisma.info__tweet.findUnique({
      where: { tweet_id },
    })

    if (existingTweet) {
      return NextResponse.json(
        { error: '该推文ID已存在' },
        { status: 409 }
      )
    }

    const tweet = await prisma.info__tweet.create({
      data: {
        tweet_id,
        user_name,
        tweet_date: new Date(tweet_date),
        tweet_text,
        reply_count: reply_count || '0',
        retweet_count: retweet_count || '0',
        like_count: like_count || '0',
        view_count: view_count || '0',
        tweet_url,
        tweet_from,
        collect_from,
      },
    })

    return NextResponse.json({ data: tweet }, { status: 201 })
  } catch (error) {
    console.error('创建推文失败:', error)
    return NextResponse.json(
      { error: '创建推文失败' },
      { status: 500 }
    )
  }
}
