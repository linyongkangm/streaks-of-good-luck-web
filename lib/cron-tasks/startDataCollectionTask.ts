import cron from 'node-cron';
import { BrowserContext } from 'playwright';
import * as stools from '@/app/tools/stools';

async function collectTweetSummaries(context: BrowserContext) {
  try {
    const page = context.pages()[0];
    await page.evaluate(() => {
      const event = new CustomEvent('EXTERNAL_EVENT', {
        detail: {}
      });
      document.dispatchEvent(event);
    });
  } catch (error) {
    console.error('Error in data collection task:', error);
  }
}

export async function startDataCollectionTaskCallback() {
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