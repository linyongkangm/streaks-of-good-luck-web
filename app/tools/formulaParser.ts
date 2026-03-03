import type { ParsedFormula, FormulaEvaluationResult } from '@/types'

/**
 * 解析公式，提取结果名称和变量列表
 * @param formula - 公式字符串，如："净利润=人数×渗透率×人均消费量×单价×毛利率-固定费用"
 * @returns ParsedFormula - 包含结果名称、变量列表和原始表达式
 */
export function parseFormula(formula: string): ParsedFormula {
  if (!formula || typeof formula !== 'string') {
    return {
      resultName: '',
      variables: [],
      expression: '',
    }
  }

  // 分割公式：结果名称 = 表达式
  const parts = formula.split('=')
  if (parts.length !== 2) {
    // 如果没有等号，则视为纯表达式（无结果名称）
    return {
      resultName: '',
      variables: extractVariables(formula),
      expression: formula.trim(),
    }
  }

  const resultName = parts[0].trim()
  const expression = parts[1].trim()

  return {
    resultName,
    variables: extractVariables(expression),
    expression,
  }
}

/**
 * 从表达式中提取所有变量名
 * @param expression - 数学表达式
 * @returns 变量名数组
 */
function extractVariables(expression: string): string[] {
  // 替换所有运算符为空格，便于分割变量
  // 支持的运算符：+ - × ÷ * / ( )
  const normalized = expression
    .replace(/[+\-×÷*/()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) {
    return []
  }

  // 分割并过滤掉数字
  const tokens = normalized.split(' ')
  const variables = tokens.filter(token => {
    // 过滤掉空字符串和纯数字
    return token && isNaN(Number(token))
  })

  // 去重
  return Array.from(new Set(variables))
}

/**
 * 计算公式结果
 * @param formula - 公式字符串
 * @param data - 变量数据，key为变量名，value为数值
 * @returns FormulaEvaluationResult - 包含计算结果或错误信息
 */
export function evaluateFormula(
  formula: string,
  data: Record<string, number>
): FormulaEvaluationResult {
  try {
    const parsed = parseFormula(formula)
    
    // 检查是否有缺失的变量
    const missingVariables = parsed.variables.filter(v => !(v in data))
    if (missingVariables.length > 0) {
      return {
        success: false,
        error: `缺少变量: ${missingVariables.join(', ')}`,
        missingVariables,
      }
    }

    // 替换表达式中的变量为实际值
    let expression = parsed.expression

    // 按变量名长度倒序排序，避免短变量名替换长变量名的一部分
    // 例如："人数" 和 "人数增长率"，先替换 "人数增长率"
    const sortedVariables = parsed.variables.sort((a, b) => b.length - a.length)

    for (const variable of sortedVariables) {
      const value = data[variable]
      // 使用正则表达式确保只替换完整的变量名，而不是部分匹配
      const regex = new RegExp(escapeRegExp(variable), 'g')
      expression = expression.replace(regex, String(value))
    }

    // 标准化数学运算符
    expression = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')

    // 验证表达式（只允许数字和运算符）
    if (!/^[\d\s+\-*/.()]+$/.test(expression)) {
      return {
        success: false,
        error: '表达式包含非法字符',
      }
    }

    // 使用 Function 构造器安全地计算表达式
    // 注意：这比 eval 稍微安全一些，但仍需确保输入是可信的
    const result = new Function(`return ${expression}`)()

    if (typeof result !== 'number' || !isFinite(result)) {
      return {
        success: false,
        error: '计算结果无效',
      }
    }

    return {
      success: true,
      result: Number(result.toFixed(4)), // 保留4位小数
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '计算失败',
    }
  }
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 格式化数字为易读格式
 * @param value - 数值
 * @param decimals - 小数位数，默认2位
 * @returns 格式化后的字符串
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (!isFinite(value)) {
    return '-'
  }

  const absValue = Math.abs(value)
  
  // 大数字使用单位
  if (absValue >= 100000000) {
    return `${(value / 100000000).toFixed(decimals)}亿`
  } else if (absValue >= 10000) {
    return `${(value / 10000).toFixed(decimals)}万`
  }
  
  return value.toFixed(decimals)
}

/**
 * 验证公式格式是否正确
 * @param formula - 公式字符串
 * @returns 验证结果及错误信息
 */
export function validateFormula(formula: string): {
  valid: boolean
  error?: string
} {
  if (!formula || typeof formula !== 'string') {
    return { valid: false, error: '公式不能为空' }
  }

  const trimmed = formula.trim()
  if (!trimmed) {
    return { valid: false, error: '公式不能为空' }
  }

  // 检查是否包含等号
  const parts = trimmed.split('=')
  if (parts.length > 2) {
    return { valid: false, error: '公式只能包含一个等号' }
  }

  // 如果有等号，检查结果名称
  if (parts.length === 2) {
    const resultName = parts[0].trim()
    if (!resultName) {
      return { valid: false, error: '结果名称不能为空' }
    }
    
    // 检查表达式部分
    const expression = parts[1].trim()
    if (!expression) {
      return { valid: false, error: '表达式不能为空' }
    }
  }

  // 检查是否包含非法字符（允许中文、数字、运算符）
  const allowedChars = /^[\u4e00-\u9fa5\d\s+\-×÷*/()=.]+$/
  if (!allowedChars.test(trimmed)) {
    return { valid: false, error: '公式包含非法字符' }
  }

  return { valid: true }
}
