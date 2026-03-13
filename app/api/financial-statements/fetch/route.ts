import { NextRequest, NextResponse } from 'next/server'
import { fetchAndSaveFinancialStatements } from '../financial-data-utils'

export async function POST(req: NextRequest) {
  try {
    const { company_id } = await req.json()

    if (!company_id) {
      return NextResponse.json({ error: '缺少company_id参数' }, { status: 400 })
    }

    const counts = await fetchAndSaveFinancialStatements(parseInt(company_id))

    return NextResponse.json({
      message: '财报数据获取成功',
      counts,
    })

  } catch (error: any) {
    console.error('获取财报数据失败:', error)
    return NextResponse.json(
      { error: '获取财报数据失败', details: error.message },
      { status: 500 }
    )
  }
}
