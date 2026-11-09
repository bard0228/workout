
import React from 'react';

interface NumericKeyboardProps {
  onKeyPress: (key: string) => void;
  onClose: () => void;
  allowDecimal?: boolean;
}

const NumericKeyboard: React.FC<NumericKeyboardProps> = ({ onKeyPress, onClose, allowDecimal = true }) => {
  const handleKeyClick = (key: string) => {
    if (key === '.') {
      if (allowDecimal) {
        onKeyPress(key);
      }
    } else {
      onKeyPress(key);
    }
  };

  const keys = [
    ['1', '2', '3', '刪除'],
    ['4', '5', '6', '-'],
    ['7', '8', '9', allowDecimal ? '.' : ''],
    ['0']
  ];

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 animate-in fade-in slide-in-from-top-2 duration-[400ms]">
      <div className="flex justify-between items-center mb-3 px-2">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">輸入數值</span>
        <button 
          type="button"
          onClick={onClose}
          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-blue-900/20"
        >
          完成輸入
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {keys.flat().map((key, idx) => (
          key === '' ? <div key={`empty-${idx}`} /> : (
            <button
              key={key}
              type="button"
              onClick={() => handleKeyClick(key)}
              className={`h-12 rounded-xl flex items-center justify-center text-xl font-black transition-all active:scale-95 active:bg-slate-700 ${
                key === '刪除' 
                  ? 'bg-slate-800 text-slate-400' 
                  : 'bg-slate-950/80 border border-slate-800 text-slate-200 hover:bg-slate-800'
              } ${key === '0' ? 'col-span-4' : ''}`}
            >
              {key === '刪除' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
              ) : key}
            </button>
          )
        ))}
      </div>
    </div>
  );
};

export default NumericKeyboard;
