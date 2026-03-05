import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { promises as fs } from 'fs'
import path from 'path'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8001'
const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/industry-reports')

// GET /api/industry-analysis - 获取行业景气度分析列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const industryId = searchParams.get('industryId')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    const where: any = {}
    if (industryId) {
      where.industry_id = parseInt(industryId)
    }

    const skip = (page - 1) * pageSize

    // 获取总数
    const total = await prisma.info__industry_analysis.count({ where })

    // 获取分页数据，按创建时间降序
    const analyses = await prisma.info__industry_analysis.findMany({
      where,
      include: {
        info__industry: true,
      },
      orderBy: {
        create_time: 'desc',
      },
      skip,
      take: pageSize,
    })

    return NextResponse.json({
      data: analyses,
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('Failed to fetch industry analyses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch industry analyses' },
      { status: 500 }
    )
  }
}

// POST /api/industry-analysis - 上传PDF并进行分析
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const fileUrl = formData.get('fileUrl') as string | null
    const industryId = formData.get('industryId') as string | null
    const title = formData.get('title') as string | null
    const publisher = formData.get('publisher') as string | null
    const author = formData.get('author') as string | null
    const reportDate = formData.get('reportDate') as string | null
    // 调用 Python API 进行分析
    const industryName =
      industryId && industryId !== '0'
        ? (
            await prisma.info__industry.findUnique({
              where: { id: parseInt(industryId) },
            })
          )?.name
        : undefined
    if (!file && !fileUrl) {
      return NextResponse.json(
        { error: '必须提供PDF文件或文件URL' },
        { status: 400 }
      )
    }

    let filePath: string | null = null
    let fileName: string | null = null

    // 如果提供了文件，保存至本地
    if (file) {
      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { error: '仅支持PDF文件' },
          { status: 400 }
        )
      }

      // 生成唯一的文件名
      const timestamp = Date.now()
      fileName = `${industryName}_${timestamp}_${file.name}`
      filePath = path.join(UPLOAD_DIR, fileName)

      // 确保上传目录存在
      try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true })
      } catch (error) {
        console.error('Failed to create upload directory:', error)
      }

      // 保存文件
      const buffer = await file.arrayBuffer()
      await fs.writeFile(filePath, Buffer.from(buffer))
      console.log(`File saved: ${filePath}`)
    }

    // 确定要分析的文件路径
    const analysisFilePath = filePath || fileUrl
    if (!analysisFilePath) {
      return NextResponse.json(
        { error: '无法确定文件路径' },
        { status: 400 }
      )
    }



    console.log(`Calling Python API for analysis...`)
    const response = await fetch(`${PYTHON_API_URL}/analyze-industry-prosperity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_path: analysisFilePath,
        industry_name: industryName,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Python API error: ${response.status}`, error)
      throw new Error(`Python API returned ${response.status}: ${error}`)
    }

    const analysisResult = await response.json()

    if (!analysisResult.success) {
      return NextResponse.json(
        { error: `分析失败: ${analysisResult.message || '未知错误'}` },
        { status: 500 }
      )
    }

    // 从分析结果中提取数据
    const analysis = analysisResult.analysis
    const summary = analysis.summary || ''

    // 保存分析结果到数据库
    const record = await prisma.info__industry_analysis.create({
      data: {
        title: title || file?.name || `${industryName || '行业'}景气度分析`,
        summary,
        publisher: publisher || null,
        author: author || null,
        original_file: filePath ? `/uploads/industry-reports/${fileName}` : null,
        original_url: fileUrl,
        report_time: reportDate ? new Date(reportDate) : new Date(),
        industry_id: industryId && industryId !== '0' ? parseInt(industryId) : null,
        signal_demand: analysis.demand || null,
        signal_price: analysis.price || null,
        signal_supply: analysis.supply || null,
        signal_profitability: analysis.profitability || null,
        ai_model_version: 'gpt-4',
      },
      include: {
        info__industry: true,
      },
    })

    return NextResponse.json({ data: record })
  } catch (error) {
    console.error('Failed to create industry analysis:', error)

    // 清理已上传的文件（如果分析失败）
    // 这里可以添加文件清理逻辑

    return NextResponse.json(
      { error: `创建分析失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    )
  }
}
