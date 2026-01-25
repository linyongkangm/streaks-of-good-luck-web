import { info__stock_company, indicator__company_finance } from '@prisma/client'

// 导出 Prisma 生成的所有类型
export {
  type info__stock_company,
  type indicator__company_finance,
  type quote__stock_constituent_daily,
  type relation__stock_board_company,
} from '@prisma/client'

// API 响应类型
export interface ApiResponse<T> {
  data: T
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiError {
  error: string
}

// 股票公司列表响应
export type StockCompanyListResponse = ApiResponse<info__stock_company[]>

// 股票公司详情响应（包含财务数据）
export interface StockCompanyWithFinance extends info__stock_company {
  indicator__company_finance: indicator__company_finance[]
}

export type StockCompanyDetailResponse = ApiResponse<StockCompanyWithFinance>
