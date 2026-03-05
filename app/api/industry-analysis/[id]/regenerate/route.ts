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

// POST /api/industry-analysis/[id]/regenerate - 重新生成所有信号和总结以及景气度
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id)

    // 获取记录
    const record = await prisma.info__industry_analysis.findUnique({
      where: { id },
      include: {
        info__industry: true,
      },
    })

    if (!record) {
      return NextResponse.json(
        { error: '记录不存在' },
        { status: 404 }
      )
    }

    // 检查文件路径
    const filePath = record.original_file || record.original_url
    if (!filePath) {
      return NextResponse.json(
        { error: '没有关联的文件，无法重新生成' },
        { status: 400 }
      )
    }

    // 构造文件的完整路径
    let analysisFilePath = filePath
    if (record.original_file && !filePath.startsWith('http')) {
      // 本地文件需要转换为绝对路径
      const path = require('path')
      analysisFilePath = path.join(process.cwd(), 'public', filePath)
    }

    // 调用Python API重新分析
    console.log('开始重新分析行业景气度...')
    const response = await fetch(`${PYTHON_API_URL}/analyze-industry-prosperity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_path: analysisFilePath,
        industry_name: record.info__industry?.name,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Python API error: ${response.status}`, error)
      throw new Error(`Python API returned ${response.status}: ${error}`)
    }

    const analysisResult = await response.json()

    if (!analysisResult.success) {
      return NextResponse.json(
        { error: `分析失败: ${analysisResult.message || '未知错误'}` },
        { status: 500 }
      )
    }

    const analysis = analysisResult.analysis
    const summary = analysis.summary || ''

    // 分析景气度趋势（并行调用）
    console.log('开始分析景气度趋势...')
    const trendAnalysisPromises = [
      analyzeProsperityTrend(analysis.demand || '', '需求信号'),
      analyzeProsperityTrend(analysis.price || '', '价格信号'),
      analyzeProsperityTrend(analysis.supply || '', '供给信号'),
      analyzeProsperityTrend(analysis.profitability || '', '盈利信号'),
      analyzeProsperityTrend(summary, '综合总结'),
    ]

    const [trendDemand, trendPrice, trendSupply, trendProfitability, trendSummary] = 
      await Promise.all(trendAnalysisPromises)

    console.log(`景气度趋势分析完成: 需求=${trendDemand}, 价格=${trendPrice}, 供给=${trendSupply}, 盈利=${trendProfitability}, 综合=${trendSummary}`)

    // 更新数据库
    const updated = await prisma.info__industry_analysis.update({
      where: { id },
      data: {
        signal_demand: analysis.demand || null,
        signal_price: analysis.price || null,
        signal_supply: analysis.supply || null,
        signal_profitability: analysis.profitability || null,
        summary,
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
    console.error('Failed to regenerate analysis:', error)
    return NextResponse.json(
      { error: `重新生成失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    )
  }
}
