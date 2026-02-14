import React, { useState } from 'react'
import Modal from './Modal'
import { Form, FormLabel } from './Form'
import Button from './Button'

/**
 * ModalForm 组件 - Modal + Form 的组合组件
 * 适用于弹窗表单场景，自动处理提交状态和按钮布局
 * 
 * @example 基本用法
 * <ModalForm
 *   open={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="添加用户"
 *   onSubmit={(e, values) => console.log(values)}
 *   initialValues={{ name: '', age: 0 }}
 * >
 *   <FormItem field="name"><Input /></FormItem>
 *   <FormItem field="age"><NumberInput /></FormItem>
 * </ModalForm>
 * 
 * @example 受控模式
 * <ModalForm
 *   open={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="编辑用户"
 *   values={formData}
 *   onValuesChange={setFormData}
 *   onSubmit={handleSubmit}
 * >
 *   ...
 * </ModalForm>
 * 
 * @example 自定义footer
 * <ModalForm
 *   open={showModal}
 *   onClose={onClose}
 *   title="确认"
 *   onSubmit={handleSubmit}
 *   footer={(submitting) => (
 *     <div>
 *       <Button onClick={onClose}>取消</Button>
 *       <Button type="submit" disabled={submitting}>提交</Button>
 *     </div>
 *   )}
 * >
 *   ...
 * </ModalForm>
 */
interface ModalFormProps<T = Record<string, any>> {
  open: boolean
  onClose: () => void
  title: string
  values?: T
  initialValues?: T
  onValuesChange?: (values: T) => void
  onSubmit: (e: React.FormEvent, values: T) => void | Promise<void>
  children: React.ReactNode
  submitText?: string
  cancelText?: string
  showFooter?: boolean
  footer?: (submitting: boolean, onClose: () => void) => React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

export default function ModalForm<T = Record<string, any>>({
  open,
  onClose,
  title,
  values,
  initialValues,
  onValuesChange,
  onSubmit,
  children,
  submitText = '确定',
  cancelText = '取消',
  showFooter = true,
  footer,
  maxWidth,
  className
}: ModalFormProps<T>) {
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent, formValues: T) => {
    setSubmitting(true)
    try {
      await onSubmit(e, formValues)
    } finally {
      setSubmitting(false)
    }
  }

  const handleValuesChange = (formValues: Record<string, any>) => {
    onValuesChange?.(formValues as T)
  }

  const defaultFooter = (
    <FormLabel>
      <div className="flex gap-10 mt-6 justify-center">
        <Button look='cancel' onClick={onClose} disabled={submitting}>
          {cancelText}
        </Button>
        <Button type="submit" look='success' disabled={submitting}>
          {submitting ? '提交中...' : submitText}
        </Button>
      </div>
    </FormLabel>
  )

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth={maxWidth} className={className}>
      <Form
        values={values as Record<string, any>}
        initialValues={initialValues as Record<string, any>}
        onValuesChange={handleValuesChange}
        onSubmit={handleSubmit as any}
      >
        {children}
        {showFooter && (footer ? footer(submitting, onClose) : defaultFooter)}
      </Form>
    </Modal>
  )
}
