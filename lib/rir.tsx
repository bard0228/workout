import React from 'react';
export const RIR_OPTIONS = [0, 1, 2, 3, 4, 5];
export const rirLabel = (v: number) => (v >= 5 ? '5+' : String(v));
export const rirSuffix = (rir?: number | null) => (typeof rir === 'number' ? ` @RIR${rirLabel(rir)}` : '');
export const RirPicker: React.FC<{ value?: number | null; onChange: (v: number | null) => void; size?: 'sm' | 'md' }> = ({ value, onChange, size = 'sm' }) => (
  <div className="flex items-center gap-1">
    {RIR_OPTIONS.map(v => (
      <button key={v} type="button" onClick={(e) => { e.stopPropagation(); onChange(value === v ? null : v); }}
        className={`${size === 'md' ? 'flex-1 py-3 text-sm rounded-xl' : 'px-2 py-0.5 text-[10px] rounded'} font-black transition-all active:scale-95 ${value === v ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-900 border border-slate-800 text-slate-400'}`}>
        {rirLabel(v)}
      </button>
    ))}
  </div>
);
