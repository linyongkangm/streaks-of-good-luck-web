import { startAllCronTasks } from './lib/cron-tasks';

export async function register() {
  // 仅在Node.js运行时环境中执行
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 启动所有定时任务
    startAllCronTasks();
    console.log('Cron tasks initialized on server startup');
  }
}
