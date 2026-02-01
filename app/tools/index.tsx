import { NextResponse } from 'next/server';


// 通用判断函数（推荐）
export function isClientSide() {
  // 客户端环境存在 window 对象
  return typeof window !== 'undefined';
}

export function isServerSide() {
  // 服务端环境不存在 window 对象
  return typeof window === 'undefined';
}

// curl 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=693axxx6-7aoc-4bc4-97a0-0ec2sifa5aaa' \ -H 'Content-Type: application/json' \ -d ' { 	"msgtype": "text", 	"text": { 	"content": "hello world" 	} }'
export async function postMessage(content: string) {
  if (isServerSide()) {
    try {
      const webhookUrl = process.env.WEIXIN_WEBHOOK;

      if (!webhookUrl) {
        throw new Error('Webhook not configured');
      }
      const payload = {
        msgtype: 'text',
        text: {
          content
        }
      };
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(`Failed to send message: ${JSON.stringify(result)}`);
      }
      return result;
    } catch (error) {
      console.error('Error sending webhook message:', error);
      throw error;
    }
  }
  return fetch('/api/msg-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

export function test() {
  // 先判断是否为客户端环境
  if (typeof window !== 'undefined') {
    console.log('Window object is available:', window);
  } else {
    console.log('Running on server, window is not available');
  }
}

