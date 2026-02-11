import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/tweet-summaries/existing - 获取数据库中已存在的tweet_id列表，按collect_from分组
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const collectFrom = searchParams.get('collect_from');
    if (!collectFrom) {
      return NextResponse.json({ error: 'Missing collect_from parameter' }, { status: 400 });
    }
    const tweetsMap = await prisma.info__tweet.findMany({
      select: {
        tweet_id: true,
      },
      distinct: ['tweet_id'],
      where: {
        collect_from: collectFrom,
      },
    });
    const existingTweetIds = tweetsMap.map(t => t.tweet_id);
    return NextResponse.json({ existingTweetIds });
  } catch (error) {
    console.error('Failed to fetch tweet summaries existing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tweet summaries existing' },
      { status: 500 }
    )
  }
}
