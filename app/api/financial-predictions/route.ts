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
 *   id?: string,  // 如果提供id则更新，否则创建
 *   company_id?: number,
 *   board_id?: number,
 *   report_date: string,
 *   parent_netprofit?: number,
 *   total_parent_equity?: number,
 *   operate_income?: number,
 *   netcash_operate?: number,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id,
      company_id, 
      board_id, 
      report_date, 
      parent_netprofit,
      total_parent_equity,
      operate_income,
      netcash_operate 
    } = body

    // 验证必填字段
    if (!report_date) {
      return NextResponse.json(
        { success: false, error: '缺少报告期' },
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

    // 构建数据对象，只包含提供的字段
    const dataFields: any = {
      report_date: new Date(report_date)
    }
    
    if (parent_netprofit !== undefined && parent_netprofit !== null && parent_netprofit !== '') {
      dataFields.parent_netprofit = parseFloat(parent_netprofit.toString())
    }
    if (total_parent_equity !== undefined && total_parent_equity !== null && total_parent_equity !== '') {
      dataFields.total_parent_equity = parseFloat(total_parent_equity.toString())
    }
    if (operate_income !== undefined && operate_income !== null && operate_income !== '') {
      dataFields.operate_income = parseFloat(operate_income.toString())
    }
    if (netcash_operate !== undefined && netcash_operate !== null && netcash_operate !== '') {
      dataFields.netcash_operate = parseFloat(netcash_operate.toString())
    }

    let prediction
    if (id) {
      // 如果提供了id，则更新记录
      prediction = await prisma.indicator__predict_financial_report.update({
        where: { id: BigInt(id) },
        data: dataFields
      })
    } else {
      // 否则创建新记录
      const data: any = {
        ...dataFields
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
