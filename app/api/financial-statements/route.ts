import { NextRequest, NextResponse } from 'next/server'
import {prisma} from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const company_id = searchParams.get('company_id')
    const sheet_type = searchParams.get('sheet_type') // 'balance' | 'profit' | 'cash_flow'

    if (!company_id) {
      return NextResponse.json({ error: '缺少company_id参数' }, { status: 400 })
    }

    if (!sheet_type) {
      return NextResponse.json({ error: '缺少sheet_type参数' }, { status: 400 })
    }

    const companyId = parseInt(company_id)

    let data: any[] = []

    switch (sheet_type) {
      case 'balance':
        data = await prisma.quote__balance_sheet.findMany({
          where: { company_id: companyId },
          orderBy: { report_date: 'desc' },
          include: {
            info__stock_company: {
              select: {
                company_name: true,
                company_code: true
              }
            }
          }
        })
        break

      case 'profit':
        data = await prisma.quote__profit_sheet.findMany({
          where: { company_id: companyId },
          orderBy: { report_date: 'desc' },
          include: {
            info__stock_company: {
              select: {
                company_name: true,
                company_code: true
              }
            }
          }
        })
        break

      case 'cash_flow':
        data = await prisma.quote__cash_flow_sheet.findMany({
          where: { company_id: companyId },
          orderBy: { report_date: 'desc' },
          include: {
            info__stock_company: {
              select: {
                company_name: true,
                company_code: true
              }
            }
          }
        })
        break

      default:
        return NextResponse.json({ error: '无效的sheet_type参数' }, { status: 400 })
    }

    return NextResponse.json({ data })

  } catch (error: any) {
    console.error('查询财报数据失败:', error)
    return NextResponse.json(
      { error: '查询财报数据失败', details: error.message },
      { status: 500 }
    )
  }
}
