
import React from 'react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  title, message, onConfirm, onCancel, 
  confirmText = "確定", cancelText = "取消", 
  isDangerous = true 
}) => {
  // 使用 Portal 渲染到 body，確保不受父層 transform 影響位置，並確保層級最高
  return createPortal(
    <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in duration-[400ms]">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-modal-pop duration-[400ms]">
        <div className="p-8 text-center">
          <div className={`w-16 h-16 ${isDangerous ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'} rounded-full flex items-center justify-center mx-auto mb-6`}>
            {isDangerous ? (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            ) : (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
          </div>
          <h3 className="text-xl font-black text-white mb-2">{title}</h3>
          <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex border-t border-slate-800">
          <button 
            onClick={onCancel}
            className="flex-1 py-5 text-sm font-black text-slate-500 border-r border-slate-800 hover:bg-slate-800 transition-colors active:scale-95"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 py-5 text-sm font-black ${isDangerous ? 'text-red-500 hover:bg-red-500/5' : 'text-blue-500 hover:bg-blue-500/5'} transition-colors active:scale-95`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;
