import React from 'react'

interface PanelProps {
  title?: React.ReactNode
  headerAction?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export default function Panel({ title, headerAction, children, className = '' }: PanelProps) {
  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      {
        (title || headerAction) && <div className={`flex justify-between items-center ${children ? 'mb-4' : ''}`}>
          {title && (
            <h2 className="text-xl font-bold text-slate-800">
              {title}
            </h2>
          )}
          {headerAction && (
            <div>{headerAction}</div>
          )}
        </div>
      }
      {children}
    </div>
  )
}
