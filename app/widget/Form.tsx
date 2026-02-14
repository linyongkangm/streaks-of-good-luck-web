import React, { createContext, useContext, useState } from 'react'

/**
 * Form Context - 管理表单数据
 */
interface FormContextValue {
  values: Record<string, any>
  setFieldValue: (field: string, value: any) => void
  getFieldValue: (field: string) => any
}

const FormContext = createContext<FormContextValue | null>(null)

/**
 * Form 组件 - 表单容器，支持受控和非受控模式
 * 
 * @example 非受控模式
 * <Form onSubmit={(e, values) => console.log(values)} initialValues={{ name: 'John' }}>
 *   <FormItem field="name">
 *     <Input />
 *   </FormItem>
 * </Form>
 * 
 * @example 受控模式
 * const [values, setValues] = useState({ name: 'John' })
 * <Form 
 *   values={values} 
 *   onValuesChange={setValues}
 *   onSubmit={(e, values) => console.log(values)}
 * >
 *   <FormItem field="name">
 *     <Input />
 *   </FormItem>
 * </Form>
 */
interface FormProps<T> {
  onSubmit: (e: React.FormEvent, values: T) => void
  initialValues?: T
  values?: T
  onValuesChange?: (values: T) => void
  children: React.ReactNode
  className?: string
}

export function Form<T extends Record<string, any>>({ 
  onSubmit, 
  initialValues = {} as T, 
  values: controlledValues,
  onValuesChange,
  children, 
  className = '' 
}: FormProps<T>) {
  const [internalValues, setInternalValues] = useState<T>(initialValues)
  
  // 使用受控值或内部值
  const values = controlledValues !== undefined ? controlledValues : internalValues
  
  const setFieldValue = (field: string, value: any) => {
    const newValues = { ...values, [field]: value }
    if (controlledValues !== undefined) {
      // 受控模式，通知外部
      onValuesChange?.(newValues)
    } else {
      // 非受控模式，更新内部状态
      setInternalValues(newValues)
    }
  }
  
  const getFieldValue = (field: string) => {
    return values[field]
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(e, values)
  }
  
  return (
    <FormContext.Provider value={{ values, setFieldValue, getFieldValue }}>
      <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
        {children}
      </form>
    </FormContext.Provider>
  )
}

/**
 * useFormContext - 获取Form上下文
 */
export function useFormContext() {
  const context = useContext(FormContext)
  if (!context) {
    throw new Error('Form components must be used within Form')
  }
  return context
}

/**
 * FormItem 组件 - 自动绑定field到Form的Context
 * 自动处理value和onChange的注入，简化表单字段的绑定
 * 
 * @example 基本用法
 * <FormItem field="username">
 *   <Input />
 * </FormItem>
 * 
 * @example 带自定义onChange
 * <FormItem field="username" onChange={(value) => console.log('Changed:', value)}>
 *   <Input />
 * </FormItem>
 */
interface FormItemProps {
  field: string
  children: React.ReactElement
  onChange?: (value: any) => void
}

export function FormItem({ field, children, onChange }: FormItemProps) {
  const { getFieldValue, setFieldValue } = useFormContext()
  const value = getFieldValue(field)
  
  const handleChange = (val: any) => {
    setFieldValue(field, val)
    onChange?.(val)
  }
  
  // Clone the child and inject value and onChange
  return React.cloneElement(children, {
    value,
    onChange: handleChange
  } as any)
}

/**
 * FormLabel 组件 - 表单项布局容器
 * 纯布局组件，用于统一表单项的label样式和布局
 * 
 * @example 基本用法
 * <FormLabel label="用户名" required>
 *   <Input value={value} onChange={setValue} />
 * </FormLabel>
 * 
 * @example 复杂label
 * <FormLabel label={<div>用户名 <span className="text-gray-400">(选填)</span></div>}>
 *   <Input />
 * </FormLabel>
 */
interface FormLabelProps {
  label?: React.ReactNode
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function FormLabel({ label, required, children, className = '' }: FormLabelProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
    </div>
  )
}
