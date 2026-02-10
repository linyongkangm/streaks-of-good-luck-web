import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import * as tools from '@/app/tools'
import { generateArticleAnalysis } from '@/app/tools/generateArticleAnalysis'
import { summary__article } from '@/types'
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000'

// POST /api/process-articles - 处理文章，生成摘要和标签
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { articles } = body

    if (!articles || !Array.isArray(articles)) {
      return NextResponse.json(
        { success: false, message: 'articles array is required' },
        { status: 400 }
      )
    }

    // 检查是否已存在相同的文章（基于source_url）
    const existingArticles = await prisma.summary__article.findMany({
      where: {
        source_url: {
          in: articles.map((a: summary__article) => a.source_url),
        },
      },
      select: { source_url: true },
    })
    const existingUrls = new Set(existingArticles.map((a) => a.source_url))

    // 只处理新文章，过滤掉已存在的文章
    const newArticles = articles.filter((a: summary__article) => !existingUrls.has(a.source_url))

    if (newArticles.length === 0) {
      return NextResponse.json({
        success: true,
        message: '所有文章均已存在，未处理任何新文章',
        successful: 0,
        failed: 0,
        skipped: articles.length,
        existingSourceUrls: Array.from(existingUrls),
      })
    }

    // 串行处理每篇新文章
    const results: { status: 'fulfilled' | 'rejected'; value?: any; reason?: any }[] = [];
    for (const article of newArticles) {
      try {
        const r = await generateArticleAnalysis(article, false);
        results.push({ status: 'fulfilled', value: r });
        if (r.success && r.data) {
          const issue_date = r.data.issue_date ? r.data.issue_date.toISOString().split('T')[0] : '未知日期';
          tools.postArticleMessage(r.data.title, `${r.data.summary} [${r.data.publication} ${issue_date}]`, r.data.source_url);
          console.log(`✓ Article processed: ${r.data.title} (${r.data.source_url})`);
        }
      } catch (e) {
        results.push({ status: 'rejected', reason: e });
      }
    }

    // 统计成功和失败的数量
    const successful = results.filter((r) => r.status === 'fulfilled' && (r.value as any).success).length
    const failed = results.filter((r) => r.status === 'rejected' || (r.value as any).success === false).length
    const skipped = articles.length - newArticles.length

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${successful} new articles, ${failed} failed, ${skipped} skipped (already exist).`,
      successful,
      failed,
      skipped,
      total: articles.length,
      successfulSourceUrls: newArticles
        .filter((_, index) => results[index].status === 'fulfilled' && (results[index] as any).value.success)
        .map((a: any) => a.source_url),
      existingSourceUrls: Array.from(existingUrls),
    })
  } catch (error) {
    console.error('Failed to process articles:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process articles' },
      { status: 500 }
    )
  }
}
