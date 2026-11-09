
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface CalendarModalProps {
  initialDate: string; // yyyy-mm-dd
  historyDates?: Set<string>; // Set of dates that have entries
  onSelect: (date: string) => void;
  onClose: () => void;
}

const CalendarModal: React.FC<CalendarModalProps> = ({ initialDate, historyDates = new Set(), onSelect, onClose }) => {
  const [currentViewDate, setCurrentViewDate] = useState(new Date(initialDate || new Date()));
  const [isClosing, setIsClosing] = useState(false);
  const selectedDateStr = initialDate;

  const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
  const daysOfWeek = ["日", "一", "二", "三", "四", "五", "六"];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentViewDate(new Date(year, month + 1, 1));

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleDateClick = (day: number) => {
    const d = new Date(year, month, day);
    const dYear = d.getFullYear();
    const dMonth = String(d.getMonth() + 1).padStart(2, '0');
    const dDay = String(d.getDate()).padStart(2, '0');
    const dateStr = `${dYear}-${dMonth}-${dDay}`;
    
    setIsClosing(true);
    setTimeout(() => {
        onSelect(dateStr);
    }, 400);
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-12 w-full"></div>);
  }

  // 取得今天本地日期的輔助函式
  const getTodayLocalStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const todayStr = getTodayLocalStr();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isSelected = dateStr === selectedDateStr;
    const isToday = todayStr === dateStr;
    const hasHistory = historyDates.has(dateStr);

    days.push(
      <button
        key={d}
        onClick={() => handleDateClick(d)}
        className="h-12 w-full flex flex-col items-center justify-center relative group"
      >
        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition-all active:scale-90 group-hover:bg-slate-800 ${
          isSelected 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40' 
            : isToday 
              ? 'border border-blue-500 text-blue-500' 
              : 'text-slate-300'
        }`}>
          {d}
        </div>
        {hasHistory && !isSelected && (
          <div className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full"></div>
        )}
      </button>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 select-none" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className={`absolute inset-0 bg-black/80 backdrop-blur-md ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={handleClose}></div>
      <div className={`bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative z-10 ${isClosing ? 'animate-slide-down-out' : 'animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-[400ms]'}`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-white">訓練月曆</h3>
            <button onClick={handleClose} className="p-2 bg-slate-800 rounded-full text-slate-400 active:scale-90 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex justify-between items-center mb-6 px-2">
            <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-white active:scale-75 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="text-center">
              <div className="text-lg font-black text-white">{monthNames[month]}</div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{year}</div>
            </div>
            <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-white active:scale-75 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysOfWeek.map(day => (
              <div key={day} className="h-10 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">{days}</div>
          <div className="mt-6 flex justify-center">
             <button onClick={() => { 
               const today = new Date();
               handleDateClick(today.getDate()); 
             }} className="text-xs font-black text-blue-500 uppercase tracking-widest px-4 py-2 hover:bg-blue-500/10 rounded-xl transition-colors">回到今天</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CalendarModal;
