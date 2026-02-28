import { 
  info__stock_company, 
  info__tweet,
  info__stock_board,
  info__industry_analysis,
  info__predict,
  indicator__predict_observation,
  relation__stock_board_company,
  relation__board_industry_analysis,
  summary__tweet,
  summary__article,
  indicator__predict_financial_report,
  quote__profit_sheet,
  quote__balance_sheet,
  quote__cash_flow_sheet,
} from '@prisma/client'

// 导出 Prisma 生成的所有类型
export {
  type info__stock_company,
  type quote__stock_constituent_daily,
  type relation__stock_board_company,
  type info__tweet,
  type info__stock_board,
  type info__industry_analysis,
  type info__predict,
  type indicator__predict_observation,
  type relation__board_industry_analysis,
  type summary__tweet,
  type summary__article,
  type indicator__predict_financial_report,
  type quote__profit_sheet,
  type quote__balance_sheet,
  type quote__cash_flow_sheet,
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

// 股票公司详情响应
export type StockCompanyDetailResponse = ApiResponse<info__stock_company>

// 推文列表响应
export type TweetListResponse = ApiResponse<info__tweet[]>

// 推文详情响应
export type TweetDetailResponse = ApiResponse<info__tweet>

// 创建推文请求体
export interface CreateTweetRequest {
  tweet_id: string
  user_name: string
  tweet_date: string | Date
  tweet_text: string
  reply_count?: string
  retweet_count?: string
  like_count?: string
  view_count?: string
  tweet_url: string
  tweet_from: string
  collect_from: string
}

// 更新推文请求体
export interface UpdateTweetRequest {
  user_name?: string
  tweet_date?: string | Date
  tweet_text?: string
  reply_count?: string
  retweet_count?: string
  like_count?: string
  view_count?: string
  tweet_url?: string
  tweet_from?: string
  collect_from?: string
}

// 推文查询参数
export interface TweetQueryParams {
  user_name?: string
  tweet_from?: string
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
}

// 行业板块相关类型
export type StockBoardListResponse = ApiResponse<info__stock_board[]>

export interface StockBoardWithRelations extends info__stock_board {
  relation__stock_board_company: (relation__stock_board_company & {
    info__stock_company: info__stock_company
  })[]
  relation__board_industry_analysis: (relation__board_industry_analysis & {
    info__industry_analysis: info__industry_analysis
  })[]
}

export type StockBoardDetailResponse = ApiResponse<StockBoardWithRelations>

// 推文摘要相关类型
export type TweetSummaryListResponse = ApiResponse<summary__tweet[]>

// 文章摘要相关类型
export type ArticleSummaryListResponse = ApiResponse<summary__article[]>

export type PredictDetail = info__predict & {
  summary__article?: summary__article | null
}
// Ԥ��۲��¼�������
export type ObservationDetail = indicator__predict_observation

export interface CreateObservationRequest {
  observation_date: string | Date
  content: string
}
