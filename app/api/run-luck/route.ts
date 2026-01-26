import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import path from 'node:path'

const LUCK_ROOT = path.resolve(process.cwd(), "../streaks-of-good-luck")
const RUN_LUCK_PATH = path.resolve(LUCK_ROOT, ".venv/Scripts/python.exe") + ' ' + path.resolve(LUCK_ROOT, "src/main.py")

function runLuckCommand(commandName: string, params: object): string {
  const options = Object.entries(params).map(([key, value]) => `--${key} ${value}`).join(' ')
  const command = `${RUN_LUCK_PATH} ${commandName} ${options}`
  return command
}

// POST /api/run-luck - 运行 run-luck 命令并实时流式返回输出
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { commandName, params } = body
    const command = runLuckCommand(commandName, params)
    
    const { exec } = require('child_process')
    
    // 创建流式响应
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        
        const child = exec(command, {
          encoding: 'utf8',
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        })
        
        // 监听标准输出
        child.stdout?.on('data', (data: string) => {
          console.log('[stdout]', data)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stdout', data: data })}\n\n`))
        })
        
        // 监听标准错误
        child.stderr?.on('data', (data: string) => {
          console.error('[stderr]', data)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stderr', data: data })}\n\n`))
        })
        
        // 监听进程结束
        child.on('close', (code: number) => {
          console.log('[close]', code)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'close', code: code })}\n\n`))
          controller.close()
        })
        
        // 监听错误
        child.on('error', (error: Error) => {
          console.error('[error]', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`))
          controller.close()
        })
      },
    })
    
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Failed to run command:', error)
    return NextResponse.json(
      { error: 'Failed to run command' },
      { status: 500 }
    )
  }
}
