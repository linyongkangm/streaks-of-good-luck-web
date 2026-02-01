import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { TweetDetailResponse, ApiError } from '@/types'

// GET /api/info-tweets/[id] - 获取单个推文信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<TweetDetailResponse | ApiError>> {
  try {
    const id = BigInt((await params).id)

    const tweet = await prisma.info__tweet.findUnique({
      where: { id },
    })

    if (!tweet) {
      return NextResponse.json(
        { error: '推文不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: tweet })
  } catch (error) {
    console.error('获取推文信息失败:', error)
    return NextResponse.json(
      { error: '获取推文信息失败或无效的ID' },
      { status: 500 }
    )
  }
}

// PUT /api/info-tweets/[id] - 更新推文信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<TweetDetailResponse | ApiError>> {
  try {
    const id = BigInt((await params).id)
    const body = await request.json()

    // 检查推文是否存在
    const existingTweet = await prisma.info__tweet.findUnique({
      where: { id },
    })

    if (!existingTweet) {
      return NextResponse.json(
        { error: '推文不存在' },
        { status: 404 }
      )
    }

    const {
      user_name,
      tweet_date,
      tweet_text,
      reply_count,
      retweet_count,
      like_count,
      view_count,
      tweet_url,
      tweet_from,
      collect_from,
    } = body

    const updateData: any = {}

    if (user_name !== undefined) updateData.user_name = user_name
    if (tweet_date !== undefined) updateData.tweet_date = new Date(tweet_date)
    if (tweet_text !== undefined) updateData.tweet_text = tweet_text
    if (reply_count !== undefined) updateData.reply_count = reply_count
    if (retweet_count !== undefined) updateData.retweet_count = retweet_count
    if (like_count !== undefined) updateData.like_count = like_count
    if (view_count !== undefined) updateData.view_count = view_count
    if (tweet_url !== undefined) updateData.tweet_url = tweet_url
    if (tweet_from !== undefined) updateData.tweet_from = tweet_from
    if (collect_from !== undefined) updateData.collect_from = collect_from

    const tweet = await prisma.info__tweet.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: tweet })
  } catch (error) {
    console.error('更新推文失败:', error)
    return NextResponse.json(
      { error: '更新推文失败或无效的ID' },
      { status: 500 }
    )
  }
}

// PATCH /api/info-tweets/[id] - 部分更新推文信息（与 PUT 相同）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params })
}

// DELETE /api/info-tweets/[id] - 删除推文
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ message: string } | ApiError>> {
  try {
    const id = BigInt((await params).id)

    // 检查推文是否存在
    const existingTweet = await prisma.info__tweet.findUnique({
      where: { id },
    })

    if (!existingTweet) {
      return NextResponse.json(
        { error: '推文不存在' },
        { status: 404 }
      )
    }

    await prisma.info__tweet.delete({
      where: { id },
    })

    return NextResponse.json(
      { message: '推文删除成功' },
      { status: 200 }
    )
  } catch (error) {
    console.error('删除推文失败:', error)
    return NextResponse.json(
      { error: '删除推文失败或无效的ID' },
      { status: 500 }
    )
  }
}
