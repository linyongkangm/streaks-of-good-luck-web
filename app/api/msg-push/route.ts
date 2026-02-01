// curl 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=693axxx6-7aoc-4bc4-97a0-0ec2sifa5aaa' \ -H 'Content-Type: application/json' \ -d ' { 	"msgtype": "text", 	"text": { 	"content": "hello world" 	} }'

import { NextRequest, NextResponse } from 'next/server';
import * as tools from '@/app/tools';
// POST /api/msg-push - 发送消息到微信企业微信机器人
export async function POST(request: NextRequest) {
  try {
    // 获取请求体
    const body = await request.json();
    const { content } = body;
    const result = await tools.postMessage(content);
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

