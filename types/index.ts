import { 
  info__stock_company, 
  info__tweet,
  info__stock_board,
  info__industry_analysis,
  info__industry,
  info__predict,
  indicator__predict_observation,
  relation__stock_board_company,
  relation__board_industry_analysis,
  relation__industry_article,
  summary__tweet,
  summary__article,
  indicator__predict_financial_report,
  quote__profit_sheet,
  quote__balance_sheet,
  quote__cash_flow_sheet,
  view_financial_statements,
  info__milestone,
  relation__industry_or_company_milestone,
  info__core_statistic_template,
  info__core_data,
  relation__industry_or_company_core_statistic_template,
  info__calibration,
  relation__industry_or_company_calibration_industry
} from '@prisma/client'

// 导出 Prisma 生成的所有类型
export {
  type info__stock_company,
  type quote__stock_constituent_daily,
  type relation__stock_board_company,
  type info__tweet,
  type info__stock_board,
  type info__industry_analysis,
  type info__industry,
  type info__predict,
  type indicator__predict_observation,
  type relation__board_industry_analysis,
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
  type info__core_statistic_template,
  type info__core_data,
  type relation__industry_or_company_core_statistic_template,
  type info__calibration,
  type relation__industry_or_company_calibration_industry,
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

// 行业相关类型
export type IndustryListResponse = ApiResponse<info__industry[]>

export interface IndustryWithArticles extends info__industry {
  relation__industry_articles: (relation__industry_article & {
    summary__article: summary__article
  })[]
}

export interface IndustryWithCount extends info__industry {
  _count: { relation__industry_articles: number }
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

// 核心统计模板相关类型
export type CoreStatisticTemplateListResponse = ApiResponse<info__core_statistic_template[]>
export type CoreStatisticTemplateDetailResponse = ApiResponse<info__core_statistic_template>

export interface CreateCoreStatisticTemplateRequest {
  name: string
  relate_table: string
  core_formula: string
  description?: string
}

export interface UpdateCoreStatisticTemplateRequest {
  name?: string
  relate_table?: string
  core_formula?: string
  description?: string
}

// 核心数据相关类型
export type CoreDataListResponse = ApiResponse<info__core_data[]>
export type CoreDataDetailResponse = ApiResponse<info__core_data>

export interface CreateCoreDataRequest {
  industry_id?: number
  company_id?: number
  table: string
  data: Record<string, any>
}

export interface UpdateCoreDataRequest {
  table?: string
  data?: Record<string, any>
}

// 口径相关类型
export type CalibrationListResponse = ApiResponse<info__calibration[]>

export interface CalibrationWithSubIndustries extends info__calibration {
  relation__industry_or_company_calibration_industry: (relation__industry_or_company_calibration_industry & {
    sub_industry: info__industry
  })[]
}

export type CalibrationDetailResponse = ApiResponse<CalibrationWithSubIndustries>

export interface CreateCalibrationRequest {
  name: string
  description?: string
}

export interface UpdateCalibrationRequest {
  name?: string
  description?: string
}

// 行业核心统计扩展类型
export interface IndustryTemplateRelation extends relation__industry_or_company_core_statistic_template {
  info__core_statistic_template: info__core_statistic_template
}

export interface IndustryCalibrationRelation extends relation__industry_or_company_calibration_industry {
  info__calibration: info__calibration
  sub_industry: info__industry
}

export interface IndustryWithCoreStats extends IndustryWithArticles {
  relation__industry_or_company_core_statistic_template?: IndustryTemplateRelation[]
  info__core_data?: info__core_data[]
  relation__industry_or_company_calibration_industry?: IndustryCalibrationRelation[]
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
