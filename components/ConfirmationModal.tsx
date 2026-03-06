
import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    danger: 'bg-red-600 hover:bg-red-700 shadow-red-100',
    warning: 'bg-amber-500 hover:bg-amber-600 shadow-amber-100',
    info: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
  };

  const iconStyles = {
    danger: 'text-red-600 bg-red-50',
    warning: 'text-amber-600 bg-amber-50',
    info: 'text-indigo-600 bg-indigo-50'
  };

  const icons = {
    danger: '⚠️',
    warning: '🔔',
    info: 'ℹ️'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 text-center">
          <div className={`w-20 h-20 ${iconStyles[type]} rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-sm`}>
            {icons[type]}
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{title}</h3>
          <p className="text-slate-500 font-bold leading-relaxed">{message}</p>
        </div>
        <div className="p-8 bg-slate-50 flex gap-4 border-t border-slate-100">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-4 rounded-2xl font-black text-slate-400 hover:bg-slate-200 transition-all uppercase tracking-widest text-xs"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-6 py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs ${typeStyles[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
