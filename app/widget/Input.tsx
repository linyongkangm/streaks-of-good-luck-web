/**
 * TextInput 和 NumberInput 组件
 * 
 * TextInput: 文本输入组件
 * - 占位符：通过placeholder属性设置输入框的占位文本
 * - 值的双向绑定：通过value和onChange属性实现输入值的双向绑定
 * - 样式：统一的输入框样式，支持聚焦和错误状态的样式变化
 * - 禁用状态：通过disabled属性控制输入框的禁用状态
 * - 错误提示：通过error属性显示输入错误的提示信息
 * 
 * NumberInput: 数字输入组件
 * - 支持设置最小值（min）、最大值（max）和步长（step）
 * - 支持数值单位的显示和输入，单位为万和亿
 *   如设置单位是"万"，输入100会显示为100万，实际值为1000000
 * - 其他功能同 TextInput
 */
'use client'

import { useState, useEffect } from 'react'

type NumberUnit = '万' | '亿' | 'none'

// 共享的基础属性
interface BaseProps {
  placeholder?: string
  className?: string
  disabled?: boolean
  error?: string
}

// TextInput 属性
interface TextInputProps extends BaseProps {
  value?: string
  onChange?: (value: string) => void
}

// NumberInput 属性
interface NumberInputProps extends BaseProps {
  value?: number
  onChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: NumberUnit
  decimalPlaces?: number
  suffix?: string
}

// 单位转换器
const unitMultipliers: Record<NumberUnit, number> = {
  '万': 10000,
  '亿': 100000000,
  'none': 1,
}

// 构建输入框样式的辅助函数
const getInputClassName = (error?: string, disabled?: boolean, className?: string): string => {
  return `
    w-full px-4 py-2 border rounded-lg 
    focus:outline-none focus:ring-2 
    transition-all duration-200
    ${error 
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
      : 'border-slate-300 focus:ring-purple-500 focus:border-purple-500'
    }
    ${disabled 
      ? 'bg-slate-100 text-slate-500 cursor-not-allowed' 
      : 'bg-white text-slate-900'
    }
    ${className || ''}
  `.trim().replace(/\s+/g, ' ')
}

/**
 * TextInput - 文本输入组件
 */
export function TextInput({
  value = '',
  onChange,
  placeholder,
  className = '',
  disabled = false,
  error,
}: TextInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }

  const inputClassName = getInputClassName(error, disabled, className)

  return (
    <div className="w-full">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClassName}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}

/**
 * NumberInput - 数字输入组件（带单位转换）
 */
export function NumberInput({
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
  error,
  min,
  max,
  step,
  unit = 'none',
  suffix,
  decimalPlaces,
}: NumberInputProps) {
  const [displayValue, setDisplayValue] = useState('')

  // 将实际值转换为显示值
  const convertToDisplayValue = (actualValue: number | undefined): string => {
    if (actualValue === undefined || actualValue === null) return ''
    
    const numValue = typeof actualValue === 'string' ? parseFloat(actualValue) : actualValue
    if (isNaN(numValue)) return ''
    
    const multiplier = unitMultipliers[unit]
    const displayNum = numValue / multiplier
    
    if (decimalPlaces !== undefined) {
      return displayNum.toFixed(decimalPlaces)
    }

    return displayNum.toString()
  }

  // 将显示值转换为实际值
  const convertToActualValue = (displayVal: string): number => {
    if (!displayVal || displayVal === '') return 0
    
    const numValue = parseFloat(displayVal)
    if (isNaN(numValue)) return 0
    
    const multiplier = unitMultipliers[unit]
    const actualNum = numValue * multiplier
    
    // 应用最小值和最大值限制
    let finalValue = actualNum
    if (min !== undefined && actualNum < min) finalValue = min
    if (max !== undefined && actualNum > max) finalValue = max
    
    return finalValue
  }

  // 当外部value变化时，更新显示值
  useEffect(() => {
    setDisplayValue(convertToDisplayValue(value))
  }, [value, unit])

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayValue = e.target.value
    setDisplayValue(newDisplayValue)
    
    // 只有在输入的是有效数字时才触发onChange
    if (newDisplayValue === '' || newDisplayValue === '-' || !isNaN(parseFloat(newDisplayValue))) {
      const actualValue = convertToActualValue(newDisplayValue)
      onChange?.(actualValue)
    }
  }

  // 处理失焦 - 格式化显示值
  const handleBlur = () => {
    if (displayValue) {
      const numValue = parseFloat(displayValue)
      if (!isNaN(numValue)) {
        if (decimalPlaces !== undefined) {
          setDisplayValue(numValue.toFixed(decimalPlaces))
        } else {
          setDisplayValue(numValue.toString())
        }
      }
    }
  }

  const inputClassName = getInputClassName(error, disabled, className)

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClassName}
          inputMode="decimal"
        />
        {(unit !== 'none' || suffix) && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            {unit !== 'none' ? unit : suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      {!error && (min !== undefined || max !== undefined) && (
        <p className="mt-1 text-xs text-slate-500">
          {min !== undefined && max !== undefined 
            ? `范围: ${min} - ${max}`
            : min !== undefined 
            ? `最小值: ${min}`
            : `最大值: ${max}`
          }
        </p>
      )}
    </div>
  )
}

// 默认导出 TextInput 以保持向后兼容
export default TextInput
