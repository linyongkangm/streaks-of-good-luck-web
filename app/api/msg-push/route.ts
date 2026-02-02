// curl 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=693axxx6-7aoc-4bc4-97a0-0ec2sifa5aaa' \ -H 'Content-Type: application/json' \ -d ' { 	"msgtype": "text", 	"text": { 	"content": "hello world" 	} }'

import { NextRequest, NextResponse } from 'next/server';
import * as tools from '@/app/tools';
import * as stools from '@/app/tools/stools';
import { prisma } from '@/lib/db';
// POST /api/msg-push - 发送消息到微信企业微信机器人
export async function POST(request: NextRequest) {
  try {
    // 获取请求体
    const body = await request.json();
    const { msgtype, detail } = body;
    const result = await tools.postMessage(msgtype, detail);
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error sending webhook message:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/msg-push - 测试使用playwright启动Chromium并加载插件
export async function GET(request: NextRequest) {
  try {
    // 从数据库获取所有唯一的collect_from
    const summaries = await prisma.summary__tweet.findMany({
      select: {
        collect_from: true
      },
      distinct: ['collect_from']
    });
    
    const collectFroms = summaries.map(s => s.collect_from);
    
    const context = await stools.launchBrowser();
    if (context) {
      const page = context.pages()[0]

      // 触发EXTERNAL_EVENT事件
      await page.evaluate((collectFroms) => {
        const event = new CustomEvent('EXTERNAL_EVENT', {
          detail: {
            collectFroms
          }
        });
        document.dispatchEvent(event);
      }, collectFroms);
    }
    return NextResponse.json({
      success: true,
      message: 'Chromium浏览器已启动（已加载插件）',
      data: {
        info: '浏览器将保持打开状态，插件已加载，请访问 chrome://extensions/ 查看'
      }
    });
  } catch (error) {
    console.error('Error launching Chrome:', error);
    return NextResponse.json(
      { error: 'Failed to launch Chrome', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
