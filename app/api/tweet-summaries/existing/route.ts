import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/tweet-summaries/existing - 获取数据库中已存在的tweet_id列表，按collect_from分组
export async function GET(req: NextRequest) {
  try {
    // 从数据库获取所有唯一的collect_from
    const summaries = await prisma.summary__tweet.findMany({
      select: {
        collect_from: true,
      },
      distinct: ['collect_from']
    });
    const collectFroms = summaries.map(s => s.collect_from);
    if (collectFroms.length === 0) {
      console.log('No collect_from found in database');
      return;
    }
    console.log(`Found ${collectFroms.length} sources to collect from:`, collectFroms);

    const tweetsMap = await Promise.all(collectFroms.map(async (collectFrom) => {
      return prisma.info__tweet.findMany({
        select: {
          tweet_id: true,
        },
        distinct: ['tweet_id'],
        where: {
          collect_from: collectFrom,
        },
      });
    }));
    const collectFromMapExistingTweetIds: Record<string, string[]> = {};
    collectFroms.forEach((collectFrom, index) => {
      const tweetIds = tweetsMap[index].map(t => t.tweet_id);
      collectFromMapExistingTweetIds[collectFrom] = tweetIds;
    });
    return NextResponse.json({ collectFromMapExistingTweetIds });
  } catch (error) {
    console.error('Failed to fetch tweet summaries existing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tweet summaries existing' },
      { status: 500 }
    )
  }
}
