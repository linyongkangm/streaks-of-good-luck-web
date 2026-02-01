import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

// POST /api/extract-predicts - 从文章中提取预测
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { article_id } = body;

    if (!article_id) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数：article_id' },
        { status: 400 }
      );
    }

    console.log(`Fetching article ${article_id}...`);

    // 获取文章详情
    const article = await prisma.summary__article.findUnique({
      where: { id: BigInt(article_id) },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, message: `未找到文章 ID: ${article_id}` },
        { status: 404 }
      );
    }

    if (!article.source_text) {
      return NextResponse.json(
        { success: false, message: '文章没有原文内容' },
        { status: 400 }
      );
    }

    console.log(`Article found: ${article.title}, text length: ${article.source_text.length}`);

    // 调用 Python API 提取预测
    console.log(`Calling Python API: ${PYTHON_API_URL}/extract-predicts`);
    const response = await fetch(`${PYTHON_API_URL}/extract-predicts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        issue_date: article.issue_date,
        article_text: article.source_text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log(`Successfully extracted predictions:`, result);

    return NextResponse.json({
      success: true,
      message: `成功提取 ${result.count} 个预测`,
      article: {
        id: article.id.toString(),
        title: article.title,
        summary: article.summary,
        source_url: article.source_url,
        tags: article.tags,
        publication: article.publication,
        issue_date: article.issue_date,
        contributor: article.contributor,
      },
      predicts: result.predicts,
      count: result.count,
    });
  } catch (error) {
    console.error('Failed to extract predictions:', error);
    return NextResponse.json(
      {
        success: false,
        message: '服务器错误：无法提取预测',
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
