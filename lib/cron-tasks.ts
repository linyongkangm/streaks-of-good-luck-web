import cron from 'node-cron';
import { prisma } from '@/lib/db';
import * as tools from '@/app/tools';

const SEND_HOUR = 9; // 发送摘要的小时（24小时制）
const SYNC_HOUR = 16; // 同步股票行情的小时（24小时制）

// 定时任务：每天采集推文数据
// 每天早上8点执行
export function startDataCollectionTask() {
  cron.schedule(`50 ${SEND_HOUR - 1},${SEND_HOUR - 1 + 4} * * *`, async () => {
    console.log('Starting data collection task...');
    try {
      // 动态导入 stools 以避免 playwright 模块解析问题
      const stools = await import('@/app/tools/stools');
      
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
      const context = await stools.launchBrowser(process.env.HOST_URL);
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

  console.log(`Data collection task scheduled: every day at ${SEND_HOUR - 1}:50,${SEND_HOUR - 1 + 4}:50 AM`);
}

// 定时任务：每天发送前一日的推文摘要
// 每天早上9点执行
export function startSummarySendTask() {
  cron.schedule(`0 ${SEND_HOUR},${SEND_HOUR + 4} * * *`, async () => {
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

// 定时任务：每天同步股票行情数据
// 每天下午16点执行
export function startStockQuoteSyncTask() {
  cron.schedule(`0 ${SYNC_HOUR} * * *`, async () => {
    console.log('Starting stock quote sync task...');
    try {
      // 调用同步接口
      const response = await fetch(`${process.env.HOST_URL || 'http://localhost:3000'}/api/stock-quotes/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Stock quote sync result:', result);

      // 发送通知消息
      if (result.data && result.data.companies_needing_sync > 0) {
        await tools.postTextMessage(
          `📊 股票行情同步任务完成\n` +
          `总公司数: ${result.data.total_companies}\n` +
          `需要同步: ${result.data.companies_needing_sync}家`
        );
      } else {
        await tools.postTextMessage('📊 股票行情数据已是最新，无需同步');
      }

      console.log('Stock quote sync task completed');
    } catch (error) {
      console.error('Error in stock quote sync task:', error);
      await tools.postTextMessage(
        `❌ 股票行情同步任务失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

  console.log(`Stock quote sync task scheduled: every day at ${SYNC_HOUR}:00`);
}

// 启动所有定时任务
export function startAllCronTasks() {
  console.log('Starting all cron tasks...');
  startDataCollectionTask();
  startSummarySendTask();
  startStockQuoteSyncTask();
  console.log('All cron tasks started successfully');
}
