import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extractMilestoneKeyword } from '@/app/tools/extractMilestoneKeyword'
import { extractMilestoneImpact } from '@/app/tools/extractMilestoneImpact'

// GET /api/milestones - 获取里程碑列表（支持按行业ID、公司ID、文章ID和日期范围筛选）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const industryId = searchParams.get('industryId')
    const companyId = searchParams.get('companyId')
    const articleId = searchParams.get('articleId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    // 按文章 ID 筛选
    if (articleId) {
      where.article_id = BigInt(articleId)
      // 如果同时指定了 industryId，则需要关联到该行业
      if (industryId) {
        where.AND = [
          {
            article_id: BigInt(articleId)
          },
          {
            relation__industry_or_company_milestone: {
              some: {
                industry_id: parseInt(industryId)
              }
            }
          }
        ]
        delete where.article_id
      }
    }
    // 按关联的行业或公司筛选
    else if (industryId || companyId) {
      where.relation__industry_or_company_milestone = {
        some: {
          ...(industryId && { industry_id: parseInt(industryId) }),
          ...(companyId && { company_id: parseInt(companyId) }),
        }
      }
    }

    // 按日期范围筛选
    if (startDate || endDate) {
      where.milestone_date = {}
      if (startDate) {
        where.milestone_date.gte = new Date(startDate)
      }
      if (endDate) {
        where.milestone_date.lte = new Date(endDate)
      }
    }

    const milestones = await prisma.info__milestone.findMany({
      where,
      include: {
        relation__industry_or_company_milestone: {
          where: {
            ...(industryId && { industry_id: parseInt(industryId) }),
            ...(companyId && { company_id: parseInt(companyId) }),
          },
          include: {
            info__industry: true,
            info__stock_company: true,
          },
        },
        summary__article: true,
      },
      orderBy: {
        milestone_date: 'asc',
      },
    })

    return NextResponse.json({ data: milestones })
  } catch (error) {
    console.error('Failed to fetch milestones:', error)
    return NextResponse.json(
      { error: 'Failed to fetch milestones' },
      { status: 500 }
    )
  }
}

// POST /api/milestones - 创建里程碑
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, milestone_date, industry_ids = [], company_ids = [], keyword: clientKeyword, article_id, impact: clientImpact } = body

    if (!title || !milestone_date) {
      return NextResponse.json(
        { error: '标题和日期不能为空' },
        { status: 400 }
      )
    }

    // 如果客户端提供了 keyword，就用客户端的；否则调用 LLM 生成
    const keyword = clientKeyword ? clientKeyword : await extractMilestoneKeyword(title, description)

    // 创建里程碑
    const milestone = await prisma.info__milestone.create({
      data: {
        title,
        description: description || null,
        milestone_date: new Date(milestone_date),
        keyword,
        article_id: article_id ? BigInt(article_id) : null,
      },
    })

    // 为每个行业或公司计算 impact 并创建关联
    const relationDataPromises: Promise<any>[] = []

    // 处理行业关联
    for (const industryId of industry_ids) {
      const industry = await prisma.info__industry.findUnique({
        where: { id: industryId },
      })
      if (industry) {
        // 如果客户端提供了 impact，就用客户端的；否则调用 LLM 生成
        let impact: string
        if (clientImpact) {
          impact = clientImpact
        } else {
          const impactContext = `行业: ${industry.name}`
          impact = await extractMilestoneImpact(title, description, impactContext)
        }
        relationDataPromises.push(
          prisma.relation__industry_or_company_milestone.create({
            data: {
              milestone_id: milestone.id,
              industry_id: industryId,
              impact,
            },
          })
        )
      }
    }

    // 处理公司关联
    for (const companyId of company_ids) {
      const company = await prisma.info__stock_company.findUnique({
        where: { id: companyId },
      })
      if (company) {
        // 如果客户端提供了 impact，就用客户端的；否则调用 LLM 生成
        let impact: string
        if (clientImpact) {
          impact = clientImpact
        } else {
          const impactContext = `公司: ${company.company_name}`
          impact = await extractMilestoneImpact(title, description, impactContext)
        }
        relationDataPromises.push(
          prisma.relation__industry_or_company_milestone.create({
            data: {
              milestone_id: milestone.id,
              company_id: companyId,
              impact,
            },
          })
        )
      }
    }

    // 等待所有关联创建完成
    await Promise.all(relationDataPromises)

    // 重新获取完整的 milestone 数据
    const fullMilestone = await prisma.info__milestone.findUnique({
      where: { id: milestone.id },
      include: {
        relation__industry_or_company_milestone: {
          include: {
            info__industry: true,
            info__stock_company: true,
          },
        },
        summary__article: true,
      },
    })

    return NextResponse.json({ data: fullMilestone })
  } catch (error) {
    console.error('Failed to create milestone:', error)
    return NextResponse.json(
      { error: 'Failed to create milestone' },
      { status: 500 }
    )
  }
}
