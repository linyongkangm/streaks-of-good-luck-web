import { useState } from "react"

interface ButtonProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  children?: React.ReactNode
}

export default function Button({ onClick, children }: ButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  return (
    <button
      className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={async (e) => {
        if (isProcessing) return
        setIsProcessing(true)
        if (onClick) {
          await onClick(e)
        }
        setIsProcessing(false)
      }}
      disabled={isProcessing}
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