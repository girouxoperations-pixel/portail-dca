'use client'

interface Props {
  titre:      string
  onClose:    () => void
  children:   React.ReactNode
  maxWidth?:  string
  scrollable?: boolean
}

export default function Modal({
  titre, onClose, children, maxWidth = 'max-w-lg', scrollable = false,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`bg-white rounded-xl shadow-xl w-full ${maxWidth}${scrollable ? ' max-h-[90vh] overflow-y-auto' : ''}`}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">{titre}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
