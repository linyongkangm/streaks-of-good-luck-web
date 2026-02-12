import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET - 获取财务预测数据
 * 查询参数:
 * - company_id: 公司ID (可选)
 * - board_id: 板块ID (可选)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('company_id')
    const boardId = searchParams.get('board_id')

    const where: any = {}
    
    if (companyId) {
      where.company_id = parseInt(companyId)
      where.board_id = null
    } else if (boardId) {
      where.board_id = parseInt(boardId)
      where.company_id = null
    }

    // 获取预测数据，按报告日期排序
    const predictions = await prisma.indicator__predict_financial_report.findMany({
      where,
      orderBy: {
        report_date: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: predictions
    })
  } catch (error) {
    console.error('获取财务预测数据失败:', error)
    return NextResponse.json(
      { success: false, error: '获取数据失败' },
      { status: 500 }
    )
  }
}

/**
 * POST - 创建或更新财务预测数据
 * Body:
 * {
 *   company_id?: number,
 *   board_id?: number,
 *   report_date: string,
 *   metric_type: 'pe' | 'pb' | 'ps' | 'pc',
 *   metric_value: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { company_id, board_id, report_date, metric_type, metric_value } = body

    // 验证必填字段
    if (!report_date || !metric_type || metric_value === undefined) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 验证至少有一个ID
    if (!company_id && !board_id) {
      return NextResponse.json(
        { success: false, error: '必须提供company_id或board_id' },
        { status: 400 }
      )
    }

    // 验证metric_type
    if (!['pe', 'pb', 'ps', 'pc'].includes(metric_type)) {
      return NextResponse.json(
        { success: false, error: '无效的metric_type' },
        { status: 400 }
      )
    }

    // 映射metric_type到字段名
    const fieldMap: Record<string, string> = {
      pe: 'parent_netprofit',
      pb: 'total_parent_equity',
      ps: 'operate_income',
      pc: 'netcash_operate',
    }

    const fieldName = fieldMap[metric_type]

    // 构建where条件
    const where: any = {
      report_date: new Date(report_date),
    }

    if (company_id) {
      where.company_id = parseInt(company_id)
      where.board_id = null
    } else {
      where.board_id = parseInt(board_id)
      where.company_id = null
    }

    // 查找是否存在该记录
    const existing = await prisma.indicator__predict_financial_report.findFirst({
      where
    })

    let prediction
    if (existing) {
      // 更新现有记录的指定字段
      prediction = await prisma.indicator__predict_financial_report.update({
        where: { id: existing.id },
        data: {
          [fieldName]: parseFloat(metric_value)
        }
      })
    } else {
      // 创建新记录
      const data: any = {
        report_date: new Date(report_date),
        [fieldName]: parseFloat(metric_value)
      }

      if (company_id) {
        data.company_id = parseInt(company_id)
      } else {
        data.board_id = parseInt(board_id)
      }

      prediction = await prisma.indicator__predict_financial_report.create({
        data
      })
    }

    return NextResponse.json({
      success: true,
      data: prediction
    })
  } catch (error) {
    console.error('创建财务预测数据失败:', error)
    return NextResponse.json(
      { success: false, error: '创建数据失败' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - 删除财务预测数据
 * Body:
 * {
 *   id: number
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少id参数' },
        { status: 400 }
      )
    }

    await prisma.indicator__predict_financial_report.delete({
      where: {
        id: BigInt(id)
      }
    })

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('删除财务预测数据失败:', error)
    return NextResponse.json(
      { success: false, error: '删除数据失败' },
      { status: 500 }
    )
  }
}
