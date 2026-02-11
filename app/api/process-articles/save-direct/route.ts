import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/process-articles/save-direct - 直接保存文章（不生成摘要）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { article } = body

    if (!article || !article.source_url) {
      return NextResponse.json(
        { success: false, message: 'article with source_url is required' },
        { status: 400 }
      )
    }

    // 检查文章是否已存在
    const existing = await prisma.summary__article.findUnique({
      where: {
        source_url: article.source_url,
      },
    })

    if (existing) {
      return NextResponse.json({
        success: false,
        message: '文章已存在',
      })
    }

    // 直接保存文章，使用原始文本作为摘要
    const savedArticle = await prisma.summary__article.create({
      data: {
        title: article.title || '未命名文章',
        summary: article.source_text ? article.source_text.substring(0, 500) : '无摘要',
        source_url: article.source_url,
        source_text: article.source_text || null,
        publication: article.publication || null,
        issue_date: article.issue_date ? new Date(article.issue_date) : null,
        contributor: article.contributor || null,
        tags: '直接保存',
      },
    })

    console.log(`✓ Article saved directly: ${savedArticle.title} (${savedArticle.source_url})`)

    return NextResponse.json({
      success: true,
      message: '文章已直接保存',
      data: savedArticle,
    })
  } catch (error) {
    console.error('Failed to save article directly:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to save article directly' },
      { status: 500 }
    )
  }
}
