-- 创建财务报表综合视图
-- 该视图整合资产负债表（报告期累计）、利润表（单季度）、现金流量表（单季度）
-- 每个报告期包含最近四个季度和上年度四个季度的汇总数据

DROP VIEW IF EXISTS view_financial_statements;

CREATE VIEW view_financial_statements AS
WITH
-- 利润表单季度数据及滚动汇总
profit_rolling AS (
    SELECT 
        p.company_id,
        p.report_date,
        c.company_code,
        p.basic_eps,
        p.diluted_eps,
        p.parent_netprofit,
        p.operate_income,
        -- 最近四个季度汇总（包含当前季度）
        SUM(p.basic_eps) OVER (
            PARTITION BY p.company_id 
            ORDER BY p.report_date 
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS basic_eps_ttm,
        SUM(p.diluted_eps) OVER (
            PARTITION BY p.company_id 
            ORDER BY p.report_date 
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS diluted_eps_ttm,
        SUM(p.parent_netprofit) OVER (
            PARTITION BY p.company_id 
            ORDER BY p.report_date 
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS parent_netprofit_ttm,
        SUM(p.operate_income) OVER (
            PARTITION BY p.company_id 
            ORDER BY p.report_date 
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS operate_income_ttm,
        -- 上年度四个季度汇总（往前推4-7个季度）
        SUM(p.parent_netprofit) OVER (
            PARTITION BY p.company_id 
            ORDER BY p.report_date 
            ROWS BETWEEN 7 PRECEDING AND 4 PRECEDING
        ) AS parent_netprofit_last_year,
        SUM(p.operate_income) OVER (
            PARTITION BY p.company_id 
            ORDER BY p.report_date 
            ROWS BETWEEN 7 PRECEDING AND 4 PRECEDING
        ) AS operate_income_last_year,
        -- 计算行号，用于判断是否有足够的历史数据
        ROW_NUMBER() OVER (
            PARTITION BY p.company_id 
            ORDER BY p.report_date
        ) AS row_num
    FROM quote__profit_sheet p
    INNER JOIN info__stock_company c ON p.company_id = c.id
),
-- 现金流量表单季度数据及滚动汇总
cashflow_rolling AS (
    SELECT 
        cf.company_id,
        cf.report_date,
        cf.netcash_operate,
        cf.netcash_invest,
        cf.netcash_finance,
        cf.rate_change_effect,
        -- 最近四个季度汇总
        SUM(cf.netcash_operate) OVER (
            PARTITION BY cf.company_id 
            ORDER BY cf.report_date 
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS netcash_operate_ttm,
        SUM(cf.netcash_invest) OVER (
            PARTITION BY cf.company_id 
            ORDER BY cf.report_date 
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS netcash_invest_ttm,
        SUM(cf.netcash_finance) OVER (
            PARTITION BY cf.company_id 
            ORDER BY cf.report_date 
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS netcash_finance_ttm,
        SUM(cf.rate_change_effect) OVER (
            PARTITION BY cf.company_id 
            ORDER BY cf.report_date 
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS rate_change_effect_ttm,
        -- 上年度四个季度汇总
        SUM(cf.netcash_operate) OVER (
            PARTITION BY cf.company_id 
            ORDER BY cf.report_date 
            ROWS BETWEEN 7 PRECEDING AND 4 PRECEDING
        ) AS netcash_operate_last_year,
        SUM(cf.netcash_invest) OVER (
            PARTITION BY cf.company_id 
            ORDER BY cf.report_date 
            ROWS BETWEEN 7 PRECEDING AND 4 PRECEDING
        ) AS netcash_invest_last_year,
        SUM(cf.netcash_finance) OVER (
            PARTITION BY cf.company_id 
            ORDER BY cf.report_date 
            ROWS BETWEEN 7 PRECEDING AND 4 PRECEDING
        ) AS netcash_finance_last_year,
        SUM(cf.rate_change_effect) OVER (
            PARTITION BY cf.company_id 
            ORDER BY cf.report_date 
            ROWS BETWEEN 7 PRECEDING AND 4 PRECEDING
        ) AS rate_change_effect_last_year
    FROM quote__cash_flow_sheet cf
)
-- 主查询：整合所有数据
SELECT 
    pr.company_code AS stock_code,
    pr.report_date,
    bs.total_parent_equity,
    pr.basic_eps_ttm,
    pr.diluted_eps_ttm,
    pr.parent_netprofit_ttm,
    pr.parent_netprofit_last_year,
    -- 加权平均股本 = 最近四个季度归母净利润 / 最近四个季度基本每股收益
    CASE 
        WHEN pr.basic_eps_ttm IS NOT NULL AND pr.basic_eps_ttm != 0 
        THEN pr.parent_netprofit_ttm / pr.basic_eps_ttm 
        ELSE NULL 
    END AS weighted_average_shares,
    pr.operate_income_ttm,
    pr.operate_income_last_year,
    cf.netcash_operate_ttm,
    cf.netcash_operate_last_year,
    cf.netcash_invest_ttm,
    cf.netcash_invest_last_year,
    cf.netcash_finance_ttm,
    cf.netcash_finance_last_year,
    cf.rate_change_effect_ttm,
    cf.rate_change_effect_last_year
FROM profit_rolling pr
LEFT JOIN quote__balance_sheet bs 
    ON pr.company_id = bs.company_id 
    AND pr.report_date = bs.report_date
LEFT JOIN cashflow_rolling cf 
    ON pr.company_id = cf.company_id 
    AND pr.report_date = cf.report_date
-- 只保留至少有4个季度历史数据的记录，以确保TTM数据完整性
WHERE pr.row_num >= 4
ORDER BY pr.company_code, pr.report_date DESC;
