'use client'

import { useMemo } from 'react'
import { evaluateFormula, parseFormula, formatNumber } from '@/app/tools/formulaParser'
import type { info__core_statistic_template, info__core_data } from '@/types'

interface Props {
  template: info__core_statistic_template
  customName?: string | null
  coreData?: info__core_data
}

export default function IndustryAnalysisCoreStatsCard({ 
  template, 
  customName,
  coreData 
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
          <div className="text-2xl font-bold text-blue-600">
            {formatNumber(evaluationResult.result!)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {parsedFormula.resultName || '计算结果'}
          </div>
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
      <div className="border-t border-gray-100 pt-3">
        <div className="text-xs text-gray-500 mb-2">计算公式：</div>
        <div className="text-xs text-gray-700 font-mono bg-gray-50 p-2 rounded break-words">
          {template.core_formula}
        </div>
      </div>

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
      <div className="mt-2 text-xs text-gray-400">
        数据表: {template.relate_table}
      </div>

      {/* 描述 */}
      {template.description && (
        <div className="mt-2 text-xs text-gray-600 border-t border-gray-100 pt-2">
          {template.description}
        </div>
      )}
    </div>
  )
}
