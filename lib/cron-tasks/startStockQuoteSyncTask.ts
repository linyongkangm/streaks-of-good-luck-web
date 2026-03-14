import * as tools from '@/app/tools';
import cron from 'node-cron';

const SYNC_HOUR = 18; // 同步股票行情的小时（24小时制）
// 定时任务：每天同步股票行情数据
// 每天下午18点执行
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
      if (result.data && result.data.success_count > 0) {
        await tools.postTextMessage(
          `📊 股票行情同步任务完成\n` +
          `总公司数: ${result.data.total_companies}\n` +
          `需要同步: ${result.data.success_count}家`
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
