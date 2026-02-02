import * as luxon from 'luxon';

export const DATE_TIME_FORMAT = 'yyyy-MM-dd HH:mm z';
export const DATE_FORMAT = 'yyyy-MM-dd z';
export enum CommonTimeZones {
  UTC = 'UTC',
  Shanghai = 'Asia/Shanghai',
  NewYork = 'America/New_York',
  London = 'Europe/London'
}

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
// 纯文本类型 { 	"msgtype": "text", 	"text": { 	"content": "hello world" 	} }
// markdown类型 { 	"msgtype": "markdown_v2", 	"markdown_v2": { 	"content": "#### markdown内容" 	} }
export async function postMessage(msgtype: string, detail: object) {
  if (isServerSide()) {
    try {
      const webhookUrl = process.env.WEIXIN_WEBHOOK;

      if (!webhookUrl) {
        throw new Error('Webhook not configured');
      }
      const payload = {
        msgtype,
        [msgtype]: detail
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
    body: JSON.stringify({ msgtype, detail }),
  });
}

export async function postTextMessage(text: string) {
  return postMessage('text', { content: text });
}

export async function postArticleMessage(title: string, description: string, url?: string) {
  return postMarkdownMessage(`### ${title}\n${description}\n${url ? `\n[阅读全文](${url})` : ''}`);
}

export async function postMarkdownMessage(markdown: string) {
  return postMessage('markdown_v2', { content: markdown });
}

export function test() {
  // 先判断是否为客户端环境
  if (typeof window !== 'undefined') {
    console.log('Window object is available:', window);
  } else {
    console.log('Running on server, window is not available');
  }
}


export function toLuxon(date: Date | string): luxon.DateTime {
  return luxon.DateTime.fromJSDate(new Date(date)).toUTC();
}

/**
 * 将给定的其他时区时间转换为美国东部时间（ET）
 * @param {luxon.DateTime} dataTime
 * @returns {luxon.DateTime} 转换后的美国东部时间
 */
export function toEastern(dataTime: luxon.DateTime | Date | string): luxon.DateTime {
  if (!(dataTime instanceof luxon.DateTime)) {
    dataTime = toLuxon(dataTime);
  }
  return dataTime.setZone(CommonTimeZones.NewYork);
}

/**
 * 将给定的其他时区时间转换为utc时间（UTC）
 * @param {luxon.DateTime} dataTime
 * @returns {luxon.DateTime} 转换后的utc时间
 */
export function toUTC(dataTime: luxon.DateTime | Date | string): luxon.DateTime {
  if (!(dataTime instanceof luxon.DateTime)) {
    dataTime = toLuxon(dataTime);
  }
  return dataTime.setZone(CommonTimeZones.UTC);
}

/**
 * 将给定的其他时区时间转换为北京时间（CST）
 * @param {luxon.DateTime} dataTime
 * @returns {luxon.DateTime} 转换后的北京时间
 */
export function toBeijing(dataTime: luxon.DateTime | Date | string): luxon.DateTime {
  if (!(dataTime instanceof luxon.DateTime)) {
    dataTime = toLuxon(dataTime);
  }
  return dataTime.setZone(CommonTimeZones.Shanghai);
}

/** 将ISO格式的日期时间字符串（无时区）解析为美国东部时间（ET）
 * @param {string} dateTime ISO格式的日期时间字符串
 * @returns {luxon.DateTime} 解析后的美国东部时间
 */
export function fromISOUseEastern(dateTime: string): luxon.DateTime {
  return luxon.DateTime.fromISO(dateTime, { zone: CommonTimeZones.NewYork });
}

/** 将ISO格式的日期时间字符串（无时区）解析为UTC时间（UTC）
 * @param {string} dateTime ISO格式的日期时间字符串
 * @returns {luxon.DateTime} 解析后的UTC时间
 */
export function fromISOUseUTC(dateTime: string): luxon.DateTime {
  return luxon.DateTime.fromISO(dateTime, { zone: CommonTimeZones.UTC })
}
/** 将ISO格式的日期时间字符串（无时区）解析为北京时间（CST）
 * @param {string} dateTime ISO格式的日期时间字符串
 * @returns {luxon.DateTime} 解析后的北京时间
 */
export function fromISOUseBeijing(dateTime: string): luxon.DateTime {
  return luxon.DateTime.fromISO(dateTime, { zone: CommonTimeZones.Shanghai })
}