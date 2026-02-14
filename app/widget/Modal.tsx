/**
 * Modal 组件
 * 提供一个通用的弹窗组件
 * 功能：
 * - 支持自定义标题
 * - 支持点击背景关闭
 * - 支持自定义内容
 * - 支持自定义大小
 * - 内置滚动支持
 */
'use client'

import { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = '2xl',
  className = '',
}: ModalProps) {
  if (!open) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-xl shadow-2xl p-8 ${maxWidthClasses[maxWidth]} w-full mx-4 max-h-[90vh] overflow-y-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 className="text-2xl font-bold text-slate-800 mb-6">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  )
}
