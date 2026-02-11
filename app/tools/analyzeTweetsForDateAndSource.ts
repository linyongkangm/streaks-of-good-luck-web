import * as tools from '@/app/tools';
import { prisma } from '@/lib/db';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000'
export async function analyzeTweetsForDateAndSource(collectFrom: string, date: string) {
  if (!collectFrom || !date) {
    throw new Error('Missing required parameters: collect_from and date');
  }

  // 验证日期格式 (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new Error('Invalid date format, should be YYYY-MM-DD');
  }
  // 获取指定日期和来源的所有推文
  // date 是美东时间的日期，需要转换为 UTC 时间范围查询
  // tweet_date 存储的是 UTC 时间
  const startET = tools.fromISOUseEastern(date).startOf('day');
  console.log('Fetching tweets for', collectFrom, 'on', startET.toJSDate());
  const tweets = await prisma.info__tweet.findMany({
    where: {
      collect_from: collectFrom,
      tweet_date: {
        gte: startET.toJSDate(),
        lt: startET.plus({ days: 1 }).toJSDate(),
      },
    },
    orderBy: { tweet_date: 'asc' },
  });
  console.log(`Found ${tweets.length} tweets for ${collectFrom} on ${date}`);
  if (tweets.length === 0) {
    throw new Error(`No tweets found for ${collectFrom} on ${date}`);
  }

  // 转换为 API 需要的格式
  const tweetInfos = tweets.map((tweet) => ({
    tweet_date: tools.toEastern(tweet.tweet_date).toFormat(tools.DATE_TIME_FORMAT),
    user_name: tweet.user_name,
    tweet_from: tweet.tweet_from,
    tweet_text: tweet.tweet_text,
  }));
  // 调用 Python API 生成分析
  console.log(`Calling Python API: ${PYTHON_API_URL}/analyze-tweet`);
  const response = await fetch(`${PYTHON_API_URL}/analyze-tweet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      collect_from: collectFrom,
      date: date,
      tweet_infos: tweetInfos,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  console.log(`Successfully received analysis result for ${collectFrom} on ${date}:`, result);

  // 如果分析成功，保存结果到数据库
  if (result.success && result.analysis) {
    console.log(`Saving analysis result to database for ${collectFrom} on ${date}...`);

    const summary = result.analysis.summary || '';

    const targetDate = tools.fromISOUseUTC(date).toJSDate();
    // 使用 upsert 来插入或更新记录
    await prisma.summary__tweet.upsert({
      where: {
        collect_from_date: {
          collect_from: collectFrom,
          date: targetDate,
        },
      },
      update: {
        summary: summary,
        update_time: new Date(),
      },
      create: {
        collect_from: collectFrom,
        date: targetDate,
        summary: summary,
        create_time: new Date(),
        update_time: new Date(),
      },
    });

    console.log(`✓ Analysis result saved for ${collectFrom} on ${date}`);
  }
  return {
    count: tweets.length,
    data: result,
  };
}
