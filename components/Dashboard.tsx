
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RirPicker, rirSuffix } from '../lib/rir';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';
import { Star, Search, ChevronDown, Share2, Calendar, Edit2, Trash2, Plus, X, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Exercise, WorkoutHistoryEntry, Category, Combo, SetData } from '../types';
import { CATEGORIES } from '../constants';
import CalendarModal from './CalendarModal';
import ConfirmModal from './ConfirmModal';
import NumericKeyboard from './NumericKeyboard';
import MuscleMap from './MuscleMap';
import WorkoutConfirmModal from './WorkoutConfirmModal';
import { calculateTotalVolume, getRecommendedCategory } from '../lib/workout';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DashboardProps {
  exercises: Exercise[];
  combos: Combo[];
  history: WorkoutHistoryEntry[];
  isCalendarOpen: boolean;
  setIsCalendarOpen: (open: boolean) => void;
  onStartExercise: (ex: Exercise) => void;
  onStartCombo: (combo: Combo) => void;
  onEditCombos: () => void;
  onEditExercises: () => void;
  onUpdateHistory: (updated: WorkoutHistoryEntry) => void;
  onDeleteHistory: (id: string) => void;
  onUpdateExercisePhoto?: (exerciseId: string, photoBase64: string) => void;
  selectedCategory?: Category;
  onSelectCategory?: (cat: Category) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  exercises, combos, history, isCalendarOpen, setIsCalendarOpen, onStartExercise, onStartCombo, onEditCombos, onEditExercises, onUpdateHistory, onDeleteHistory, onUpdateExercisePhoto,
  selectedCategory: propSelectedCategory,
  onSelectCategory
}) => {
  const [internalCategory, setInternalCategory] = useState<Category>('全部');
  const selectedCategory = propSelectedCategory !== undefined ? propSelectedCategory : internalCategory;
  const setSelectedCategory = onSelectCategory || setInternalCategory;
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllExercises, setShowAllExercises] = useState(false); 
  const [viewedDay, setViewedDay] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<WorkoutHistoryEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [confirmingExercise, setConfirmingExercise] = useState<Exercise | null>(null);
  
  const [activeInput, setActiveInput] = useState<{setId: string, field: keyof SetData} | null>(null);
  const [tempInput, setTempInput] = useState<string>('');
  const [isFirstInput, setIsFirstInput] = useState(true);
  const keyboardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const shareContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (confirmingExercise) {
        setConfirmingExercise(null);
        return;
      }
      if (editingEntryId) {
        setEditingEntryId(null);
        setEditDraft(null);
        setActiveInput(null);
        setTempInput('');
        return;
      }
      if (viewedDay) {
        setViewedDay(null);
        setDeleteTarget(null);
        return;
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [confirmingExercise, editingEntryId, viewedDay]);

  useEffect(() => {
    setIsExpanded(false);
    setShowAllExercises(false); 
  }, [selectedCategory]);

  useEffect(() => {
    if (activeInput && keyboardRef.current) {
        setTimeout(() => { keyboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, 100);
    }
  }, [activeInput]);

  const historyDates = useMemo(() => new Set(history.map(h => h.date)), [history]);

  // 1. 計算動作頻率
  const exerciseFrequencies = useMemo(() => {
    const counts: Record<string, number> = {};
    history.forEach(entry => {
      counts[entry.exerciseName] = (counts[entry.exerciseName] || 0) + 1;
    });
    return counts;
  }, [history]);

  // 2. 智慧部位推薦邏輯 (胸部、背部、腿部 循環)
  const recommendedCategory = useMemo(() => {
    return getRecommendedCategory(history, exercises);
  }, [history, exercises]);

  const filteredExercises = useMemo(() => {
    let result = [...exercises];
    
    // 排序邏輯
    result.sort((a, b) => {
      // 如果是 "全部" 類別，優先顯示推薦部位
      if (selectedCategory === '全部') {
        const isARec = a.category === recommendedCategory;
        const isBRec = b.category === recommendedCategory;
        if (isARec && !isBRec) return -1;
        if (!isARec && isBRec) return 1;
      }

      // 依照頻率排序 (由高到低)
      const freqA = exerciseFrequencies[a.name] || 0;
      const freqB = exerciseFrequencies[b.name] || 0;
      if (freqA !== freqB) return freqB - freqA;

      // 頻率相同則按名稱
      return a.name.localeCompare(b.name);
    });

    if (selectedCategory !== '全部') {
      result = result.filter(ex => ex.category === selectedCategory);
    }

    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(ex => ex.name.toLowerCase().includes(lowerTerm));
    }
    return result;
  }, [exercises, selectedCategory, searchTerm, exerciseFrequencies, recommendedCategory]);

  const initialExercises = useMemo(() => {
    return filteredExercises.slice(0, 9);
  }, [filteredExercises]);

  const extraExercises = useMemo(() => {
    return filteredExercises.slice(9);
  }, [filteredExercises]);

  const remainingCount = extraExercises.length;

  const recentSessions = useMemo(() => {
    // 取得所有唯一日期並確保排序為從新到舊 (最新在前面)
    // Fix: Explicitly cast uniqueDates to string[] to resolve the 'unknown' type error for localeCompare
    const uniqueDates = Array.from(new Set(history.map(h => h.date))) as string[];
    uniqueDates.sort((a, b) => b.localeCompare(a));
    
    // 取前 6 個日期作為最近的 6 次紀錄
    const top6Dates = uniqueDates.slice(0, 6);
    return top6Dates.map(date => ({
      date,
      entries: history.filter(h => h.date === date)
    }));
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (!viewedDay) return [];
    return history.filter(h => h.date === viewedDay);
  }, [history, viewedDay]);

  const startEditing = (entry: WorkoutHistoryEntry) => {
    window.history.pushState({ view: 'DASHBOARD', modal: 'edit-entry' }, '');
    setEditingEntryId(entry.id);
    setEditDraft(JSON.parse(JSON.stringify(entry)));
    setActiveInput(null);
    setTempInput('');
  };

  const handleInputClick = (setId: string, field: keyof SetData, initialValue: number) => {
    setActiveInput({ setId, field });
    setTempInput(initialValue.toString());
    setIsFirstInput(true);
  };

  const handleKeyPress = (key: string) => {
    if (!editDraft || !activeInput) return;
    const { setId, field } = activeInput;
    const setIndex = editDraft.detailedSets.findIndex(s => s.id === setId);
    if (setIndex === -1) return;

    if (key === '-') {
        let newTemp = tempInput.startsWith('-') ? tempInput.slice(1) : '-' + tempInput;
        setTempInput(newTemp);
        const numVal = parseFloat(newTemp) || 0;
        const newSets = [...editDraft.detailedSets];
        newSets[setIndex] = { ...newSets[setIndex], [field]: numVal };
        setEditDraft({ ...editDraft, detailedSets: newSets });
        return;
    }

    let newVal = tempInput;
    if (isFirstInput) {
        newVal = key === '.' ? '0.' : key;
    } else {
        if (key === '.') { if (!newVal.includes('.')) newVal += '.'; }
        else { newVal = (newVal === '0' || newVal === '-0') ? key : newVal + key; }
    }
    if (key === '刪除') newVal = tempInput.length > 1 ? tempInput.slice(0, -1) : '0';
    setIsFirstInput(false);
    setTempInput(newVal);
    const num = key === '刪除' && newVal === '-' ? 0 : (parseFloat(newVal) || 0);
    const newSets = [...editDraft.detailedSets];
    newSets[setIndex] = { ...newSets[setIndex], [field]: num };
    setEditDraft({ ...editDraft, detailedSets: newSets });
  };

  const handleAddSet = () => {
    if (!editDraft) return;
    const lastSet = editDraft.detailedSets[editDraft.detailedSets.length - 1];
    const newSet: SetData = {
      id: crypto.randomUUID(),
      weight: lastSet ? lastSet.weight : 0,
      reps: lastSet ? lastSet.reps : 0,
      isDropSet: false,
      weightUnit: lastSet?.weightUnit || 'kg',
      repsUnit: lastSet?.repsUnit,
      timestamp: new Date().toISOString()
    };
    setEditDraft({ ...editDraft, detailedSets: [...editDraft.detailedSets, newSet] });
  };

  const saveEdit = () => {
    if (editDraft) {
      const summary = editDraft.detailedSets.map(s => {
         const unit = s.repsUnit === 'min' ? '分' : (s.repsUnit === 'sec' ? '秒' : '次');
         const prefix = s.isWarmup ? '[熱身] ' : '';
         const primary = `${s.weight}${s.weightUnit}x${s.reps}${unit}`;
         const dropPart = s.isDropSet ? ` + ${s.dropWeight}${s.weightUnit}x${s.dropReps}${unit}` : '';
         return `${prefix}${primary}${dropPart}${rirSuffix(s.rir)}`;
      });
      onUpdateHistory({ ...editDraft, sets: summary });
    }
    window.history.back();
  };

  const handleCategoryClick = (cat: Category) => {
    setSelectedCategory(cat);
    setSearchTerm('');
    if (containerRef.current) containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShare = async () => {
    if (!shareContainerRef.current) return;
    setIsSharing(true);
    try {
      const canvas = await html2canvas(shareContainerRef.current, {
        backgroundColor: '#0f172a', // slate-900
        scale: 2,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `workout-${viewedDay}.png`, { type: 'image/png' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `健身紀錄 ${viewedDay}`,
            text: `查看我今天的健身成果！`
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `workout-${viewedDay}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Share error:', err);
      alert('分享失敗，請稍後再試');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-fade-in relative">
      <div ref={containerRef} className="flex-1 overflow-y-auto no-scrollbar pb-24 relative">
        <div ref={headerRef} className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/50 pt-2 pb-2 shadow-xl shadow-black/20">
          <div className="px-6 py-2 flex justify-between items-center"><h2 className="text-2xl font-black text-white">訓練儀表板</h2></div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar">
            {CATEGORIES.map(cat => (
              <button 
                key={cat} 
                onClick={() => handleCategoryClick(cat)} 
                className={`flex-shrink-0 px-4 sm:px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  selectedCategory === cat 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">動作列表</h3>
            <button onClick={onEditExercises} className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 active:scale-90 transition-transform flex items-center gap-1"><span className="text-[10px] font-bold">訓練動作庫</span><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          </div>
          <button onClick={() => setIsExpanded(!isExpanded)} className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${isExpanded ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-900 text-blue-500 border-slate-800'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>{isExpanded ? '收起搜尋' : '搜尋動作'}</button>
          <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}><input type="text" placeholder="輸入動作名稱搜尋..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500" /></div>
          {/* 常駐顯示前 9 個動作 (一律保持 3 欄排列，高度拉長，圖大字大且文字延伸至邊緣) */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {initialExercises.map(ex => (
              <button 
                key={ex.id} 
                onClick={() => setConfirmingExercise(ex)} 
                className="w-full text-left px-0.5 py-2 sm:px-1 sm:py-2.5 bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl active:bg-slate-800 active:scale-95 transition-all flex flex-row items-center gap-1 sm:gap-1.5 min-h-[76px] sm:min-h-[84px] group relative overflow-hidden shadow-sm hover:border-slate-700"
              >
                {selectedCategory === '全部' && ex.category === recommendedCategory && (
                  <div className="absolute top-0 right-0 bg-blue-600 border-b border-l border-blue-400/50 text-[8px] font-black px-1 py-0.5 rounded-bl-md z-20 flex items-center justify-center shadow-sm animate-fade-in-up">
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="#7FA98B" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </div>
                )}
                {/* 肌肉訓練分布圖示 (左側大圖示) */}
                <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 bg-slate-950/80 border border-slate-800/80 rounded-lg sm:rounded-xl p-0.5 flex items-center justify-center group-hover:border-slate-700 transition-colors relative overflow-hidden shadow-inner ml-0.5">
                  <MuscleMap exercise={ex} variant="compact" />
                </div>
                {/* 動作資訊 (右側文字，字體大小與鬼背組合一樣為 text-lg font-black，內邊距極小化讓文字貼近邊緣) */}
                <div className="min-w-0 flex-1 flex flex-col justify-center text-left px-0.5">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 block leading-none truncate mb-0.5">
                    {ex.category}
                  </span>
                  <span className="font-black text-[16px] text-white group-hover:text-blue-300 line-clamp-2 leading-tight break-words">
                    {ex.name}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* 更多動作 (具備平滑展開與收起動畫，保持 3 欄，高度拉長，圖大字大) */}
          {extraExercises.length > 0 && (
            <div 
              className={`accordion-wrapper ${showAllExercises ? 'expanded' : 'collapsed'}`}
            >
              <div className="accordion-inner">
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-2">
                  {extraExercises.map(ex => (
                    <button 
                      key={ex.id} 
                      onClick={() => setConfirmingExercise(ex)} 
                      className="w-full text-left px-0.5 py-2 sm:px-1 sm:py-2.5 bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl active:bg-slate-800 active:scale-95 transition-all flex flex-row items-center gap-1 sm:gap-1.5 min-h-[76px] sm:min-h-[84px] group relative overflow-hidden shadow-sm hover:border-slate-700"
                    >
                      {selectedCategory === '全部' && ex.category === recommendedCategory && (
                        <div className="absolute top-0 right-0 bg-blue-600 border-b border-l border-blue-400/50 text-[8px] font-black px-1 py-0.5 rounded-bl-md z-20 flex items-center justify-center shadow-sm animate-fade-in-up">
                          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="#7FA98B" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </div>
                      )}
                      {/* 肌肉訓練分布圖示 (左側大圖示) */}
                      <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 bg-slate-950/80 border border-slate-800/80 rounded-lg sm:rounded-xl p-0.5 flex items-center justify-center group-hover:border-slate-700 transition-colors relative overflow-hidden shadow-inner ml-0.5">
                        <MuscleMap exercise={ex} variant="compact" />
                      </div>
                      {/* 動作資訊 (右側文字，字體大小與鬼背組合一樣為 text-lg font-black，內邊距極小化讓文字貼近邊緣) */}
                      <div className="min-w-0 flex-1 flex flex-col justify-center text-left px-0.5">
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 block leading-none truncate mb-0.5">
                          {ex.category}
                        </span>
                        <span className="font-black text-[16px] text-white group-hover:text-blue-300 line-clamp-2 leading-tight break-words">
                          {ex.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={() => setShowAllExercises(!showAllExercises)} 
            disabled={!showAllExercises && remainingCount === 0} 
            className={`w-full py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-all ${(!showAllExercises && remainingCount === 0) ? 'opacity-50 text-slate-600' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <span>{showAllExercises ? '收起列表' : `查看更多訓練動作 (${remainingCount})`}</span>
            <svg 
              className={`w-4 h-4 transition-transform duration-300 ease-out ${showAllExercises ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        {!searchTerm && combos.length > 0 && (
          <div className="p-4 space-y-3 pt-2">
            <div className="flex justify-between items-end px-1"><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">快速組合</h3><button onClick={onEditCombos} className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20 flex items-center gap-1">管理組合</button></div>
            <div className="grid grid-cols-2 gap-3">{combos.map(combo => (
                <button key={combo.id} onClick={() => onStartCombo(combo)} className="w-full text-left p-4 bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 rounded-3xl active:scale-[0.98] transition-all group relative overflow-hidden flex flex-col justify-between h-32"><div className="relative z-10 w-full"><span className="font-black text-lg text-white block mb-1.5 leading-tight">{combo.name}</span><span className="text-[10px] text-slate-400 font-medium leading-relaxed line-clamp-3">{combo.exerciseIds.map(id => exercises.find(e => e.id === id)?.name).filter(Boolean).join('、')}</span></div><div className="relative z-10 self-end w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-blue-500 group-active:bg-blue-600 group-active:text-white transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div></button>
              ))}</div>
          </div>
        )}
        <div className="p-4 space-y-3 border-t border-slate-800/50 pb-12">
            <div className="flex justify-between items-end px-1"><h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">近期紀錄 (近6次訓練)</h3><button onClick={() => setIsCalendarOpen(true)} className="text-blue-500 p-2 bg-blue-500/10 rounded-lg active:scale-95 transition-all border border-blue-500/20"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg></button></div>
            {recentSessions.length > 0 ? (
                <div className="space-y-3">{recentSessions.map(session => (
                    <div key={session.date} className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-4 overflow-hidden"><div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800/50"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div><div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{session.date}</div></div><div className="space-y-1.5">{session.entries.map(entry => (
                          <div key={entry.id} onClick={() => startEditing(entry)} className="flex justify-between items-center group cursor-pointer p-2.5 hover:bg-slate-800/60 rounded-xl transition-all"><div className="font-bold text-white text-base pl-2 border-l-2 border-blue-600/30 group-hover:border-blue-500">{entry.exerciseName}</div><div className="text-slate-600 group-hover:text-blue-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></div></div>
                        ))}</div></div>
                  ))}</div>
            ) : (<div className="py-8 text-center border-2 border-dashed border-slate-800/50 rounded-2xl bg-slate-900/20"><p className="text-xs font-bold text-slate-600">現在尚無紀錄</p></div>)}
        </div>
      </div>
      {isCalendarOpen && <CalendarModal initialDate={new Date().toISOString().split('T')[0]} historyDates={historyDates} onSelect={(date) => { window.history.pushState({ view: 'DASHBOARD', modal: 'view-day' }, ''); setViewedDay(date); setIsCalendarOpen(false); }} onClose={() => setIsCalendarOpen(false)} />}
      {viewedDay && createPortal(
        <div className="fixed inset-0 z-[2000] flex flex-col p-6 animate-fade-in"><div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => window.history.back()}></div><div className="relative z-10 flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl animate-modal-pop"><header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900"><div><h3 className="text-xl font-black text-white">{viewedDay}</h3><p className="text-xs font-bold text-slate-500 mt-1">當日訓練紀錄</p></div><button onClick={() => window.history.back()} className="p-2 bg-slate-800 rounded-xl text-slate-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button></header><div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
              <div ref={shareContainerRef} className="bg-slate-900 p-2 space-y-3">
                <div className="mb-4 hidden sm:block">
                  <h3 className="text-xl font-black text-white">{viewedDay}</h3>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">PRO WORKOUT 訓練紀錄</p>
                </div>
                {filteredHistory.map(entry => {
                  const ex = exercises.find(e => e.name === entry.exerciseName);
                  const isDuration = ex?.mode === 'DURATION';
                  const vol = calculateTotalVolume(entry.detailedSets, 'kg', isDuration);
                  
                  return (
                    <div key={entry.id} onClick={() => { startEditing(entry); }} className="bg-slate-800/30 border border-slate-800 rounded-2xl p-4 active:bg-slate-800 cursor-pointer">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="font-bold text-lg text-white block leading-tight">{entry.exerciseName}</span>
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 block">
                            容量: {vol}kg
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <div className="p-2 bg-slate-800 rounded-xl text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(entry.id); }} className="p-2 bg-slate-800 rounded-xl text-red-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {entry.detailedSets.map((s, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm">
                            <span className="text-slate-500 font-black w-8 shrink-0">#{i+1}</span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {s.isWarmup && (
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-500 border border-orange-500/30 uppercase shrink-0">
                                  熱身
                                </span>
                              )}
                              <span className="text-slate-300 font-bold">
                                {s.weight}{s.weightUnit} × {s.reps}{s.repsUnit === 'min' ? '分' : (s.repsUnit === 'sec' ? '秒' : '次')}
                                {s.isDropSet && (
                                  <span className="text-orange-500 ml-2 text-xs">
                                    ↓ {s.dropWeight}{s.weightUnit}×{s.dropReps}{s.repsUnit === 'min' ? '分' : (s.repsUnit === 'sec' ? '秒' : '次')}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-2">
                <button 
                  disabled={isSharing || filteredHistory.length === 0}
                  onClick={handleShare}
                  className={`w-full py-5 bg-blue-600 rounded-[1.5rem] text-white font-black flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-xl shadow-blue-900/40 disabled:opacity-50 ${isSharing ? 'animate-pulse' : ''}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6L15.4 5.4M15 5a3 3 0 116 0 3 3 0 01-6 0zm6 14a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {isSharing ? '正在準備分享...' : '分享本日訓練紀錄'}
                </button>
              </div>
            </div></div></div>, document.body
      )}
      {editingEntryId && editDraft && createPortal(
        <div className="fixed inset-0 z-[2500] flex flex-col p-6 animate-fade-in"><div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => window.history.back()}></div><div className="relative z-10 flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl animate-modal-pop"><header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0"><h3 className="text-xl font-black text-white">詳細訓練情形</h3><div className="flex gap-2"><button onClick={() => window.history.back()} className="px-4 py-2 bg-slate-800 rounded-xl text-slate-400 font-bold">取消</button><button onClick={saveEdit} className="px-4 py-2 bg-blue-600 rounded-xl text-white font-bold shadow-lg">儲存</button></div></header><div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar"><div className="mb-4"><div className="text-xs font-black text-slate-500 uppercase mb-1">動作</div><div className="text-xl font-black text-white">{editDraft.exerciseName}</div><div className="text-xs font-bold text-slate-500">{editDraft.date}</div></div><div className="space-y-3 pb-64">{editDraft.detailedSets.map((s, i) => (
                    <div key={s.id} className="bg-slate-800/30 border border-slate-800/50 rounded-2xl p-4 flex flex-col gap-3">
  <div className="flex justify-between items-center">
    <div className="flex items-center gap-3">
      <span className="text-xs font-black text-slate-500 uppercase">SET {i + 1}</span>
      <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
        <button 
          onClick={() => {
            const newSets = [...editDraft.detailedSets];
            newSets[i] = { ...newSets[i], isWarmup: true };
            setEditDraft({ ...editDraft, detailedSets: newSets });
          }} 
          className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all ${s.isWarmup ? 'bg-orange-500 text-white' : 'text-slate-500'}`}
        >熱身</button>
        <button 
          onClick={() => {
            const newSets = [...editDraft.detailedSets];
            newSets[i] = { ...newSets[i], isWarmup: false };
            setEditDraft({ ...editDraft, detailedSets: newSets });
          }} 
          className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all ${!s.isWarmup ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
        >正式</button>
      </div>
    </div>
    <button onClick={() => { const newSets = editDraft.detailedSets.filter(ds => ds.id !== s.id); setEditDraft({ ...editDraft, detailedSets: newSets }); }} className="text-red-500 text-xs font-bold px-2 py-1 bg-red-500/10 rounded-lg">刪除</button>
  </div>
  {!s.isWarmup && (<div className="flex items-center gap-2"><span className="text-[10px] text-slate-500 font-black uppercase">RIR</span><RirPicker value={s.rir} onChange={(v) => { const newSets = [...editDraft.detailedSets]; newSets[i] = { ...newSets[i], rir: v }; setEditDraft({ ...editDraft, detailedSets: newSets }); }} /></div>)}
  <div className="grid grid-cols-2 gap-3"><div onClick={() => handleInputClick(s.id, 'weight', s.weight)} className={`bg-slate-900 border-2 rounded-xl p-3 flex flex-col items-center justify-center transition-all ${activeInput?.setId === s.id && activeInput?.field === 'weight' ? 'border-blue-500 shadow-lg' : 'border-slate-800'}`}><span className="text-[10px] text-slate-500 font-black uppercase mb-1">重量 ({s.weightUnit})</span><span className="text-xl font-black text-white">{activeInput?.setId === s.id && activeInput?.field === 'weight' ? tempInput : s.weight}</span></div><div onClick={() => handleInputClick(s.id, 'reps', s.reps)} className={`bg-slate-900 border-2 rounded-xl p-3 flex flex-col items-center justify-center transition-all ${activeInput?.setId === s.id && activeInput?.field === 'reps' ? 'border-blue-500 shadow-lg' : 'border-slate-800'}`}><span className="text-[10px] text-slate-500 font-black uppercase mb-1">{s.repsUnit === 'min' ? '時長(分)' : (s.repsUnit === 'sec' ? '時長(秒)' : '次數')}</span><span className="text-xl font-black text-white">{activeInput?.setId === s.id && activeInput?.field === 'reps' ? tempInput : s.reps}</span></div></div></div>
                  ))}<button onClick={handleAddSet} className="w-full py-4 bg-slate-900 border-2 border-dashed border-slate-800 rounded-2xl text-blue-500 font-bold flex items-center justify-center gap-2 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>新增組數</button></div></div>{activeInput && (<div ref={keyboardRef} className="bg-slate-950 border-t border-slate-800 p-4 shrink-0 animate-slide-up z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"><NumericKeyboard onKeyPress={handleKeyPress} onClose={() => { setActiveInput(null); setTempInput(''); }} allowDecimal={true} /></div>)}</div></div>, document.body
      )}
      {deleteTarget && (<ConfirmModal title="刪除紀錄？" message="確定要刪除這筆訓練紀錄嗎？此動作無法復原。" onConfirm={() => { onDeleteHistory(deleteTarget); setDeleteTarget(null); setViewedDay(null); }} onCancel={() => setDeleteTarget(null)} />)}
      {confirmingExercise && (
        <WorkoutConfirmModal
          exercise={confirmingExercise}
          onConfirm={() => {
            const target = confirmingExercise;
            setConfirmingExercise(null);
            onStartExercise(target);
          }}
          onCancel={() => setConfirmingExercise(null)}
          onUpdatePhoto={(photoBase64) => {
            if (onUpdateExercisePhoto && confirmingExercise) {
              onUpdateExercisePhoto(confirmingExercise.id, photoBase64);
              setConfirmingExercise(prev => prev ? { ...prev, equipmentPhoto: photoBase64 } : null);
            }
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
