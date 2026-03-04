import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/company-industries?company_id={id} - 获取公司的行业列表
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyIdStr = searchParams.get('company_id')

    if (!companyIdStr) {
      return NextResponse.json(
        { error: 'company_id is required' },
        { status: 400 }
      )
    }

    const companyId = Number(companyIdStr)

    if (Number.isNaN(companyId)) {
      return NextResponse.json(
        { error: 'Invalid company_id' },
        { status: 400 }
      )
    }

    const relations = await prisma.relation__industry_company.findMany({
      where: {
        company_id: companyId,
      },
      include: {
        info__industry: true,
      },
      orderBy: {
        weight: 'desc',
      },
    })

    return NextResponse.json({ data: relations })
  } catch (error) {
    console.error('获取公司行业列表失败:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/company-industries - 添加公司-行业关联
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { company_id, industry_id, weight = 0 } = body

    if (!company_id || !industry_id) {
      return NextResponse.json(
        { error: 'company_id and industry_id are required' },
        { status: 400 }
      )
    }

    const relation = await prisma.relation__industry_company.create({
      data: {
        company_id,
        industry_id,
        weight,
      },
      include: {
        info__industry: true,
        info__stock_company: true,
      },
    })

    return NextResponse.json({ data: relation }, { status: 201 })
  } catch (error) {
    console.error('添加公司-行业关联失败:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
