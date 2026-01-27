import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

const SCRIPT_ROOT = path.resolve(process.cwd(), "script")
const MAIN_PY = path.resolve(SCRIPT_ROOT, "main.py")

function runLuckCommand(commandName: string, params: object): string {
  const options = Object.entries(params)
    .map(([key, value]) => `--${key} "${value}"`)
    .join(' ')
  const command = `python "${MAIN_PY}" ${commandName} ${options}`
  return command
}

async function analyzeTweetsForDateAndSource(collectFrom: string, date: string) {
  try {
    const command = runLuckCommand('analyze-tweet', {
      url: collectFrom,
      date: date,
    })

    console.log('Running analyze command:', command)
    await execAsync(command, {
      encoding: 'utf8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    })
    console.log(`Successfully analyzed tweets for ${collectFrom} on ${date}`)
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
