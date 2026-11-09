import React from 'react';
import { createPortal } from 'react-dom';

interface ImportConfirmModalProps {
  isOpen: boolean;
  onSelectOption: (onlyImported: boolean) => void;
  onCancel: () => void;
}

const ImportConfirmModal: React.FC<ImportConfirmModalProps> = ({
  isOpen,
  onSelectOption,
  onCancel,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in duration-[300ms]"
      onClick={onCancel}
    >
      <div 
        className="relative bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-modal-pop duration-[300ms]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 右上角關閉按鈕 */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-2 rounded-full hover:bg-slate-800/60 transition-colors"
          title="關閉"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-7 text-center">
          {/* 圖示 */}
          <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </div>

          {/* 標題與提問 */}
          <h3 className="text-xl font-black text-white mb-6">是否僅保留匯入資料？</h3>

          {/* 是跟否的2個按鈕 (帶有說明) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onSelectOption(false)}
              className="py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all active:scale-95 flex flex-col items-center justify-center gap-1 group text-center"
            >
              <span className="font-black text-base text-white">否</span>
              <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-300 leading-tight">
                匯入資料與內建預設動作並存
              </span>
            </button>
            <button
              onClick={() => onSelectOption(true)}
              className="py-3 px-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white transition-all active:scale-95 flex flex-col items-center justify-center gap-1 shadow-lg shadow-blue-600/30 text-center"
            >
              <span className="font-black text-base text-white">是</span>
              <span className="text-[11px] font-medium text-blue-100 leading-tight">
                刪除內建預設動作
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImportConfirmModal;
