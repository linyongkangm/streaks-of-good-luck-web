'use client'

import { useMemo, useState, useEffect } from 'react'
import { evaluateFormula, parseFormula, formatNumber, tokenizeExpression } from '@/app/tools/formulaParser'
import Button from '@/app/widget/Button'
import type { info__core_statistic_template, info__core_data } from '@/types'
import { toLuxon } from '@/app/tools'

interface Props {
  template: info__core_statistic_template
  customName?: string | null
  coreDataList?: info__core_data[]
  industryId: number
  onAddData?: (dataItem?: info__core_data) => void
  onUnlink?: () => void
}

export default function IndustryAnalysisCoreStatsCard({
  template,
  customName,
  coreDataList = [],
  industryId,
  onAddData,
  onUnlink,
}: Props) {
  const displayName = customName || template.name

  // 选中的数据索引
  const [selectedDataIndex, setSelectedDataIndex] = useState<number | null>(null)
  const [unlinking, setUnlinking] = useState(false)
  const [hoveredDataIndex, setHoveredDataIndex] = useState<number | null>(null)



  // 按日期降序排列所有数据
  const sortedData = useMemo(() => {
    if (!coreDataList || coreDataList.length === 0) return []
    return [...coreDataList].sort((a, b) => {
      const dateA = new Date(a.date || 0)
      const dateB = new Date(b.date || 0)
      return dateB.getTime() - dateA.getTime() // 降序
    })
  }, [coreDataList])

  // 默认选中当前季度
  useEffect(() => {
    if (sortedData.length === 0) {
      setSelectedDataIndex(null)
      return
    }

    const now = toLuxon(new Date())
    const currentQuarterKey = now.year * 4 + now.quarter

    let exactIndex = -1
    let nearestPastIndex = -1
    let nearestPastDiff = Number.POSITIVE_INFINITY
    let nearestFutureIndex = -1
    let nearestFutureDiff = Number.POSITIVE_INFINITY

    for (let index = 0; index < sortedData.length; index++) {
      const item = sortedData[index]
      if (!item.date) continue

      const itemDate = toLuxon(item.date)
      if (!itemDate.isValid) continue

      const itemQuarterKey = itemDate.year * 4 + itemDate.quarter
      const diff = itemQuarterKey - currentQuarterKey

      if (diff === 0) {
        exactIndex = index
        break
      }

      if (diff < 0) {
        const pastDiff = Math.abs(diff)
        if (pastDiff < nearestPastDiff) {
          nearestPastDiff = pastDiff
          nearestPastIndex = index
        }
      } else {
        if (diff < nearestFutureDiff) {
          nearestFutureDiff = diff
          nearestFutureIndex = index
        }
      }
    }

    if (exactIndex !== -1) {
      setSelectedDataIndex(exactIndex)
      return
    }

    if (nearestPastIndex !== -1) {
      setSelectedDataIndex(nearestPastIndex)
      return
    }

    if (nearestFutureIndex !== -1) {
      setSelectedDataIndex(nearestFutureIndex)
      return
    }

    setSelectedDataIndex(0)
  }, [sortedData])

  // 解析公式
  const parsedFormula = useMemo(() => {
    return parseFormula(template.core_formula)
  }, [template.core_formula])

  // 选中的数据
  const selectedData = useMemo(() => {
    if (selectedDataIndex === null || !sortedData[selectedDataIndex]) {
      return null
    }
    return sortedData[selectedDataIndex]
  }, [selectedDataIndex, sortedData])

  // 计算结果（基于选中的数据）
  const evaluationResult = useMemo(() => {
    if (!selectedData) {
      return null
    }

    const data = selectedData.data as Record<string, any>

    // 将数据转换为数字类型，未定义的值默认为0
    const numericData: Record<string, number> = {}

    // 获取公式中所有变量
    const formulaVariables = parsedFormula.variables

    // 为每个变量设置值，未定义的默认为0
    for (const variable of formulaVariables) {
      const value = data[variable]
      if (value !== undefined && value !== null) {
        const num = Number(value)
        numericData[variable] = !isNaN(num) ? num : 0
      } else {
        // undefined或null值默认为0
        numericData[variable] = 0
      }
    }

    return evaluateFormula(template.core_formula, numericData)
  }, [template.core_formula, selectedData, parsedFormula.variables])

  // 获取公式的有序 tokens
  const formulaTokens = useMemo(() => {
    return tokenizeExpression(parsedFormula.expression)
  }, [parsedFormula.expression])

  // 生成可显示的方格序列数据（基于选中的数据）
  const gridSequence = useMemo(() => {
    if (!selectedData) return []

    const data = selectedData.data as Record<string, any>
    const numericData: Record<string, number> = {}

    // 获取公式中所有变量
    const formulaVariables = parsedFormula.variables

    // 为每个变量设置值，未定义的默认为0
    for (const variable of formulaVariables) {
      const value = data[variable]
      if (value !== undefined && value !== null) {
        const num = Number(value)
        numericData[variable] = !isNaN(num) ? num : 0
      } else {
        // undefined或null值默认为0
        numericData[variable] = 0
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
          value: value !== undefined ? formatNumber(value, 2) : '0',
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
        value: formatNumber(evaluationResult.result, 2),
      })
    }

    return sequence
  }, [formulaTokens, selectedData, evaluationResult, parsedFormula.resultName, parsedFormula.variables])

  // 显示状态
  const hasData = sortedData.length > 0
  const hasResult = evaluationResult?.success && evaluationResult.result !== undefined

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      {/* 标题 */}
      <div className="flex items-center mb-4">
        <h4 className="text-base font-medium text-gray-900">{displayName}</h4>
        {onAddData && (
          <div className="flex items-center gap-2 ml-3 border-t border-gray-100 ">
            <Button look="secondary" size="tiny" onClick={() => onAddData()}>
              + 增加数据
            </Button>
          </div>
        )}
      </div>

      {/* 数据列表 */}
      {hasData ? (
        <div className="mb-3 space-y-2">
          {sortedData.map((dataItem, index) => {
            const isSelected = index === selectedDataIndex
            const data = dataItem.data as Record<string, any>
            const numericData: Record<string, number> = {}
            for (const [k, v] of Object.entries(data)) {
              const num = Number(v)
              if (!isNaN(num)) numericData[k] = num
            }
            const result = evaluateFormula(template.core_formula, numericData)

            if (isSelected) {
              // 方格序列渲染（选中项）
              return (
                <div
                  key={index}
                  className="flex flex-wrap items-center justify-between py-3 bg-blue-50 rounded-lg border-2 border-blue-300"
                  onMouseEnter={() => setHoveredDataIndex(index)}
                  onMouseLeave={() => setHoveredDataIndex(null)}
                >
                  <div className="flex flex-wrap items-end gap-1">
                    <div className="flex items-center justify-center h-10 text-gray-500 w-[100px]">
                      <span>{dataItem.date ? toLuxon(dataItem.date).toFormat('yyyy-Qq') : '-'}</span>
                    </div>
                    {gridSequence.map((item, idx) => (
                      item.isOperator ? (
                        // 运算符和等号
                        <div key={idx} className="flex items-center justify-center w-10 h-10 border-2 border-gray-400 rounded text-sm font-medium text-gray-700">
                          {item.value}
                        </div>
                      ) : (
                        // 变量或数字
                        <div key={idx} className="flex flex-col items-center w-[80px]">
                          <div className="text-xs text-gray-600 font-medium text-center max-w-[80px] line-clamp-2">
                            {item.label}
                          </div>
                          <div className="flex items-center justify-center w-[80px] h-10 border-2 border-blue-400 rounded bg-white text-sm font-semibold text-blue-600">
                            {item.value}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                  {hoveredDataIndex === index && onAddData && (
                    <Button
                      look="secondary"
                      size="tiny"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddData(dataItem)
                      }}
                      className="mr-1 flex-shrink-0"
                    >
                      修改
                    </Button>
                  )}
                </div>
              )
            } else {
              // 平铺渲染（非选中项）
              return (
                <div
                  key={index}
                  className="flex flex-wrap items-center justify-between px-1 py-1 cursor-pointer hover:bg-gray-50 rounded transition-colors"
                  onClick={() => setSelectedDataIndex(index)}
                  onMouseEnter={() => setHoveredDataIndex(index)}
                  onMouseLeave={() => setHoveredDataIndex(null)}
                >
                  <div className="flex flex-wrap items-center flex-1">
                    {/* 日期 */}
                    <div className="flex items-center justify-center h-8 w-[100px] text-xs text-gray-700">
                      <span>{dataItem.date ? toLuxon(dataItem.date).toFormat('yyyy-Qq') : '-'}</span>
                    </div>

                    {/* 结果 */}
                    <div className="flex items-center justify-center h-8 w-[80px] text-xs text-gray-700 font-medium">
                      {result.success ? formatNumber(result.result!) : '-'}
                    </div>

                    {/* 变量值 */}
                    {parsedFormula.variables.map((variable, varIdx) => {
                      const val = data[variable]
                      return (
                        <div key={varIdx} className="ml-12 flex items-center justify-center h-8 w-[80px] text-xs text-gray-600">
                          {val !== undefined ? formatNumber(Number(val)) : '-'}
                        </div>
                      )
                    })}
                  </div>

                  {/* 修改按钮（hover时显示）*/}
                  {hoveredDataIndex === index && onAddData && (
                    <Button
                      look="secondary"
                      size="tiny"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddData(dataItem)
                      }}
                      className="mr-1 flex-shrink-0"
                    >
                      修改
                    </Button>
                  )}
                </div>
              )
            }
          })}
        </div>
      ) : (
        <div className="mb-3">
          <div className="text-2xl font-bold text-gray-400">-</div>
          <div className="text-xs text-gray-500 mt-1">暂无数据</div>
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


    </div>
  )
}
