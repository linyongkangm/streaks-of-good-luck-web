import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { promises as fs } from 'fs'
import path from 'path'

// GET /api/industry-analysis/[id] - 获取单条分析记录
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id)

    const record = await prisma.info__industry_analysis.findUnique({
      where: { id },
      include: {
        info__industry: true,
      },
    })

    if (!record) {
      return NextResponse.json(
        { error: '分析记录不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: record })
  } catch (error) {
    console.error('Failed to fetch industry analysis:', error)
    return NextResponse.json(
      { error: 'Failed to fetch industry analysis' },
      { status: 500 }
    )
  }
}

// PATCH /api/industry-analysis/[id] - 更新行业景气度分析
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id)
    const body = await request.json()

    // 验证记录是否存在
    const existing = await prisma.info__industry_analysis.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: '记录不存在' },
        { status: 404 }
      )
    }

    // 更新记录
    const updated = await prisma.info__industry_analysis.update({
      where: { id },
      data: {
        title: body.title,
        publisher: body.publisher,
        author: body.author,
        report_time: body.report_time ? new Date(body.report_time) : undefined,
        signal_demand: body.signal_demand,
        signal_price: body.signal_price,
        signal_supply: body.signal_supply,
        signal_profitability: body.signal_profitability,
        summary: body.summary,
        trend_demand: body.trend_demand,
        trend_price: body.trend_price,
        trend_supply: body.trend_supply,
        trend_profitability: body.trend_profitability,
        trend_summary: body.trend_summary,
      },
      include: {
        info__industry: true,
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Failed to update industry analysis:', error)
    return NextResponse.json(
      { error: `更新失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    )
  }
}

// DELETE /api/industry-analysis/[id] - 删除分析记录及其关联文件
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id)

    const record = await prisma.info__industry_analysis.findUnique({
      where: { id },
    })

    if (!record) {
      return NextResponse.json(
        { error: '分析记录不存在' },
        { status: 404 }
      )
    }

    // 删除关联的本地文件
    if (record.original_file) {
      try {
        const filePath = path.join(process.cwd(), 'public', record.original_file)
        // 检查文件是否存在后再删除
        try {
          await fs.access(filePath)
          await fs.unlink(filePath)
          console.log(`File deleted: ${filePath}`)
        } catch (error) {
          console.warn(`File not found or cannot be deleted: ${filePath}`)
        }
      } catch (error) {
        console.error('Failed to delete file:', error)
        // 继续删除数据库记录，不因文件删除失败而中止
      }
    }

    // 删除数据库记录
    await prisma.info__industry_analysis.delete({
      where: { id },
    })

    return NextResponse.json({ message: '分析记录已删除' })
  } catch (error) {
    console.error('Failed to delete industry analysis:', error)
    return NextResponse.json(
      { error: 'Failed to delete industry analysis' },
      { status: 500 }
    )
  }
}
