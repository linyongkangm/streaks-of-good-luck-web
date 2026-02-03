export async function register() {

  if (process.env.NODE_ENV != 'development') {
    console.log('Registering cron tasks...');
    // 仅在Node.js运行时环境中执行
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      // 延迟导入以避免模块解析问题
      const { startAllCronTasks } = await import('./lib/cron-tasks');
      startAllCronTasks();
      console.log('Cron tasks initialized on server startup');
    }
  }
}
