import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
    const existingUrls = await prisma.summary__article.findMany({
      where: {
        source_url: {
          in: articles.map((a: any) => a.source_url),
        },
      },
      select: { source_url: true },
    })
    const existingUrlSet = new Set(existingUrls.map((a) => a.source_url))

    // 分离新文章和已存在的文章
    const newArticles = articles.filter((a: any) => !existingUrlSet.has(a.source_url))

    if (newArticles.length === 0) {
      return NextResponse.json({
        success: true,
        message: '所有文章均已存在',
        successful: 0,
        failed: 0,
      })
    }


    // 串行处理每篇新文章
    const results: { status: 'fulfilled' | 'rejected'; value?: any; reason?: any }[] = [];
    for (const article of newArticles) {
      try {
        const r = await generateArticleAnalysis(article);
        results.push({ status: 'fulfilled', value: r });
      } catch (e) {
        results.push({ status: 'rejected', reason: e });
      }
    }

    // 统计成功和失败的数量
    const successful = results.filter((r) => r.status === 'fulfilled' && (r.value as any).success).length
    const failed = results.filter((r) => r.status === 'rejected' || (r.value as any).success === false).length

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${successful} articles, ${failed} failed.`,
      successful,
      failed,
      total: articles.length,
      successfulSourceUrls: newArticles
        .filter((_, index) => results[index].status === 'fulfilled' && (results[index] as any).value.success)
        .map((a: any) => a.source_url),
      existingSourceUrls: Array.from(existingUrlSet),
    })
  } catch (error) {
    console.error('Failed to process articles:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process articles' },
      { status: 500 }
    )
  }
}

async function generateArticleAnalysis(article: any) {
  try {
    const { source_url, title, contributor, publication, issue_date, source_text } = article

    if (!source_text) {
      console.log(`Skipping article "${title}" - no source_text provided`)
      return { success: false, reason: 'no source_text' }
    }

    console.log(`Analyzing article: ${title}`)

    // 调用 Python API 生成分析
    console.log(`Calling Python API: ${PYTHON_API_URL}/analyze-article`)
    const response = await fetch(`${PYTHON_API_URL}/analyze-article`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_text: source_text,
      }),
      signal: AbortSignal.timeout(1000 * 60 * 5) // 5分钟超时，可根据业务调整
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()
    console.log(`Successfully received analysis for "${title}":`, result)

    // 保存到数据库
    if (result.success && result.analysis) {
      const { tags, summary } = result.analysis

      const data: any = {
        source_url,
        title,
        tags: tags || '',
        summary: summary || '',
        source_text: source_text,
      }

      if (publication) data.publication = publication
      if (issue_date) data.issue_date = new Date(issue_date)
      if (contributor) data.contributor = contributor

      await prisma.summary__article.create({
        data,
      })

      console.log(`✓ Article "${title}" saved to database`)
      return { success: true }
    }

    return { success: false, reason: 'no analysis result' }
  } catch (error) {
    console.error(`Failed to analyze article:`, error)
    return { success: false, error: String(error) }
  }
}
