import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8001'

// 辅助函数：调用Python API分析景气度趋势
async function analyzeProsperityTrend(signalContent: string, signalType: string): Promise<string> {
  try {
    if (!signalContent || !signalContent.trim()) {
      return '未获取'
    }

    const response = await fetch(`${PYTHON_API_URL}/analyze-prosperity-trend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signal_content: signalContent,
        signal_type: signalType,
      }),
    })

    if (!response.ok) {
      console.error(`景气度趋势分析失败 (${signalType}): ${response.status}`)
      return '未获取'
    }

    const result = await response.json()
    return result.trend || '未获取'
  } catch (error) {
    console.error(`景气度趋势分析异常 (${signalType}):`, error)
    return '未获取'
  }
}

// POST /api/industry-analysis/[id]/regenerate-trends - 重新生成所有景气度
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id)

    // 获取记录
    const record = await prisma.info__industry_analysis.findUnique({
      where: { id },
    })

    if (!record) {
      return NextResponse.json(
        { error: '记录不存在' },
        { status: 404 }
      )
    }

    // 分析景气度趋势（并行调用）
    console.log('开始重新分析景气度趋势...')
    const trendAnalysisPromises = [
      analyzeProsperityTrend(record.signal_demand || '', '需求信号'),
      analyzeProsperityTrend(record.signal_price || '', '价格信号'),
      analyzeProsperityTrend(record.signal_supply || '', '供给信号'),
      analyzeProsperityTrend(record.signal_profitability || '', '盈利信号'),
      analyzeProsperityTrend(record.summary || '', '综合总结'),
    ]

    const [trendDemand, trendPrice, trendSupply, trendProfitability, trendSummary] = 
      await Promise.all(trendAnalysisPromises)

    console.log(`景气度趋势分析完成: 需求=${trendDemand}, 价格=${trendPrice}, 供给=${trendSupply}, 盈利=${trendProfitability}, 综合=${trendSummary}`)

    // 更新数据库
    const updated = await prisma.info__industry_analysis.update({
      where: { id },
      data: {
        trend_demand: trendDemand,
        trend_price: trendPrice,
        trend_supply: trendSupply,
        trend_profitability: trendProfitability,
        trend_summary: trendSummary,
      },
      include: {
        info__industry: true,
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Failed to regenerate trends:', error)
    return NextResponse.json(
      { error: `重新生成景气度失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    )
  }
}
