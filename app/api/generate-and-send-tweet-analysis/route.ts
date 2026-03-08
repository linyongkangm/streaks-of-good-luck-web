import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import * as tools from '@/app/tools'
import { analyzeTweetsForDateAndSource } from '@/app/tools/analyzeTweetsForDateAndSource'

interface GenerateAndSendBody {
  collect_from?: string
  date?: string
  action?: 'analyze' | 'send' | 'both'
}

// POST /api/generate-and-send-tweet-analysis
// 一键生成指定日期（默认今天美东）的推文分析并发送摘要
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateAndSendBody
    const selectedCollectFrom = body.collect_from?.trim()
    const action = body.action || 'both'

    // 默认使用今天的美东日期，格式 YYYY-MM-DD
    const targetDate = body.date || tools.toEastern(new Date()).toFormat('yyyy-MM-dd')
    const targetDateUTC = tools.fromISOUseUTC(targetDate).toJSDate()

    const collectFromsForAnalyze: string[] = []
    const collectFromsForSend: string[] = []

    if (selectedCollectFrom && selectedCollectFrom !== 'all') {
      collectFromsForAnalyze.push(selectedCollectFrom)
      collectFromsForSend.push(selectedCollectFrom)
    } else {
      const startET = tools.fromISOUseEastern(targetDate).startOf('day')
      const endET = startET.plus({ days: 1 })

      if (action === 'analyze' || action === 'both') {
        const analyzeSources = await prisma.info__tweet.findMany({
          where: {
            tweet_date: {
              gte: startET.toJSDate(),
              lt: endET.toJSDate(),
            },
          },
          select: {
            collect_from: true,
          },
          distinct: ['collect_from'],
        })
        collectFromsForAnalyze.push(...analyzeSources.map((item) => item.collect_from))
      }

      if (action === 'send' || action === 'both') {
        const sendSources = await prisma.summary__tweet.findMany({
          where: {
            date: targetDateUTC,
          },
          select: {
            collect_from: true,
          },
          distinct: ['collect_from'],
        })
        collectFromsForSend.push(...sendSources.map((item) => item.collect_from))
      }
    }

    const generated: string[] = []
    const generationFailed: Array<{ collect_from: string; error: string }> = []
    const sent: string[] = []
    const sendFailed: Array<{ collect_from: string; error: string }> = []

    if ((action === 'analyze' || action === 'both') && collectFromsForAnalyze.length === 0) {
      return NextResponse.json({
        success: false,
        message: `未找到 ${targetDate} 的可分析推文来源`,
        action,
        date: targetDate,
        totalSources: 0,
      })
    }

    if ((action === 'send' || action === 'both') && collectFromsForSend.length === 0) {
      return NextResponse.json({
        success: false,
        message: `未找到 ${targetDate} 的可发送摘要来源`,
        action,
        date: targetDate,
        totalSources: 0,
      })
    }

    if (action === 'analyze' || action === 'both') {
      for (const collectFrom of collectFromsForAnalyze) {
        try {
          await analyzeTweetsForDateAndSource(collectFrom, targetDate)
          generated.push(collectFrom)
        } catch (error) {
          generationFailed.push({
            collect_from: collectFrom,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    if (action === 'send' || action === 'both') {
      const sendTargets = action === 'both' ? Array.from(new Set([...collectFromsForSend, ...generated])) : collectFromsForSend
      for (const collectFrom of sendTargets) {
        try {
          const summary = await prisma.summary__tweet.findUnique({
            where: {
              collect_from_date: {
                collect_from: collectFrom,
                date: targetDateUTC,
              },
            },
          })

          if (!summary?.summary) {
            throw new Error('分析结果为空，无法发送')
          }

          await tools.postArticleMessage(
            `${collectFrom.replace('https://x.com/', '')} - ${targetDate}`,
            summary.summary,
            collectFrom
          )

          sent.push(collectFrom)
        } catch (error) {
          sendFailed.push({
            collect_from: collectFrom,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    return NextResponse.json({
      success: generationFailed.length === 0 && sendFailed.length === 0,
      message: action === 'analyze' ? '全部分析完成' : action === 'send' ? '全部发送完成' : '生成并发送完成',
      action,
      date: targetDate,
      totalSources: action === 'analyze' ? collectFromsForAnalyze.length : action === 'send' ? collectFromsForSend.length : Math.max(collectFromsForAnalyze.length, collectFromsForSend.length),
      generatedCount: generated.length,
      sentCount: sent.length,
      generated,
      sent,
      generationFailed,
      sendFailed,
    })
  } catch (error) {
    console.error('Failed to generate and send tweet analysis:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}
