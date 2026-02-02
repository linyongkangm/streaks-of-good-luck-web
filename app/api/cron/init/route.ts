import { NextRequest, NextResponse } from 'next/server';
import { startAllCronTasks } from '@/lib/cron-tasks';

// 用于标记定时任务是否已启动
let cronTasksStarted = false;

// GET /api/cron/init - 初始化定时任务
export async function GET(request: NextRequest) {
  try {
    if (cronTasksStarted) {
      return NextResponse.json({
        success: true,
        message: 'Cron tasks are already running'
      });
    }

    startAllCronTasks();
    cronTasksStarted = true;

    return NextResponse.json({
      success: true,
      message: 'Cron tasks started successfully',
      tasks: [
        { name: 'Data Collection', schedule: '0 8 * * * (every day at 8:00 AM)' },
        { name: 'Summary Send', schedule: '0 9 * * * (every day at 9:00 AM)' }
      ]
    });
  } catch (error) {
    console.error('Error starting cron tasks:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start cron tasks', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
