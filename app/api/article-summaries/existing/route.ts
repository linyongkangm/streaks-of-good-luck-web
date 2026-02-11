import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/article-summaries/existing
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const publication = searchParams.get('publication');
    if (!publication) {
      return NextResponse.json({ error: 'Missing publication parameter' }, { status: 400 });
    }
    const articlesMap = await prisma.summary__article.findMany({
      select: {
        source_url: true,
      },
      distinct: ['source_url'],
      where: {
        publication: publication,
      },
    });
    const existingSourceUrls = articlesMap.map(t => t.source_url);
    return NextResponse.json({ existingSourceUrls });
  } catch (error) {
    console.error('Failed to fetch article summaries existing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch article summaries existing' },
      { status: 500 }
    )
  }
}
