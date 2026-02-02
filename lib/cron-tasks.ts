import cron from 'node-cron';
import { prisma } from '@/lib/db';
import * as stools from '@/app/tools/stools';
import * as tools from '@/app/tools';

// 定时任务：每天采集推文数据
// 每天早上8点执行
export function startDataCollectionTask() {
  cron.schedule('0 8 * * *', async () => {
    console.log('Starting data collection task...');
    try {
      // 从数据库获取所有唯一的collect_from
      const summaries = await prisma.summary__tweet.findMany({
        select: {
          collect_from: true
        },
        distinct: ['collect_from']
      });

      const collectFroms = summaries.map(s => s.collect_from);

      if (collectFroms.length === 0) {
        console.log('No collect_from found in database');
        return;
      }

      console.log(`Found ${collectFroms.length} sources to collect from:`, collectFroms);

      // 启动浏览器并触发EXTERNAL_EVENT事件
      const context = await stools.launchBrowser();
      if (context) {
        const page = context.pages()[0];

        // 触发EXTERNAL_EVENT事件
        await page.evaluate((collectFroms) => {
          const event = new CustomEvent('EXTERNAL_EVENT', {
            detail: {
              collectFroms
            }
          });
          document.dispatchEvent(event);
        }, collectFroms);

        console.log('EXTERNAL_EVENT triggered successfully');

        // 等待一段时间让数据采集完成（根据实际情况调整）
        await new Promise(resolve => setTimeout(resolve, 3 * 60000)); // 等待180秒

        // 关闭浏览器
        await context.close();
        console.log('Data collection task completed');
      }
    } catch (error) {
      console.error('Error in data collection task:', error);
    }
  });

  console.log('Data collection task scheduled: every day at 8:00 AM');
}

// 定时任务：每天发送前一日的推文摘要
// 每天早上9点执行
export function startSummarySendTask() {
  cron.schedule('0 9 * * *', async () => {
    console.log('Starting summary send task...');
    try {
      // 获取前一天的日期

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
      console.log(summaries)
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
          `推总结 - ${formattedDate}`,
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

  console.log('Summary send task scheduled: every day at 9:00 AM');
}

// 启动所有定时任务
export function startAllCronTasks() {
  console.log('Starting all cron tasks...');
  startDataCollectionTask();
  startSummarySendTask();
  console.log('All cron tasks started successfully');
}
