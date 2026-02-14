import { useState } from "react"

interface ButtonProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  children?: React.ReactNode
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  look?: 'primary' | 'secondary' | 'danger' | 'cancel'
}

function getButtonClass(look: ButtonProps['look'] = 'primary'): string {
  const baseClass = "px-8 py-3 flex items-center justify-center rounded-lg bg-gradient-to-r text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
  switch (look) {
    case 'primary':
      return `${baseClass} from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700`
    case 'secondary':
      return `${baseClass} from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800`
    case 'danger':
      return `${baseClass} from-red-500 to-red-600 hover:from-red-600 hover:to-red-700`
    case 'cancel':
      return `${baseClass} from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700`
    default:
      return `${baseClass} from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700`
  }
}

export default function Button({ onClick, children, disabled = false, type = 'button', look = 'primary' }: ButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  return (
    <button
      type={type}
      className={getButtonClass(look)}
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