import { Toast } from '@/hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
}

export default function ToastContainer({ toasts }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-xl shadow-lg animate-slide-in pointer-events-auto ${
            toast.type === 'success' ? 'bg-green-500 text-white' :
            toast.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' && <span>✅</span>}
            {toast.type === 'error' && <span>⚠️</span>}
            {toast.type === 'info' && <span>ℹ️</span>}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
