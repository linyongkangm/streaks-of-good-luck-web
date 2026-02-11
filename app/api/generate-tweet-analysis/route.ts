import { NextRequest, NextResponse } from 'next/server'
import { analyzeTweetsForDateAndSource } from '@/app/tools/analyzeTweetsForDateAndSource';

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
    const result = await analyzeTweetsForDateAndSource(collect_from, date)

    return NextResponse.json({
      success: true,
      message: '分析生成成功',
      ...result,
    })
  } catch (error) {
    console.error('Failed to generate analysis:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '未知错误',
        error: error,
      },
      { status: 500 }
    )
  }
}
