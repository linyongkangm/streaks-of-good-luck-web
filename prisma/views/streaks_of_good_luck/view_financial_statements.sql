WITH `profit_rolling` AS (
  SELECT
    `p`.`company_id` AS `company_id`,
    `p`.`report_date` AS `report_date`,
    `c`.`company_code` AS `company_code`,
    year(`p`.`report_date`) AS `current_year`,
    `p`.`basic_eps` AS `basic_eps`,
    `p`.`diluted_eps` AS `diluted_eps`,
    `p`.`parent_netprofit` AS `parent_netprofit`,
    `p`.`operate_income` AS `operate_income`,
    sum(`p`.`basic_eps`) OVER (
      PARTITION BY `p`.`company_id`
      ORDER BY
        `p`.`report_date` ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ) AS `basic_eps_ttm`,
    sum(`p`.`diluted_eps`) OVER (
      PARTITION BY `p`.`company_id`
      ORDER BY
        `p`.`report_date` ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ) AS `diluted_eps_ttm`,
    sum(`p`.`parent_netprofit`) OVER (
      PARTITION BY `p`.`company_id`
      ORDER BY
        `p`.`report_date` ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ) AS `parent_netprofit_ttm`,
    sum(`p`.`operate_income`) OVER (
      PARTITION BY `p`.`company_id`
      ORDER BY
        `p`.`report_date` ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ) AS `operate_income_ttm`,
(
      SELECT
        sum(`p2`.`parent_netprofit`)
      FROM
        `streaks_of_good_luck`.`quote__profit_sheet` `p2`
      WHERE
        (
          (`p2`.`company_id` = `p`.`company_id`)
          AND (
            year(`p2`.`report_date`) = (year(`p`.`report_date`) - 1)
          )
        )
    ) AS `parent_netprofit_last_year`,
(
      SELECT
        sum(`p2`.`operate_income`)
      FROM
        `streaks_of_good_luck`.`quote__profit_sheet` `p2`
      WHERE
        (
          (`p2`.`company_id` = `p`.`company_id`)
          AND (
            year(`p2`.`report_date`) = (year(`p`.`report_date`) - 1)
          )
        )
    ) AS `operate_income_last_year`,
    row_number() OVER (
      PARTITION BY `p`.`company_id`
      ORDER BY
        `p`.`report_date`
    ) AS `row_num`
  FROM
    (
      `streaks_of_good_luck`.`quote__profit_sheet` `p`
      JOIN `streaks_of_good_luck`.`info__stock_company` `c` ON((`p`.`company_id` = `c`.`id`))
    )
),
`cashflow_rolling` AS (
  SELECT
    `cf`.`company_id` AS `company_id`,
    `cf`.`report_date` AS `report_date`,
    `cf`.`netcash_operate` AS `netcash_operate`,
    `cf`.`netcash_invest` AS `netcash_invest`,
    `cf`.`netcash_finance` AS `netcash_finance`,
    `cf`.`rate_change_effect` AS `rate_change_effect`,
    sum(`cf`.`netcash_operate`) OVER (
      PARTITION BY `cf`.`company_id`
      ORDER BY
        `cf`.`report_date` ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ) AS `netcash_operate_ttm`,
    sum(`cf`.`netcash_invest`) OVER (
      PARTITION BY `cf`.`company_id`
      ORDER BY
        `cf`.`report_date` ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ) AS `netcash_invest_ttm`,
    sum(`cf`.`netcash_finance`) OVER (
      PARTITION BY `cf`.`company_id`
      ORDER BY
        `cf`.`report_date` ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ) AS `netcash_finance_ttm`,
    sum(`cf`.`rate_change_effect`) OVER (
      PARTITION BY `cf`.`company_id`
      ORDER BY
        `cf`.`report_date` ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ) AS `rate_change_effect_ttm`,
(
      SELECT
        sum(`cf2`.`netcash_operate`)
      FROM
        `streaks_of_good_luck`.`quote__cash_flow_sheet` `cf2`
      WHERE
        (
          (`cf2`.`company_id` = `cf`.`company_id`)
          AND (
            year(`cf2`.`report_date`) = (year(`cf`.`report_date`) - 1)
          )
        )
    ) AS `netcash_operate_last_year`,
(
      SELECT
        sum(`cf2`.`netcash_invest`)
      FROM
        `streaks_of_good_luck`.`quote__cash_flow_sheet` `cf2`
      WHERE
        (
          (`cf2`.`company_id` = `cf`.`company_id`)
          AND (
            year(`cf2`.`report_date`) = (year(`cf`.`report_date`) - 1)
          )
        )
    ) AS `netcash_invest_last_year`,
(
      SELECT
        sum(`cf2`.`netcash_finance`)
      FROM
        `streaks_of_good_luck`.`quote__cash_flow_sheet` `cf2`
      WHERE
        (
          (`cf2`.`company_id` = `cf`.`company_id`)
          AND (
            year(`cf2`.`report_date`) = (year(`cf`.`report_date`) - 1)
          )
        )
    ) AS `netcash_finance_last_year`,
(
      SELECT
        sum(`cf2`.`rate_change_effect`)
      FROM
        `streaks_of_good_luck`.`quote__cash_flow_sheet` `cf2`
      WHERE
        (
          (`cf2`.`company_id` = `cf`.`company_id`)
          AND (
            year(`cf2`.`report_date`) = (year(`cf`.`report_date`) - 1)
          )
        )
    ) AS `rate_change_effect_last_year`
  FROM
    `streaks_of_good_luck`.`quote__cash_flow_sheet` `cf`
)
SELECT
  `pr`.`company_code` AS `stock_code`,
  `pr`.`report_date` AS `report_date`,
  `bs`.`total_parent_equity` AS `total_parent_equity`,
  `pr`.`basic_eps_ttm` AS `basic_eps_ttm`,
  `pr`.`diluted_eps_ttm` AS `diluted_eps_ttm`,
  `pr`.`parent_netprofit_ttm` AS `parent_netprofit_ttm`,
  `pr`.`parent_netprofit_last_year` AS `parent_netprofit_last_year`,
(
    CASE
      WHEN (
        (`pr`.`basic_eps_ttm` IS NOT NULL)
        AND (`pr`.`basic_eps_ttm` <> 0)
      ) THEN (
        `pr`.`parent_netprofit_ttm` / `pr`.`basic_eps_ttm`
      )
      ELSE NULL
    END
  ) AS `weighted_average_shares`,
  `pr`.`operate_income_ttm` AS `operate_income_ttm`,
  `pr`.`operate_income_last_year` AS `operate_income_last_year`,
  `cf`.`netcash_operate_ttm` AS `netcash_operate_ttm`,
  `cf`.`netcash_operate_last_year` AS `netcash_operate_last_year`,
  `cf`.`netcash_invest_ttm` AS `netcash_invest_ttm`,
  `cf`.`netcash_invest_last_year` AS `netcash_invest_last_year`,
  `cf`.`netcash_finance_ttm` AS `netcash_finance_ttm`,
  `cf`.`netcash_finance_last_year` AS `netcash_finance_last_year`,
  `cf`.`rate_change_effect_ttm` AS `rate_change_effect_ttm`,
  `cf`.`rate_change_effect_last_year` AS `rate_change_effect_last_year`
FROM
  (
    (
      `profit_rolling` `pr`
      LEFT JOIN `streaks_of_good_luck`.`quote__balance_sheet` `bs` ON(
        (
          (`pr`.`company_id` = `bs`.`company_id`)
          AND (`pr`.`report_date` = `bs`.`report_date`)
        )
      )
    )
    LEFT JOIN `cashflow_rolling` `cf` ON(
      (
        (`pr`.`company_id` = `cf`.`company_id`)
        AND (`pr`.`report_date` = `cf`.`report_date`)
      )
    )
  )
WHERE
  (`pr`.`row_num` >= 4)
ORDER BY
  `pr`.`company_code`,
  `pr`.`report_date` DESC