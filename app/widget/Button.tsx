import { useState } from "react"

interface ButtonProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  children?: React.ReactNode
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  look?: 'primary' | 'secondary' | 'danger' | 'cancel' | 'success' | 'icon'
  size?: 'tiny' | 'small' | 'medium' | 'large'
  className?: string
  title?: string
  iconColor?: 'blue' | 'red'
}

function getButtonClass(look: ButtonProps['look'], size: ButtonProps['size'], iconColor: ButtonProps['iconColor']): string {
  if (look === 'icon') {
    const hoverColor = iconColor === 'red' ? 'hover:text-red-600' : 'hover:text-blue-600'
    return `flex items-center justify-center p-1 text-slate-400 ${hoverColor} transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed`
  }

  let baseClass = "flex items-center justify-center whitespace-nowrap rounded-lg bg-gradient-to-r text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
  if (size) {
    baseClass += {
      tiny: " px-3 py-1 text-sm",
      small: " px-4 py-2 text-sm",
      medium: " px-8 py-3 text-base",
      large: " px-12 py-4 text-lg",
    }[size]
  }

  if (look) {
    baseClass += {
      primary: " from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
      secondary: " from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800",
      danger: " from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
      cancel: " from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700",
      success: " from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700",
    }[look]
  }
  return baseClass;
}

export default function Button({ onClick, children, disabled = false, type = 'button', look = 'primary', size = 'medium', className = '', title, iconColor }: ButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  return (
    <button
      type={type}
      className={`${getButtonClass(look, size, iconColor)} ${className}`}
      title={title}
      onClick={async (e) => {
        if (isProcessing) return
        setIsProcessing(true)
        if (onClick) {
          await onClick(e)
        }
        setIsProcessing(false)
      }}
      disabled={isProcessing || disabled}
    >
      {isProcessing ? (
        <>
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
          处理中...
        </>
      ) : (
        children
      )}
    </button>
  )
}