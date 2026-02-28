import { Decimal } from '@prisma/client/runtime/client';
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

/**
 * 格式化数字，自动转换为亿/万单位
 * @param {any} value 数值
 * @param {number} decimals 小数位数，默认2位
 * @returns {string} 格式化后的字符串
 */
export function formatNumber(value: string | number | undefined | null | Decimal, decimals: number = 2): string {
  if (value === null || value === undefined) return '-'
  const num = Number(value)
  const abs = Math.abs(num)
  const sign = num < 0 ? '-' : ''

  if (abs >= 100000000) return `${sign}${(abs / 100000000).toFixed(decimals)}亿`
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(decimals)}万`
  return num.toFixed(decimals)
}

/** 格式化百分比
 * @param {any} current 当前值
 * @param {any} last 上一个值
 * @returns {string} 格式化后的百分比字符串，带颜色表示增长（红色）或下降（绿色）
 */
export function formatPercent(current: any, last: any) {
  if (!current || !last || last === 0) return '-'
  const change = ((Number(current) - Number(last)) / Number(last)) * 100
  const isPositive = change > 0
  return (
    <span className={isPositive ? 'text-red-600' : change < 0 ? 'text-green-600' : 'text-slate-900'}>
      {isPositive ? '+' : ''}{change.toFixed(2)}%
    </span>
  )
}

/**
 * 生成颜色渐变数组
 * @param {number} len 生成的颜色数量
 * @param {string} startColor 起始颜色（十六进制格式，如 '#FF0000'）
 * @param {string} endColor 结束颜色（十六进制格式，如 '#0000FF'）
 * @returns {string[]} 颜色字符串数组
 */
export function genColorGradient(len: number, startColor: string, endColor: string): string[] {
  if (len <= 0) return []
  if (len === 1) return [startColor]

  // 解析十六进制颜色为 RGB
  const parseColor = (color: string): [number, number, number] => {
    const hex = color.replace('#', '')
    return [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16),
    ]
  }

  // RGB 转十六进制颜色
  const rgbToHex = (r: number, g: number, b: number): string => {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  const [r1, g1, b1] = parseColor(startColor)
  const [r2, g2, b2] = parseColor(endColor)

  const colors: string[] = []
  for (let i = 0; i < len; i++) {
    const ratio = i / (len - 1)
    const r = r1 + (r2 - r1) * ratio
    const g = g1 + (g2 - g1) * ratio
    const b = b1 + (b2 - b1) * ratio
    colors.push(rgbToHex(r, g, b))
  }

  return colors
}


export function genGrayGradient(len: number): string[] {
  const minGrayValue = 60;   // 最深灰度值
  const maxGrayValue = 240;  // 最浅灰度值
  // 计算每一步的递减步长（均匀分配灰度梯度）
  const step = len === 1 ? 0 : (maxGrayValue - minGrayValue) / (len - 1);
  return Array.from({ length: len }, (_, i) => {
    const grayValue = Math.floor(maxGrayValue - (i * step));
    const hex = grayValue.toString(16).padStart(2, '0');
    return `#${hex}${hex}${hex}`;
  });
}

