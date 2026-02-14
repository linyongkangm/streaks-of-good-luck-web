import React from 'react'

/**
 * Select 组件选项接口
 */
export interface SelectOption<T extends string | number> {
  label: string
  value: T
  disabled?: boolean
}

/**
 * Select 组件 - 通用下拉选择组件
 * 支持TypeScript泛型，确保类型安全
 * 
 * @example 基本用法
 * <Select
 *   options={[
 *     { label: '选项1', value: 'option1' },
 *     { label: '选项2', value: 'option2' },
 *   ]}
 *   value={value}
 *   onChange={setValue}
 * />
 * 
 * @example 带placeholder
 * <Select
 *   options={options}
 *   value={value}
 *   onChange={setValue}
 *   placeholder="请选择..."
 * />
 * 
 * @example 从对象生成选项
 * const labels = { pe: 'PE (市盈率)', pb: 'PB (市净率)' }
 * <Select
 *   options={Object.entries(labels).map(([value, label]) => ({ value, label }))}
 *   value={metric}
 *   onChange={setMetric}
 * />
 */
interface SelectProps<T extends string | number> {
  options: SelectOption<T>[]
  value: T
  onChange: (value: T) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function Select<T extends string | number>({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  className = ''
}: SelectProps<T>) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value as T
    onChange(selectedValue)
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={disabled}
      className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed ${className}`}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
