import cron from 'node-cron';
import { BrowserContext } from 'playwright';
import { prisma } from '@/lib/db';
import * as stools from '@/app/tools/stools';

async function collectTweetSummaries(context: BrowserContext) {
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
  } catch (error) {
    console.error('Error in data collection task:', error);
  }
}

async function startDataCollectionTaskCallback() {
  // 启动浏览器并触发EXTERNAL_EVENT事件
  const context = await stools.launchBrowser(process.env.HOST_URL);
  console.log('Starting data collection task...');
  if (context) {
    collectTweetSummaries(context);
    // 等待一段时间让数据采集完成（根据实际情况调整）
    await new Promise(resolve => setTimeout(resolve, 5 * 60000)); // 等待300秒

    // 关闭浏览器
    await context.close();
  }
}

// 定时任务：每天采集推文数据
// 每天早上8点执行
export function startDataCollectionTask() {
  const SEND_HOUR = 9; // 发送摘要的小时（24小时制）
  const expression = `50 ${SEND_HOUR - 1},${SEND_HOUR - 1 + 4} * * *`;
  cron.schedule(expression, startDataCollectionTaskCallback);
  console.log(`Data collection task scheduled: every day at ${SEND_HOUR - 1}:50,${SEND_HOUR - 1 + 4}:50 AM`);
}