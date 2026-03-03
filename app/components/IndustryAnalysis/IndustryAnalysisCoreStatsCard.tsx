'use client'

import { useMemo } from 'react'
import { evaluateFormula, parseFormula, formatNumber, tokenizeExpression } from '@/app/tools/formulaParser'
import Button from '@/app/widget/Button'
import type { info__core_statistic_template, info__core_data } from '@/types'

interface Props {
  template: info__core_statistic_template
  customName?: string | null
  coreData?: info__core_data
  onAddData?: () => void
}

export default function IndustryAnalysisCoreStatsCard({ 
  template, 
  customName,
  coreData,
  onAddData,
}: Props) {
  const displayName = customName || template.name

  // 解析公式
  const parsedFormula = useMemo(() => {
    return parseFormula(template.core_formula)
  }, [template.core_formula])

  // 计算结果
  const evaluationResult = useMemo(() => {
    if (!coreData) {
      return null
    }

    const data = coreData.data as Record<string, any>
    
    // 将数据转换为数字类型
    const numericData: Record<string, number> = {}
    for (const [key, value] of Object.entries(data)) {
      const num = Number(value)
      if (!isNaN(num)) {
        numericData[key] = num
      }
    }

    return evaluateFormula(template.core_formula, numericData)
  }, [template.core_formula, coreData])

  // 获取公式的有序 tokens
  const formulaTokens = useMemo(() => {
    return tokenizeExpression(parsedFormula.expression)
  }, [parsedFormula.expression])

  // 生成可显示的方格序列数据
  const gridSequence = useMemo(() => {
    if (!coreData) return []

    const data = coreData.data as Record<string, any>
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
      sequence.push({
        type: 'operator',
        label: '=',
        value: '=',
        isOperator: true,
      })
      sequence.push({
        type: 'variable',
        label: parsedFormula.resultName || '结果',
        value: formatNumber(evaluationResult.result, 4),
      })
    }

    return sequence
  }, [formulaTokens, coreData, evaluationResult, parsedFormula.resultName])

  // 显示状态
  const hasData = !!coreData
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
          {/* 方格序列 */}
          {gridSequence.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
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
                      <div className="flex items-center justify-center w-[80px] h-10 border-2 border-blue-400 rounded bg-blue-50 text-sm font-semibold text-blue-600">
                        {item.value}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* 日期信息 */}
          {coreData?.date && (
            <div className="text-xs text-gray-500">
              数据日期: {new Date(coreData.date).toLocaleDateString('zh-CN')}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-3">
          <div className="text-2xl font-bold text-gray-400">-</div>
          <div className="text-xs text-gray-500 mt-1">
            {hasData ? '计算失败' : '暂无数据'}
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
