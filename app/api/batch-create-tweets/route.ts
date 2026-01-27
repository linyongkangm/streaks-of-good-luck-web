import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

const LUCK_ROOT = path.resolve(process.cwd(), "../streaks-of-good-luck")
const RUN_LUCK_PATH = path.resolve(LUCK_ROOT, ".venv/Scripts/python.exe")
const MAIN_PY = path.resolve(LUCK_ROOT, "src/main.py")

function runLuckCommand(commandName: string, params: object): string {
  const options = Object.entries(params)
    .map(([key, value]) => `--${key} "${value}"`)
    .join(' ')
  const command = `"${RUN_LUCK_PATH}" "${MAIN_PY}" ${commandName} ${options}`
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

    // 提取成功创建的推文的日期和 collect_from，按日期和来源分组
    const successfulRecords = tweetRecords.filter((_, index) => results[index].status === 'fulfilled')
    const successfulTweetIds = successfulRecords.map((record: any) => record.tweetID)
    const dateSourceMap = new Map<string, string>() // key: "collect_from|date"

    successfulRecords.forEach((record: any) => {
      const date = new Date(record.tweetDate).toISOString().split('T')[0]
      const key = `${record.collectFrom}|${date}`
      dateSourceMap.set(key, record.collectFrom)
    })

    // 对于每个日期和来源，检查是否已有分析，如果有则更新，没有则创建
    const analysisPromises = Array.from(dateSourceMap.entries()).map(
      async ([key, collectFrom]) => {
        const [source, date] = key.split('|')
        
        try {
          // 检查该日期和来源是否已有分析
          const existingAnalysis = await prisma.summary__tweet.findFirst({
            where: {
              collect_from: source,
              date: {
                gte: new Date(date),
                lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000), // next day
              },
            },
          })

          // 无论是否存在，都运行分析（update or create）
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
