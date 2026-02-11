import * as tools from '@/app/tools';
import cron from 'node-cron';
import { prisma } from '@/lib/db';
const SEND_HOUR = 9; // 发送摘要的小时（24小时制）
// 定时任务：每天发送前一日的推文摘要
// 每天早上9点执行
export function startSummarySendTask() {
  cron.schedule(`0 ${SEND_HOUR},${SEND_HOUR + 4} * * *`, async () => {
    console.log('Starting summary send task...');
    try {
      // 获取前一天的日期，美东时间的0点
      const now = new Date();
      const yesterday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0));

      // 查询前一日的所有summary，按collect_from分组
      const summaries = await prisma.summary__tweet.findMany({
        where: {
          date: yesterday
        },
        orderBy: {
          create_time: 'desc'
        }
      });
      console.log(summaries);
      if (summaries.length === 0) {
        console.log('No summaries found for yesterday');
        await tools.postTextMessage('昨日暂无推文摘要');
        return;
      }

      // 按collect_from分组并发送消息
      const groupedSummaries = summaries.reduce((acc, summary) => {
        if (!acc[summary.collect_from]) {
          acc[summary.collect_from] = [];
        }
        acc[summary.collect_from].push(summary);
        return acc;
      }, {} as Record<string, typeof summaries>);

      // 发送每个来源的最新摘要
      for (const [collectFrom, summaryList] of Object.entries(groupedSummaries)) {
        const latestSummary = summaryList[0]; // 已按create_time降序排列
        const formattedDate = yesterday.toISOString().split('T')[0];

        await tools.postArticleMessage(
          `${collectFrom.replace("https://x.com/", "")} - ${formattedDate}`,
          latestSummary.summary,
          collectFrom
        );

        console.log(`Sent summary for ${collectFrom}`);

        // 短暂延迟避免消息发送过快
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`Summary send task completed. Sent ${Object.keys(groupedSummaries).length} summaries`);
    } catch (error) {
      console.error('Error in summary send task:', error);
      await tools.postTextMessage(`发送推文摘要时出错: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  console.log(`Summary send task scheduled: every day at ${SEND_HOUR}:00,${SEND_HOUR + 4}:00 AM`);
}
