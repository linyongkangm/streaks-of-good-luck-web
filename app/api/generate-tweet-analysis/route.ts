import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import * as tools from '@/app/tools'
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000'

// POST /api/generate-tweet-analysis - 为特定日期和来源生成推文分析
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { collect_from, date } = body

    if (!collect_from || !date) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数：collect_from 和 date' },
        { status: 400 }
      )
    }

    // 验证日期格式 (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { success: false, message: '日期格式不正确，应为 YYYY-MM-DD' },
        { status: 400 }
      )
    }

    console.log(`Fetching tweets for ${collect_from} on ${date}...`)

    // 获取指定日期和来源的所有推文
    // date 是美东时间的日期，需要转换为 UTC 时间范围查询
    // tweet_date 存储的是 UTC 时间
    const startET = tools.fromISOUseEastern(date).startOf('day')
    const tweets = await prisma.info__tweet.findMany({
      where: {
        collect_from: collect_from,
        tweet_date: {
          gte: startET.toJSDate(),
          lt: startET.plus({ days: 1 }).toJSDate(),
        },
      },
      orderBy: { tweet_date: 'asc' },
    })

    if (tweets.length === 0) {
      return NextResponse.json(
        { success: false, message: `在 ${date} 未找到来自 ${collect_from} 的推文` },
        { status: 404 }
      )
    }

    console.log(`Found ${tweets.length} tweets for ${collect_from} on ${date}`)

    // 转换为 API 需要的格式
    const tweetInfos = tweets.map((tweet) => ({
      tweet_date: tweet.tweet_date.toISOString().split('T')[0],
      user_name: tweet.user_name,
      tweet_from: tweet.tweet_from,
      tweet_text: tweet.tweet_text,
    }))

    // 调用 Python API 生成分析
    console.log(`Calling Python API: ${PYTHON_API_URL}/analyze-tweet`)
    const response = await fetch(`${PYTHON_API_URL}/analyze-tweet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        collect_from: collect_from,
        date: date,
        tweet_infos: tweetInfos,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()
    console.log(`Successfully received analysis result for ${collect_from} on ${date}:`, result)

    // 如果分析成功，保存结果到数据库
    if (result.success && result.analysis) {
      console.log(`Saving analysis result to database for ${collect_from} on ${date}...`)

      const summary = result.analysis.summary || ''

      const targetDate = tools.fromISOUseUTC(date).toJSDate()
      // 使用 upsert 来插入或更新记录
      await prisma.summary__tweet.upsert({
        where: {
          collect_from_date: {
            collect_from: collect_from,
            date: targetDate,
          },
        },
        update: {
          summary: summary,
          update_time: new Date(),
        },
        create: {
          collect_from: collect_from,
          date: targetDate,
          summary: summary,
          create_time: new Date(),
          update_time: new Date(),
        },
      })

      console.log(`✓ Analysis result saved for ${collect_from} on ${date}`)
    }

    return NextResponse.json({
      success: true,
      message: '分析生成成功',
      count: tweets.length,
      data: result,
    })
  } catch (error) {
    console.error('Failed to generate analysis:', error)
    return NextResponse.json(
      {
        success: false,
        message: '服务器错误：无法生成分析',
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}
