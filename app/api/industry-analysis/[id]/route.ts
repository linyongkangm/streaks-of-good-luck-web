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
