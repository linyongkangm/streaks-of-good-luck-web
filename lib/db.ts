import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

// 创建全局 Prisma 客户端单例
// 这样可以避免在开发环境中创建多个实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
// 从环境变量读取数据库配置
const adapter = new PrismaMariaDb(process.env.DATABASE_URL!)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// 修复 BigInt 序列化问题
// 将 BigInt 转换为字符串以便 JSON.stringify 可以处理
// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString()
}
