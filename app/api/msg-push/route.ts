// curl 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=693axxx6-7aoc-4bc4-97a0-0ec2sifa5aaa' \ -H 'Content-Type: application/json' \ -d ' { 	"msgtype": "text", 	"text": { 	"content": "hello world" 	} }'

import { NextRequest, NextResponse } from 'next/server';

// POST /api/msg-push - 发送消息到微信企业微信机器人
export async function POST(request: NextRequest) {
  try {
    // 从环境变量获取webhook key
    const webhookUrl = process.env.WEIXIN_WEBHOOK;
    
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    // 获取请求体
    const body = await request.json();
    const { content, msgtype = 'text' } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // 构造微信webhook请求体

    const payload = {
      msgtype,
      text: {
        content
      }
    };

    // 发送请求到微信webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to send message', details: result },
        { status: response.status }
      );
    }

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

