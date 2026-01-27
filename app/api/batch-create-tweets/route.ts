import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000'

async function analyzeTweetsForDateAndSource(collectFrom: string, date: string) {
  try {
    console.log(`Fetching tweets for ${collectFrom} on ${date}...`)
    
    // 1. 从数据库查询该日期和来源的所有推文
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
      orderBy: { tweet_date: 'asc' },
    })

    if (tweets.length === 0) {
      console.log(`No tweets found for ${collectFrom} on ${date}`)
      return { collectFrom, date, status: 'skipped', message: 'No tweets found' }
    }

    console.log(`Found ${tweets.length} tweets for ${collectFrom} on ${date}`)

    // 2. 转换为 API 需要的格式
    const tweetInfos = tweets.map((tweet) => ({
      tweet_date: tweet.tweet_date.toISOString().split('T')[0],
      user_name: tweet.user_name,
      tweet_from: tweet.tweet_from,
      tweet_text: tweet.tweet_text,
    }))

    // 3. 调用 Python API，传递 tweet_infos
    console.log(`Calling Python API: ${PYTHON_API_URL}/analyze-tweet`)
    const response = await fetch(`${PYTHON_API_URL}/analyze-tweet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        collect_from: collectFrom,
        date: date,
        tweet_infos: tweetInfos,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()
    console.log(`Successfully received analysis result for ${collectFrom} on ${date}:`, result)
    
    // 4. 如果分析成功，保存结果到数据库
    if (result.success && result.analysis) {
      console.log(`Saving analysis result to database for ${collectFrom} on ${date}...`)
      
      const targetDateObj = new Date(date)
      const summary = result.analysis.summary || ''
      
      // 使用 upsert 来插入或更新记录
      await prisma.summary__tweet.upsert({
        where: {
          collect_from_date: {
            collect_from: collectFrom,
            date: targetDateObj,
          },
        },
        update: {
          summary: summary,
          update_time: new Date(),
        },
        create: {
          collect_from: collectFrom,
          date: targetDateObj,
          summary: summary,
          create_time: new Date(),
          update_time: new Date(),
        },
      })
      
      console.log(`✓ Analysis result saved for ${collectFrom} on ${date}`)
    }
    
    return result
  } catch (error) {
    console.error(`Failed to analyze tweets for ${collectFrom} on ${date}:`, error)
    throw error
  }
}

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
    const dateSourceMap = new Map<string, string>() // key: "collect_from|date"

    successfulNewTweetRecords.forEach((record: any) => {
      const date = new Date(record.tweetDate).toISOString().split('T')[0]
      const key = `${record.collectFrom}|${date}`
      dateSourceMap.set(key, record.collectFrom)
    })

    // 对于每个有新推文的日期和来源，使用该日期/来源的全部推文触发分析
    const analysisPromises = Array.from(dateSourceMap.entries()).map(
      async ([key, collectFrom]) => {
        const [source, date] = key.split('|')

        try {
          // 只有当该日期/来源有新推文插入时，才触发分析
          // 分析会自动拉取该日期/来源的全部推文进行分析（update or create summary）
          await analyzeTweetsForDateAndSource(source, date)

          return { collectFrom: source, date, status: 'success' }
        } catch (error) {
          console.error(`Failed to analyze tweets for ${source} on ${date}:`, error)
          return { collectFrom: source, date, status: 'failed', error: String(error) }
        }
      }
    )

    const analysisResults = await Promise.allSettled(analysisPromises)
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
    })
  } catch (error) {
    console.error('Failed to batch create tweets:', error)
    return NextResponse.json(
      { error: 'Failed to batch create tweets' },
      { status: 500 }
    )
  }
}
