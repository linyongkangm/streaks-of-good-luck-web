import { startDataCollectionTask } from './startDataCollectionTask';
import { startSummarySendTask } from './startSummarySendTask';
import { startStockQuoteSyncTask } from './startStockQuoteSyncTask';

// 启动所有定时任务
export function startAllCronTasks() {
  console.log('Starting all cron tasks...');
  startDataCollectionTask();
  startSummarySendTask();
  startStockQuoteSyncTask();
  console.log('All cron tasks started successfully');
}
