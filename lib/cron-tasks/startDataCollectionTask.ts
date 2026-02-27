import cron from 'node-cron';
import { BrowserContext } from 'playwright';
import * as stools from '@/app/tools/stools';

type CollectType = 'collectTweetSummaries' | 'collectLatestQIUSHIArticles' | 'collectLatestWSJArticles' | 'collectLatestEconomistArticles';
async function callCollect(context: BrowserContext, type: CollectType) {
  try {
    const page = context.pages()[0];
    await page.evaluate((type) => {
      const event = new CustomEvent('EXTERNAL_EVENT', {
        detail: {
          type: type,
        }
      });
      document.dispatchEvent(event);
    }, type);
  } catch (error) {
    console.error('Error in data collection task:', error);
  }
}

async function collectTweetSummaries(context: BrowserContext) {
  return await callCollect(context, 'collectTweetSummaries');
}

async function collectWSJArticles(context: BrowserContext) {
  return await callCollect(context, 'collectLatestWSJArticles');
}

async function collectEconomistArticles(context: BrowserContext) {
  return await callCollect(context, 'collectLatestEconomistArticles');
}

async function collectQIUSHIArticles(context: BrowserContext) {
  return await callCollect(context, 'collectLatestQIUSHIArticles');
}



export async function startDataCollectionTaskEveryDayCallback() {
  console.log('Starting every day data collection task...');
  const context = await stools.launchBrowser(process.env.HOST_URL);
  if (context) {
    Promise.all([
      collectTweetSummaries(context),
      collectWSJArticles(context),
    ]);
  }
}

function startDataCollectionTaskEveryDay() {
  const SEND_HOUR = 8;
  const expression = `50 ${SEND_HOUR},${SEND_HOUR + 4} * * *`;
  cron.schedule(expression, startDataCollectionTaskEveryDayCallback);
  console.log(`Data collection task scheduled: every day at ${expression}`);
}

export async function startDataCollectionTaskHalfMonthCallback() {
  console.log('Starting every half month data collection task...');
  const context = await stools.launchBrowser(process.env.HOST_URL);
  if (context) {
    Promise.all([
      collectQIUSHIArticles(context),
    ]);
  }
}

function startDataCollectionTaskHalfMonth() {
  const expression = `2 9 1,16 * *`;
  cron.schedule(expression, startDataCollectionTaskHalfMonthCallback);
  console.log(`Data collection task scheduled: every half month at ${expression}`);
}

// 定时任务：每天采集推文数据
// 每天早上8点执行
export function startDataCollectionTask() {
  startDataCollectionTaskEveryDay();
  startDataCollectionTaskHalfMonth();
}