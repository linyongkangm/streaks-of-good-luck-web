import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import path from 'node:path'

function runCommand(command: string): Promise<string> {
  const { exec } = require('child_process')
  return new Promise((resolve, reject) => {
    const child = exec(command, {
      encoding: 'utf8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    }, (error: any, stdout: string, stderr: string) => {
      if (error) {
        reject(error)
        return
      }
      resolve(stdout ? stdout : stderr)
    })
    
    child.stdout?.on('data', (data: string) => {
      console.log(data)
    })
    
    child.stderr?.on('data', (data: string) => {
      console.error(data)
    })
  })
}

const LUCK_ROOT = path.resolve(process.cwd(), "../streaks-of-good-luck")
const RUN_LUCK_PATH = path.resolve(LUCK_ROOT, ".venv/Scripts/python.exe") + ' ' + path.resolve(LUCK_ROOT, "src/main.py")
function runLuckCommand(commandName: string, params: object): Promise<string> {
  const options = Object.entries(params).map(([key, value]) => `--${key} ${value}`).join(' ')
  const command = `${RUN_LUCK_PATH} ${commandName} ${options}`
  return runCommand(command)
}

// POST /api/run-luck - 运行 run-luck 命令
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { commandName, params } = body
    const result = await runLuckCommand(commandName, params)
    console.log('Run luck command result:', result)
    return NextResponse.json({
      echo: result,
    })
  } catch (error) {
    console.error('Failed to fetch tweets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tweets' },
      { status: 500 }
    )
  }
}
