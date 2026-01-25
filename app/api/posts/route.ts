import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/posts - 获取所有文章
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const published = searchParams.get('published')

    const posts = await prisma.post.findMany({
      where: published === 'true' ? { published: true } : undefined,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(posts)
  } catch (error) {
    console.error('获取文章列表失败:', error)
    return NextResponse.json(
      { error: '获取文章列表失败' },
      { status: 500 }
    )
  }
}

// POST /api/posts - 创建新文章
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, authorId, published } = body

    if (!title || !authorId) {
      return NextResponse.json(
        { error: '标题和作者ID为必填项' },
        { status: 400 }
      )
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        published: published ?? false,
        authorId: parseInt(authorId),
      },
      include: {
        author: true,
      },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error: any) {
    console.error('创建文章失败:', error)

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: '作者不存在' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '创建文章失败' },
      { status: 500 }
    )
  }
}
