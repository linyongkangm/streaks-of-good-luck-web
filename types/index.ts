import { 
  info__stock_company, 
  info__tweet,

  info__industry_analysis,
  info__industry,
  info__predict,
  indicator__predict_observation,

  relation__industry_article,
  summary__tweet,
  summary__article,
  indicator__predict_financial_report,
  quote__profit_sheet,
  quote__balance_sheet,
  quote__cash_flow_sheet,
  view_financial_statements,
  info__milestone,
  relation__industry_or_company_milestone
} from '@prisma/client'

// 导出 Prisma 生成的所有类型
export {
  type info__stock_company,
  type quote__stock_constituent_daily,

  type info__tweet,

  type info__industry_analysis,
  type info__industry,
  type info__predict,
  type indicator__predict_observation,

  type relation__industry_article,
  type summary__tweet,
  type summary__article,
  type indicator__predict_financial_report,
  type quote__profit_sheet,
  type quote__balance_sheet,
  type quote__cash_flow_sheet,
  type view_financial_statements,
  type info__milestone,
  type relation__industry_or_company_milestone,
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




// 推文摘要相关类型
export type TweetSummaryListResponse = ApiResponse<summary__tweet[]>

// 文章摘要相关类型
export type ArticleSummaryListResponse = ApiResponse<summary__article[]>

// 行业相关类型
export type IndustryListResponse = ApiResponse<info__industry[]>

export interface IndustryWithArticles extends info__industry {
  relation__industry_articles: (relation__industry_article & {
    summary__article: summary__article
  })[]
}

export interface IndustryWithCount extends info__industry {
  _count: {
    relation__industry_articles: number
  }
}

export type PredictDetail = info__predict & {
  summary__article?: summary__article | null
}
// Ԥ��۲��¼�������
export type ObservationDetail = indicator__predict_observation

export interface CreateObservationRequest {
  observation_date: string | Date
  content: string
}

// 里程碑相关类型
export type MilestoneListResponse = ApiResponse<MilestoneWithRelations[]>

export interface MilestoneWithRelations extends info__milestone {
  relation__industry_or_company_milestone: (relation__industry_or_company_milestone & {
    info__industry: info__industry | null
    info__stock_company: info__stock_company | null
  })[]
  summary__article?: summary__article | null
}

export type MilestoneDetailResponse = ApiResponse<MilestoneWithRelations>

export interface CreateMilestoneRequest {
  title: string
  description?: string
  milestone_date: string | Date
  status?: string
  keyword?: string
  industry_ids?: number[]
  company_ids?: number[]
}

export interface UpdateMilestoneRequest {
  title?: string
  description?: string
  milestone_date?: string | Date
  status?: string
  keyword?: string
  industry_ids?: number[]
  company_ids?: number[]
}

// 公式解析类型
export interface ParsedFormula {
  resultName: string // 结果名称（如："净利润"）
  variables: string[] // 变量名列表（如：["人数", "渗透率", ...]）
  expression: string // 原始表达式
}

export interface FormulaEvaluationResult {
  success: boolean
  result?: number
  error?: string
  missingVariables?: string[]
}

// 行业景气度分析相关类型
export interface IndustryAnalysisWithIndustry extends info__industry_analysis {
  info__industry?: info__industry | null
}

export interface IndustryProsperityAnalysisRequest {
  file?: File // 前端上传时使用
  fileUrl?: string // URL方式
  industryId?: number | string
  title?: string
  publisher?: string
  author?: string
  reportDate?: string
}

export interface IndustryProsperityAnalysisResponse extends ApiResponse<IndustryAnalysisWithIndustry> {}

export interface IndustryAnalysisListResponse extends ApiResponse<{
  data: IndustryAnalysisWithIndustry[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pages: number
  }
}> {}
