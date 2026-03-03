/**
 * Radio 组件
 * 提供一个单选按钮组，支持多个选项的选择
 * 功能：
 * - 支持自定义选项列表
 * - 按钮组样式显示
 * - 单选控制
 * - 禁用状态
 */
'use client'

interface RadioOption<T = string> {
  label: string
  value: T
}

interface RadioProps<T = string> {
  options: RadioOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  className?: string
}

export default function Radio<T extends string = string>({
  options,
  value,
  onChange,
  disabled = false,
  className = '',
}: RadioProps<T>) {
  return (
    <div className={`inline-flex rounded-lg overflow-hidden border border-slate-300 ${className}`}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          onClick={() => !disabled && onChange(option.value)}
          disabled={disabled}
          className={`
            px-4 py-2 transition-colors
            ${index > 0 ? 'border-l border-slate-300' : ''}
            ${value === option.value
              ? 'bg-blue-500 text-white'
              : 'bg-white text-slate-700 hover:bg-slate-100'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `.trim().replace(/\s+/g, ' ')}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
