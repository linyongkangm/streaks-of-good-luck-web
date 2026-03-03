'use client'

import { useMemo } from 'react'
import { evaluateFormula, parseFormula, formatNumber, tokenizeExpression } from '@/app/tools/formulaParser'
import Button from '@/app/widget/Button'
import Table from '@/app/widget/Table'
import type { info__core_statistic_template, info__core_data } from '@/types'

interface Props {
  template: info__core_statistic_template
  customName?: string | null
  coreDataList?: info__core_data[]
  onAddData?: () => void
}

export default function IndustryAnalysisCoreStatsCard({
  template,
  customName,
  coreDataList = [],
  onAddData,
}: Props) {
  const displayName = customName || template.name

  // 获取当季度日期范围
  const getCurrentQuarter = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const quarter = Math.floor(month / 3) + 1
    const endMonths = [3, 6, 9, 12]
    const endMonth = endMonths[quarter - 1]
    return new Date(year, endMonth - 1, 1) // 季末日期（用于比较）
  }

  // 分类数据
  const { currentQuarterData, pastData, futureData } = useMemo(() => {
    if (!coreDataList || coreDataList.length === 0) {
      return { currentQuarterData: null, pastData: [], futureData: [] }
    }

    const sortedData = [...coreDataList].sort((a, b) => {
      const dateA = new Date(a.date || 0)
      const dateB = new Date(b.date || 0)
      return dateB.getTime() - dateA.getTime() // 降序
    })

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentQtr = Math.floor(now.getMonth() / 3)
    const quarterEndDates = [
      new Date(currentYear, 2, 31), // Q1: 3月31日
      new Date(currentYear, 5, 30), // Q2: 6月30日
      new Date(currentYear, 8, 30), // Q3: 9月30日
      new Date(currentYear, 11, 31), // Q4: 12月31日
    ]
    const currentQuarterEnd = quarterEndDates[currentQtr]

    let current: info__core_data | null = null
    const past: info__core_data[] = []
    const future: info__core_data[] = []

    for (const item of sortedData) {
      const itemDate = new Date(item.date || 0)
      const itemYear = itemDate.getFullYear()
      const itemMonth = itemDate.getMonth()
      const itemQtr = Math.floor(itemMonth / 3)

      // 判断是否属于当季度
      if (itemYear === currentYear && itemQtr === currentQtr) {
        if (!current) {
          current = item
        } else {
          past.push(item)
        }
      } else if (itemDate < currentQuarterEnd) {
        past.push(item)
      } else {
        future.push(item)
      }
    }

    return { currentQuarterData: current, pastData: past, futureData: future }
  }, [coreDataList])

  // 解析公式
  const parsedFormula = useMemo(() => {
    return parseFormula(template.core_formula)
  }, [template.core_formula])

  // 计算结果（基于当季数据）
  const evaluationResult = useMemo(() => {
    if (!currentQuarterData) {
      return null
    }

    const data = currentQuarterData.data as Record<string, any>

    // 将数据转换为数字类型
    const numericData: Record<string, number> = {}
    for (const [key, value] of Object.entries(data)) {
      const num = Number(value)
      if (!isNaN(num)) {
        numericData[key] = num
      }
    }

    return evaluateFormula(template.core_formula, numericData)
  }, [template.core_formula, currentQuarterData])

  // 获取公式的有序 tokens
  const formulaTokens = useMemo(() => {
    return tokenizeExpression(parsedFormula.expression)
  }, [parsedFormula.expression])

  // 生成可显示的方格序列数据
  const gridSequence = useMemo(() => {
    if (!currentQuarterData) return []

    const data = currentQuarterData.data as Record<string, any>
    const numericData: Record<string, number> = {}
    for (const [key, value] of Object.entries(data)) {
      const num = Number(value)
      if (!isNaN(num)) {
        numericData[key] = num
      }
    }

    const sequence: Array<{
      type: 'variable' | 'operator' | 'bracket' | 'number'
      label: string
      value: string | number
      isOperator?: boolean
    }> = []

    // 添加表达式中的 tokens
    for (const token of formulaTokens) {
      if (token.type === 'variable') {
        const value = numericData[token.value]
        sequence.push({
          type: 'variable',
          label: token.value,
          value: value !== undefined ? formatNumber(value, 4) : '?',
        })
      } else if (token.type === 'operator') {
        sequence.push({
          type: 'operator',
          label: token.value,
          value: token.value,
          isOperator: true,
        })
      } else if (token.type === 'bracket') {
        sequence.push({
          type: 'bracket',
          label: token.value,
          value: token.value,
          isOperator: true,
        })
      } else if (token.type === 'number') {
        sequence.push({
          type: 'number',
          label: token.value,
          value: token.value,
        })
      }
    }

    // 添加等号和最终结果
    if (evaluationResult?.success && evaluationResult.result !== undefined) {
      sequence.unshift({
        type: 'operator',
        label: '=',
        value: '=',
        isOperator: true,
      })
      sequence.unshift({
        type: 'variable',
        label: parsedFormula.resultName || '结果',
        value: formatNumber(evaluationResult.result, 4),
      })
    }

    return sequence
  }, [formulaTokens, currentQuarterData, evaluationResult, parsedFormula.resultName])

  // 显示状态
  const hasData = !!currentQuarterData
  const hasResult = evaluationResult?.success && evaluationResult.result !== undefined

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      {/* 标题 */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-base font-medium text-gray-900">{displayName}</h4>
        {hasData && (
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
            已录入
          </span>
        )}
      </div>

      {/* 结果显示 */}
      {hasResult ? (
        <div className="mb-3">
          {/* 未来数据表格 */}
          {futureData.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-medium text-gray-600 mb-2">未来数据</div>
              <Table
                columns={[
                  { title: '日期', dataIndex: 'date', key: 'date', width: '100px', render: (value: any) => new Date(value).toLocaleDateString('zh-CN') },
                  {
                    title: '结果', dataIndex: 'data', key: 'result', width: '80px', render: (value: any, row: info__core_data) => {
                      const data = row.data as Record<string, any>
                      const numericData: Record<string, number> = {}
                      for (const [k, v] of Object.entries(data)) {
                        const num = Number(v)
                        if (!isNaN(num)) numericData[k] = num
                      }
                      const result = evaluateFormula(template.core_formula, numericData)
                      return result.success ? formatNumber(result.result!, 4) : '-'
                    }
                  },
                  ...parsedFormula.variables.map(variable => ({
                    title: variable,
                    dataIndex: `var_${variable}`,

                    width: '80px',
                    render: (value: any, row: any) => {
                      const data = row.data as Record<string, any>
                      const val = data[variable]
                      return val !== undefined ? formatNumber(Number(val), 4) : '-'
                    },
                  })),

                ]}
                dataSource={futureData}
              />
            </div>
          )}

          {/* 方格序列 */}
          {gridSequence.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex flex-wrap gap-2 items-end">
                <div className="mb-2 text-xs text-gray-500">{currentQuarterData?.date ? new Date(currentQuarterData.date).toLocaleDateString('zh-CN') : '-'}</div>
                {gridSequence.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    {item.isOperator ? (
                      // 运算符和等号
                      <div className="flex items-center justify-center w-10 h-10 border-2 border-gray-400 rounded text-sm font-medium text-gray-700">
                        {item.value}
                      </div>
                    ) : (
                      // 变量或数字
                      <div className="flex flex-col items-center">
                        <div className="text-xs text-gray-600 font-medium text-center max-w-[80px] line-clamp-2">
                          {item.label}
                        </div>
                        <div className="flex items-center justify-center w-[80px] h-10 border-2 border-blue-400 rounded bg-white text-sm font-semibold text-blue-600">
                          {item.value}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* 过去数据表格 */}
          {pastData.length > 0 && (
            <div className="mt-4">
              <Table
                columns={[
                  { title: '日期', dataIndex: 'date', key: 'date', width: '100px', render: (value: any) => new Date(value).toLocaleDateString('zh-CN') },
                  {
                    title: '结果', dataIndex: 'data', key: 'result', width: '80px', render: (value: any, row: info__core_data) => {
                      const data = row.data as Record<string, any>
                      const numericData: Record<string, number> = {}
                      for (const [k, v] of Object.entries(data)) {
                        const num = Number(v)
                        if (!isNaN(num)) numericData[k] = num
                      }
                      const result = evaluateFormula(template.core_formula, numericData)
                      return result.success ? formatNumber(result.result!, 4) : '-'
                    }
                  },
                  ...parsedFormula.variables.map(variable => ({
                    title: variable,
                    dataIndex: `var_${variable}`,
                    width: '80px',
                    render: (value: any, row: any) => {
                      const data = row.data as Record<string, any>
                      const val = data[variable]
                      return val !== undefined ? formatNumber(Number(val), 4) : '-'
                    },
                  })),

                ]}
                dataSource={pastData}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="mb-3">
          <div className="text-2xl font-bold text-gray-400">-</div>
          <div className="text-xs text-gray-500 mt-1">
            {coreDataList.length > 0 ? '计算失败' : '暂无数据'}
          </div>
        </div>
      )}

      {/* 公式显示 */}
      {/* <div className="border-t border-gray-100 pt-3">
        <div className="text-xs text-gray-500 mb-2">计算公式：</div>
        <div className="text-xs text-gray-700 font-mono bg-gray-50 p-2 rounded break-words">
          {template.core_formula}
        </div>
      </div> */}

      {/* 错误提示 */}
      {evaluationResult && !evaluationResult.success && (
        <div className="mt-2 text-xs text-red-600">
          {evaluationResult.error}
          {evaluationResult.missingVariables && evaluationResult.missingVariables.length > 0 && (
            <div className="mt-1">
              缺失变量: {evaluationResult.missingVariables.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* 数据表类型 */}
      {/* <div className="mt-2 text-xs text-gray-400">
        数据表: {template.relate_table}
      </div> */}

      {/* 描述 */}
      {template.description && (
        <div className="mt-2 text-xs text-gray-600 border-t border-gray-100 pt-2">
          {template.description}
        </div>
      )}

      {onAddData && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
          <Button look="secondary" size="tiny" onClick={onAddData}>
            + 增加数据
          </Button>
        </div>
      )}
    </div>
  )
}
