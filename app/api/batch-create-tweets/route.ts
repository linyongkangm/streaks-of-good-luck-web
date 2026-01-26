import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/batch-create-tweets - 批量创建推文
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tweetRecords } = body

    if (!tweetRecords || !Array.isArray(tweetRecords)) {
      return NextResponse.json(
        { error: 'tweetRecords array is required' },
        { status: 400 }
      )
    }

    // 批量创建推文，使用 upsert 避免重复
    const results = await Promise.allSettled(
      tweetRecords.map((record: any) =>
        prisma.info__tweet.upsert({
          where: { tweet_id: record.tweetID },
          update: {
            user_name: record.userName,
            tweet_date: new Date(record.tweetDate),
            tweet_text: record.tweetText,
            reply_count: record.replyCount,
            retweet_count: record.retweetCount,
            like_count: record.likeCount,
            view_count: record.viewCount,
            tweet_url: record.tweetUrl,
            tweet_from: record.tweetFrom,
            collect_from: record.collectFrom,
          },
          create: {
            tweet_id: record.tweetID,
            user_name: record.userName,
            tweet_date: new Date(record.tweetDate),
            tweet_text: record.tweetText,
            reply_count: record.replyCount,
            retweet_count: record.retweetCount,
            like_count: record.likeCount,
            view_count: record.viewCount,
            tweet_url: record.tweetUrl,
            tweet_from: record.tweetFrom,
            collect_from: record.collectFrom,
          },
        })
      )
    )

    const successful = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${successful} tweets, ${failed} failed`,
      total: tweetRecords.length,
      successful,
      failed,
    })
  } catch (error) {
    console.error('Failed to batch create tweets:', error)
    return NextResponse.json(
      { error: 'Failed to batch create tweets' },
      { status: 500 }
    )
  }
}
