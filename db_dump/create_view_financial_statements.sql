-- 创建财务报表综合视图（修正版）
-- 该视图整合资产负债表（报告期累计）、利润表（单季度）、现金流量表（单季度）
-- 每个报告期包含最近四个季度和上年度四个季度的汇总数据
-- 修正：上年度数据使用年份匹配，而非行偏移，避免数据不完整时的计算错误

DROP VIEW IF EXISTS view_financial_statements;

CREATE VIEW view_financial_statements AS
WITH
-- 利润表单季度数据及滚动汇总
profit_rolling AS (
    SELECT
        p.company_id,
        p.report_date,
        c.company_code,
        c.total_shares,
        YEAR(p.report_date) AS current_year,
        p.total_operate_income,
        p.operate_income,
        p.total_operate_cost,
        p.operate_cost,
        p.netprofit,
        p.parent_netprofit,
        -- 最近四个季度汇总（包含当前季度）
        SUM(p.total_operate_income) OVER (
            PARTITION BY p.company_id
            ORDER BY p.report_date
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS total_operate_income_ttm,
        SUM(p.operate_income) OVER (
            PARTITION BY p.company_id
            ORDER BY p.report_date
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS operate_income_ttm,
        SUM(p.total_operate_cost) OVER (
            PARTITION BY p.company_id
            ORDER BY p.report_date
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS total_operate_cost_ttm,
        SUM(p.operate_cost) OVER (
            PARTITION BY p.company_id
            ORDER BY p.report_date
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS operate_cost_ttm,
        SUM(p.netprofit) OVER (
            PARTITION BY p.company_id
            ORDER BY p.report_date
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS netprofit_ttm,
        SUM(p.parent_netprofit) OVER (
            PARTITION BY p.company_id
            ORDER BY p.report_date
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS parent_netprofit_ttm,
        -- 上年度四个季度汇总（基于年份匹配，而非行偏移）
        (
            SELECT SUM(p2.parent_netprofit)
            FROM quote__profit_sheet p2
            WHERE p2.company_id = p.company_id
              AND YEAR(p2.report_date) = YEAR(p.report_date) - 1
        ) AS parent_netprofit_last_year,
        (
            SELECT SUM(p2.operate_income)
            FROM quote__profit_sheet p2
            WHERE p2.company_id = p.company_id
              AND YEAR(p2.report_date) = YEAR(p.report_date) - 1
        ) AS operate_income_last_year,
        (
            SELECT SUM(p2.total_operate_income)
            FROM quote__profit_sheet p2
            WHERE p2.company_id = p.company_id
              AND YEAR(p2.report_date) = YEAR(p.report_date) - 1
        ) AS total_operate_income_last_year,
        (
            SELECT SUM(p2.total_operate_cost)
            FROM quote__profit_sheet p2
            WHERE p2.company_id = p.company_id
              AND YEAR(p2.report_date) = YEAR(p.report_date) - 1
        ) AS total_operate_cost_last_year,
        (
            SELECT SUM(p2.operate_cost)
            FROM quote__profit_sheet p2
            WHERE p2.company_id = p.company_id
              AND YEAR(p2.report_date) = YEAR(p.report_date) - 1
        ) AS operate_cost_last_year,
        (
            SELECT SUM(p2.netprofit)
            FROM quote__profit_sheet p2
            WHERE p2.company_id = p.company_id
              AND YEAR(p2.report_date) = YEAR(p.report_date) - 1
        ) AS netprofit_last_year,
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
        cf.capex,
        -- 最近四个季度汇总
        SUM(cf.netcash_operate - cf.capex) OVER (
            PARTITION BY cf.company_id
            ORDER BY cf.report_date
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS free_cash_flow_ttm,
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
        -- 上年度四个季度汇总（基于年份匹配）
        (
            SELECT SUM(cf2.netcash_operate)
            FROM quote__cash_flow_sheet cf2
            WHERE cf2.company_id = cf.company_id
              AND YEAR(cf2.report_date) = YEAR(cf.report_date) - 1
        ) AS netcash_operate_last_year,
        (
            SELECT SUM(cf2.netcash_invest)
            FROM quote__cash_flow_sheet cf2
            WHERE cf2.company_id = cf.company_id
              AND YEAR(cf2.report_date) = YEAR(cf.report_date) - 1
        ) AS netcash_invest_last_year,
        (
            SELECT SUM(cf2.netcash_finance)
            FROM quote__cash_flow_sheet cf2
            WHERE cf2.company_id = cf.company_id
              AND YEAR(cf2.report_date) = YEAR(cf.report_date) - 1
        ) AS netcash_finance_last_year,
        (
            SELECT SUM(cf2.rate_change_effect)
            FROM quote__cash_flow_sheet cf2
            WHERE cf2.company_id = cf.company_id
              AND YEAR(cf2.report_date) = YEAR(cf.report_date) - 1
        ) AS rate_change_effect_last_year,
        (
            SELECT SUM(cf2.netcash_operate - cf2.capex)
            FROM quote__cash_flow_sheet cf2
            WHERE cf2.company_id = cf.company_id
              AND YEAR(cf2.report_date) = YEAR(cf.report_date) - 1
        ) AS free_cash_flow_last_year
    FROM quote__cash_flow_sheet cf
),
-- 资产负债表数据及滚动汇总（采用4季度均值口径）
balance_rolling AS (
    SELECT
        bs.company_id,
        bs.report_date,
        bs.total_parent_equity,
        bs.total_assets,
        bs.contract_liab,
        bs.note_accounts_payable,
        bs.prepayment,
        bs.note_accounts_rece,
        AVG(bs.contract_liab) OVER (
            PARTITION BY bs.company_id
            ORDER BY bs.report_date
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS contract_liab_ttm,
        AVG(bs.note_accounts_payable) OVER (
            PARTITION BY bs.company_id
            ORDER BY bs.report_date
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS note_accounts_payable_ttm,
        AVG(bs.prepayment) OVER (
            PARTITION BY bs.company_id
            ORDER BY bs.report_date
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS prepayment_ttm,
        AVG(bs.note_accounts_rece) OVER (
            PARTITION BY bs.company_id
            ORDER BY bs.report_date
            ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS note_accounts_rece_ttm,
        (
            SELECT AVG(bs2.contract_liab)
            FROM quote__balance_sheet bs2
            WHERE bs2.company_id = bs.company_id
              AND YEAR(bs2.report_date) = YEAR(bs.report_date) - 1
        ) AS contract_liab_last_year,
        (
            SELECT AVG(bs2.note_accounts_payable)
            FROM quote__balance_sheet bs2
            WHERE bs2.company_id = bs.company_id
              AND YEAR(bs2.report_date) = YEAR(bs.report_date) - 1
        ) AS note_accounts_payable_last_year,
        (
            SELECT AVG(bs2.prepayment)
            FROM quote__balance_sheet bs2
            WHERE bs2.company_id = bs.company_id
              AND YEAR(bs2.report_date) = YEAR(bs.report_date) - 1
        ) AS prepayment_last_year,
        (
            SELECT AVG(bs2.note_accounts_rece)
            FROM quote__balance_sheet bs2
            WHERE bs2.company_id = bs.company_id
              AND YEAR(bs2.report_date) = YEAR(bs.report_date) - 1
        ) AS note_accounts_rece_last_year
    FROM quote__balance_sheet bs
)
-- 主查询：整合所有数据
SELECT
    pr.company_id AS company_id,
    pr.report_date,
    pr.total_shares,
    br.total_parent_equity,
    br.total_assets AS total_assets,
    pr.total_operate_income_ttm,
    pr.total_operate_income_last_year,
    pr.operate_income_ttm,
    pr.operate_income_last_year,
    pr.total_operate_cost_ttm,
    pr.total_operate_cost_last_year,
    pr.operate_cost_ttm,
    pr.operate_cost_last_year,
    pr.netprofit_ttm,
    pr.netprofit_last_year,
    pr.parent_netprofit_ttm,
    pr.parent_netprofit_last_year,
    cf.netcash_operate_ttm,
    cf.netcash_operate_last_year,
    cf.netcash_invest_ttm,
    cf.netcash_invest_last_year,
    cf.netcash_finance_ttm,
    cf.netcash_finance_last_year,
    cf.rate_change_effect_ttm,
    cf.rate_change_effect_last_year,
    cf.free_cash_flow_ttm,
    cf.free_cash_flow_last_year,
    br.contract_liab_ttm,
    br.contract_liab_last_year,
    br.note_accounts_payable_ttm,
    br.note_accounts_payable_last_year,
    br.prepayment_ttm,
    br.prepayment_last_year,
    br.note_accounts_rece_ttm,
    br.note_accounts_rece_last_year
FROM profit_rolling pr
LEFT JOIN balance_rolling br
    ON pr.company_id = br.company_id
    AND pr.report_date = br.report_date
LEFT JOIN cashflow_rolling cf
    ON pr.company_id = cf.company_id
    AND pr.report_date = cf.report_date
-- 只保留至少有4个季度历史数据的记录，以确保TTM数据完整性
WHERE pr.row_num >= 4
ORDER BY pr.company_code, pr.report_date DESC;
