import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/industries/:id/articles - 关联文章到行业
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const industryId = parseInt((await params).id)
    const body = await request.json()
    const { article_id } = body

    if (!article_id) {
      return NextResponse.json(
        { error: 'article_id 不能为空' },
        { status: 400 }
      )
    }

    const relation = await prisma.relation__industry_article.create({
      data: {
        industry_id: industryId,
        article_id: BigInt(article_id),
      },
      include: {
        summary__article: true,
      },
    })

    return NextResponse.json({ data: relation })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: '该文章已关联到此行业' },
        { status: 400 }
      )
    }
    console.error('Failed to link article to industry:', error)
    return NextResponse.json(
      { error: 'Failed to link article to industry' },
      { status: 500 }
    )
  }
}

// DELETE /api/industries/:id/articles - 移除行业与文章的关联
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const industryId = parseInt((await params).id)
    const body = await request.json()
    const { article_id } = body

    if (!article_id) {
      return NextResponse.json(
        { error: 'article_id 不能为空' },
        { status: 400 }
      )
    }

    await prisma.relation__industry_article.delete({
      where: {
        industry_id_article_id: {
          industry_id: industryId,
          article_id: BigInt(article_id),
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to unlink article from industry:', error)
    return NextResponse.json(
      { error: 'Failed to unlink article from industry' },
      { status: 500 }
    )
  }
}
