import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extractMilestoneKeyword } from '@/app/tools/extractMilestoneKeyword'
import { extractMilestoneImpact } from '@/app/tools/extractMilestoneImpact'

// GET /api/milestones/:id - 获取单个里程碑详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id)

    const milestone = await prisma.info__milestone.findUnique({
      where: { id },
      include: {
        relation__industry_or_company_milestone: {
          include: {
            info__industry: true,
            info__stock_company: true,
          },
        },
      },
    })

    if (!milestone) {
      return NextResponse.json(
        { error: '里程碑不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: milestone })
  } catch (error) {
    console.error('Failed to fetch milestone:', error)
    return NextResponse.json(
      { error: 'Failed to fetch milestone' },
      { status: 500 }
    )
  }
}

// PUT /api/milestones/:id - 更新里程碑
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id)
    const body = await request.json()
    const { title, description, milestone_date, industry_ids, company_ids, keyword: clientKeyword, impact: clientImpact } = body

    if (!title || !milestone_date) {
      return NextResponse.json(
        { error: '标题和日期不能为空' },
        { status: 400 }
      )
    }

    // 如果客户端提供了 keyword，就用客户端的；否则调用 LLM 生成
    const keyword = clientKeyword ? clientKeyword : await extractMilestoneKeyword(title, description)

    const hasIndustryIds = Array.isArray(industry_ids)
    const hasCompanyIds = Array.isArray(company_ids)

    if (!hasIndustryIds && industry_ids !== undefined) {
      return NextResponse.json(
        { error: 'industry_ids 必须是数组' },
        { status: 400 }
      )
    }

    if (!hasCompanyIds && company_ids !== undefined) {
      return NextResponse.json(
        { error: 'company_ids 必须是数组' },
        { status: 400 }
      )
    }

    // 更新 milestone
    const milestone = await prisma.info__milestone.update({
      where: { id },
      data: {
        title,
        description: description || null,
        milestone_date: new Date(milestone_date),
        keyword,
      },
    })

    // 为每个行业或公司计算 impact 并创建新的关联
    const relationDataPromises: Promise<any>[] = []

    // 仅在客户端明确传了 industry_ids 时，才替换行业关联
    if (hasIndustryIds) {
      await prisma.relation__industry_or_company_milestone.deleteMany({
        where: {
          milestone_id: id,
          industry_id: { not: null },
        },
      })

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
                milestone_id: id,
                industry_id: industryId,
                impact,
              },
            })
          )
        }
      }
    }

    // 仅在客户端明确传了 company_ids 时，才替换公司关联
    if (hasCompanyIds) {
      await prisma.relation__industry_or_company_milestone.deleteMany({
        where: {
          milestone_id: id,
          company_id: { not: null },
        },
      })

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
                milestone_id: id,
                company_id: companyId,
                impact,
              },
            })
          )
        }
      }
    }

    // 等待所有关联创建完成
    await Promise.all(relationDataPromises)

    // 重新获取完整的 milestone 数据
    const fullMilestone = await prisma.info__milestone.findUnique({
      where: { id },
      include: {
        relation__industry_or_company_milestone: {
          include: {
            info__industry: true,
            info__stock_company: true,
          },
        },
      },
    })

    return NextResponse.json({ data: fullMilestone })
  } catch (error) {
    console.error('Failed to update milestone:', error)
    return NextResponse.json(
      { error: 'Failed to update milestone' },
      { status: 500 }
    )
  }
}

// DELETE /api/milestones/:id - 删除里程碑
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id)

    await prisma.info__milestone.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete milestone:', error)
    return NextResponse.json(
      { error: 'Failed to delete milestone' },
      { status: 500 }
    )
  }
}
