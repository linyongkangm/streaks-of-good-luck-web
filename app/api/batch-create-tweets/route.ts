import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { analyzeTweetsForDateAndSource } from '@/app/tools/analyzeTweetsForDateAndSource';
import * as tools from '@/app/tools';
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

    // 先查询这些 tweet_ids 是否已存在
    const existingTweetIds = await prisma.info__tweet.findMany({
      where: {
        tweet_id: {
          in: tweetRecords.map((r: any) => r.tweetID),
        },
      },
      select: { tweet_id: true },
    })
    const existingTweetIdSet = new Set(existingTweetIds.map((t) => t.tweet_id))

    // 分离新推文和已存在的推文
    const newTweetRecords = tweetRecords.filter((r: any) => !existingTweetIdSet.has(r.tweetID))
    // 批量创建和更新推文
    const results = await Promise.allSettled([
      ...newTweetRecords.map((record: any) =>
        prisma.info__tweet.create({
          data: {
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
      ),
    ])

    const successful = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    // 只用新推文的记录来确定是否需要分析
    const successfulNewTweetRecords = newTweetRecords.filter((_, index) => results[index].status === 'fulfilled')
    const successfulTweetIds = successfulNewTweetRecords.map((record: any) => record.tweetID)

    const dateSourceSet = new Set<string>() // collectFrom|date

    successfulNewTweetRecords.forEach((record: any) => {
      const date = tools.toEastern(record.tweetDate).toFormat('yyyy-MM-dd');
      dateSourceSet.add(`${record.collectFrom}|${date}`);
    })


    // 并行处理每个有新推文的日期和来源
    const analysisResults = await Promise.allSettled(
      Array.from(dateSourceSet).map(async (dateSource) => {
        const [source, date] = dateSource.split('|');
        try {
          await analyzeTweetsForDateAndSource(source, date);
          return ({ status: 'fulfilled', value: { collectFrom: source, date, status: 'success' } });
        } catch (error) {
          console.error(`Failed to analyze tweets for ${source} on ${date}:`, error);
          return ({ status: 'rejected', reason: error, value: { collectFrom: source, date, status: 'failed', error: String(error) } });
        }
      })
    );
    const analysisSuccessful = analysisResults.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).status === 'success'
    ).length

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${successful} tweets, ${failed} failed. ${analysisSuccessful} analyses completed.`,
      total: tweetRecords.length,
      successful,
      failed,
      analysisCompleted: analysisSuccessful,
      successfulTweetIds,
      existingTweetIds: Array.from(existingTweetIdSet),
    })
  } catch (error) {
    console.error('Failed to batch create tweets:', error)
    return NextResponse.json(
      { error: 'Failed to batch create tweets' },
      { status: 500 }
    )
  }
}
