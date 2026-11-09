import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RirPicker, rirLabel } from '../lib/rir';
import { isStagnant } from '../lib/stats';
import { createPortal } from 'react-dom';
import { Exercise, SetData, Category, WorkoutHistoryEntry } from '../types';
import { CATEGORIES } from '../constants';
import ConfirmModal from './ConfirmModal';
import NumericKeyboard from './NumericKeyboard';
import CalendarModal from './CalendarModal';
import { calculateTotalVolume } from '../lib/workout';

interface WorkoutSessionProps {
  exercise: Exercise;
  queue: Exercise[];
  exercises: Exercise[];
  isCalendarOpen: boolean;
  setIsCalendarOpen: (open: boolean) => void;
  onSwitchExercise: (ex: Exercise) => void;
  onAddExerciseToQueue: (ex: Exercise) => void;
  onUpdateSessionSet: (updatedSet: SetData) => void;
  onDeleteSessionSet: (setId: string) => void;
  setNumber: number;
  initialData: SetData;
  initialTimerSecs: number;
  sessionHistory: SetData[];
  fullHistory: WorkoutHistoryEntry[];
  onFinishSet: (data: SetData, timerSecs: number) => void;
  onEndExercise: () => void;
  onLeaveSession?: () => void;
  sessionDate: string;
  setSessionDate: (date: string) => void;
}

type ActiveField = 'weight' | 'reps' | 'dropWeight' | 'dropReps' | 'rest' | null;
type TimeUnit = 'sec' | 'min';

const WorkoutSession: React.FC<WorkoutSessionProps> = ({ 
  exercise, queue, exercises, isCalendarOpen, setIsCalendarOpen, onSwitchExercise, onAddExerciseToQueue, onUpdateSessionSet, onDeleteSessionSet, setNumber, initialData, initialTimerSecs, sessionHistory, fullHistory, onFinishSet, onEndExercise, onLeaveSession, sessionDate, setSessionDate
}) => {
  const [formData, setFormData] = useState<SetData>(initialData);
  const [timerSecs, setTimerSecs] = useState(initialTimerSecs);
  const [isDropSetEnabled, setIsDropSetEnabled] = useState(initialData.isDropSet || false);
  const [isWarmup, setIsWarmup] = useState(initialData.isWarmup || false);
  const [currentUnit, setCurrentUnit] = useState<'kg' | 'lb'>(initialData.weightUnit || 'kg');
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('sec');

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false); // 新增：控制已完成組數列表摺疊狀態
  const [isAddExModalOpen, setIsAddExModalOpen] = useState(false);
  const [addExFilter, setAddExFilter] = useState<Category>('全部');
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  
  // 編輯相關狀態
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [tempInput, setTempInput] = useState<string>(''); // 新增：用於輸入顯示的字串狀態
  const [isFirstInput, setIsFirstInput] = useState(true);

  // 用於自動滾動的 Refs
  const keyboard1Ref = useRef<HTMLDivElement>(null);
  const keyboard2Ref = useRef<HTMLDivElement>(null);
  const keyboard3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDropSetEnabled(initialData.isDropSet);
    if (initialData.weightUnit) setCurrentUnit(initialData.weightUnit);
    if (initialData.repsUnit) {
        setTimeUnit(initialData.repsUnit);
    } else {
        setTimeUnit('sec');
    }
    setTimerSecs(initialTimerSecs);
    setFormData(initialData);
    setIsWarmup(initialData.isWarmup || false);
    setIsDropSetEnabled(initialData.isDropSet || false);
    setActiveField(null);
    setEditingSetId(null);
    setTempInput('');
  }, [initialData, initialTimerSecs, exercise.id]); 

  useEffect(() => {
    if (activeField) {
      const activeRef = 
        (activeField === 'weight' || activeField === 'reps') ? keyboard1Ref :
        (activeField === 'dropWeight' || activeField === 'dropReps') ? keyboard2Ref :
        activeField === 'rest' ? keyboard3Ref : null;

      if (activeRef?.current) {
        setTimeout(() => {
          activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    }
  }, [activeField, editingSetId]);

  const toggleTimeUnit = () => {
    const newUnit = timeUnit === 'sec' ? 'min' : 'sec';
    let newValue = formData.reps;
    
    if (newUnit === 'min') {
        newValue = parseFloat((newValue / 60).toFixed(2));
    } else {
        newValue = Math.floor(newValue * 60);
    }

    setFormData(prev => ({ ...prev, reps: newValue }));
    setTimeUnit(newUnit);
  };

  const handleFinishSet = () => {
    onFinishSet({ 
      ...formData, 
      reps: formData.reps,
      isWarmup,
      isDropSet: isDropSetEnabled, 
      weightUnit: currentUnit, 
      repsUnit: isDurationMode ? timeUnit : undefined,
      timestamp: new Date().toISOString() 
    }, timerSecs);
  };

  // 啟動主數據編輯
  const startEditingMain = (field: ActiveField) => {
    setActiveField(field);
    setEditingSetId(null);
    
    let initialVal = 0;
    if (field === 'weight') initialVal = formData.weight;
    else if (field === 'reps') initialVal = formData.reps;
    else if (field === 'dropWeight') initialVal = formData.dropWeight || 0;
    else if (field === 'dropReps') initialVal = formData.dropReps || 0;
    else if (field === 'rest') initialVal = timerSecs;

    setTempInput(initialVal.toString());
    setIsFirstInput(true);
  };

  // 啟動歷史紀錄編輯
  const startEditingHistory = (setId: string, field: ActiveField) => {
    setEditingSetId(setId);
    setActiveField(field);
    
    const targetSet = sessionHistory.find(s => s.id === setId);
    let initialVal = 0;
    if (targetSet) {
        if (field === 'weight') initialVal = targetSet.weight;
        else if (field === 'reps') initialVal = targetSet.reps;
        else if (field === 'dropWeight') initialVal = targetSet.dropWeight || 0;
        else if (field === 'dropReps') initialVal = targetSet.dropReps || 0;
    }

    setTempInput(initialVal.toString());
    setIsFirstInput(true);
  };

  const handleKeyPress = (key: string) => {
    // 處理負號
    if (key === '-') {
        let newTemp = tempInput;
        if (newTemp.startsWith('-')) {
            newTemp = newTemp.slice(1);
        } else {
            newTemp = '-' + newTemp;
        }
        setTempInput(newTemp);
        
        // 解析並更新資料
        const numVal = parseFloat(newTemp) || 0;
        updateData(numVal);
        return;
    }

    // 處理數字與小數點
    let newVal = tempInput;
    if (isFirstInput) {
        newVal = key === '.' ? '0.' : key;
    } else {
        if (key === '.') {
            if (!newVal.includes('.')) newVal += '.';
        } else {
            newVal = (newVal === '0' || newVal === '-0') ? key : newVal + key;
        }
    }

    if (key === '刪除') {
        newVal = tempInput.length > 1 ? tempInput.slice(0, -1) : '0';
    }

    setIsFirstInput(false);
    setTempInput(newVal);

    // 解析並更新資料 (若是 - 或空值，這裡可能 parse 出 0 或 NaN，但 UI 顯示依賴 tempInput)
    const num = key === '刪除' && newVal === '-' ? 0 : (parseFloat(newVal) || 0);
    updateData(num);
  };

  const updateData = (val: number) => {
      if (editingSetId) {
         const targetSet = sessionHistory.find(s => s.id === editingSetId);
         if (targetSet && activeField) {
            onUpdateSessionSet({ ...targetSet, [activeField]: val });
         }
      } else {
         if (activeField === 'weight') setFormData(prev => ({ ...prev, weight: val }));
         else if (activeField === 'reps') setFormData(prev => ({ ...prev, reps: val }));
         else if (activeField === 'dropWeight') setFormData(prev => ({ ...prev, dropWeight: val }));
         else if (activeField === 'dropReps') setFormData(prev => ({ ...prev, dropReps: Math.floor(val) }));
         else if (activeField === 'rest') setTimerSecs(Math.floor(val));
      }
  };

  const filteredAddExercises = useMemo(() => {
    let res = exercises.filter(ex => !queue.some(q => q.id === ex.id));
    if (addExFilter !== '全部') res = res.filter(ex => ex.category === addExFilter);
    return res;
  }, [exercises, queue, addExFilter]);

  const isDurationMode = exercise.mode === 'DURATION';

  const currentVolume = useMemo(() => calculateTotalVolume(sessionHistory, currentUnit, isDurationMode), [sessionHistory, currentUnit, isDurationMode]);
  const previousVolume = useMemo(() => {
    // 1. Filter history for this exercise and exclude current session date
    const relevantHistory = fullHistory.filter(h => h.exerciseName === exercise.name && h.date !== sessionDate);
    if (relevantHistory.length === 0) return 0;

    // 2. Group by date to find the most recent training day
    const groupedByDate: Record<string, WorkoutHistoryEntry[]> = {};
    relevantHistory.forEach(h => {
      if (!groupedByDate[h.date]) groupedByDate[h.date] = [];
      groupedByDate[h.date].push(h);
    });

    // 3. Sort dates descending and pick the latest one
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const latestDate = sortedDates[0];
    const latestEntries = groupedByDate[latestDate];

    // 4. Sum volume for all entries on that latest date
    return latestEntries.reduce((acc, entry) => {
      return acc + calculateTotalVolume(entry.detailedSets, currentUnit, isDurationMode);
    }, 0);
  }, [fullHistory, exercise.name, currentUnit, isDurationMode, sessionDate]);

  const stagnant = useMemo(() => isStagnant(fullHistory.filter(h => h.date !== sessionDate), exercise), [fullHistory, exercise, sessionDate]);

  return (
    <div className="flex flex-col h-full bg-slate-950 relative overflow-hidden animate-fade-in overscroll-none">
      <div className="flex-1 p-6 overflow-y-auto no-scrollbar pb-64 overscroll-y-contain">
        <header className="mb-6 relative">
          <div className="flex justify-between items-start mb-2">
            <div className="text-blue-500 text-base font-black uppercase tracking-[0.15em] animate-pulse">訓練進行中</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsCalendarOpen(true)} className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 text-[10px] font-black transition-all active:scale-90">{sessionDate}</button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 active:scale-[0.98] transition-all">
                <span className="text-xl font-black text-white truncate mr-2">{exercise.name}</span>
                <svg className={`w-5 h-5 text-blue-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 9l6 6 6-6H6z" />
                </svg>
              </button>
              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-modal-pop">
                    {queue.map(ex => (
                      <button key={ex.id} onClick={() => { onSwitchExercise(ex); setIsDropdownOpen(false); }} className={`w-full text-left px-6 py-4 text-sm font-bold border-b border-slate-800 last:border-0 active:bg-blue-600 transition-colors ${ex.id === exercise.id ? 'text-blue-500' : 'text-slate-400'}`}>{ex.name}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setIsAddExModalOpen(true)} className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg active:scale-90 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg></button>
          </div>
          {stagnant && (
            <div className="mt-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-3 py-2 text-[11px] font-bold text-orange-400 animate-fade-in">⚠ 此動作連續 3 次 1RM 推算沒進步，可考慮調整重量、次數或休息</div>
          )}
        </header>

        {/* --- 已完成組數列表 --- */}
        {sessionHistory.length > 0 && (
          <section className="mb-8 space-y-2 animate-fade-in-up">
            <button 
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="flex items-center gap-2 w-full text-left px-1 group active:scale-[0.99] transition-all"
            >
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                本次已完成 ({sessionHistory.length})
              </h3>
              <div className={`p-0.5 rounded bg-slate-900 border border-slate-800 text-slate-600 transition-transform duration-300 ${isHistoryExpanded ? 'rotate-180' : ''}`}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </div>
            </button>
            
            <div className={`flex flex-col gap-2 overflow-hidden transition-all duration-300 ${isHistoryExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
              {sessionHistory.map((s, i) => {
                const isEditing = editingSetId === s.id;
                return (
                  <React.Fragment key={s.id}>
                    <div className={`bg-slate-900/30 border ${isEditing ? 'border-blue-500' : 'border-slate-800/50'} rounded-xl px-4 py-3 flex justify-between items-center group transition-colors`}>
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex flex-col items-start gap-1 shrink-0">
                          <span className="text-[10px] font-black text-slate-500">SET {i + 1}</span>
                          <span 
                            onClick={() => onUpdateSessionSet({ ...s, isWarmup: !s.isWarmup })}
                            className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase cursor-pointer select-none active:scale-95 duration-100 transition-all hover:opacity-85 ${s.isWarmup ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}
                            title="點擊快速切換 熱身 / 正式"
                          >
                            {s.isWarmup ? '熱身' : '正式'}
                          </span>
                        </div>
                        {isEditing ? (
                          <div className="flex flex-col gap-2 flex-1 items-end">
                             <div className="flex items-center gap-2">
                                <div onClick={() => startEditingHistory(s.id, 'weight')} className={`px-2 py-1 rounded bg-slate-900 border border-slate-700 min-w-[3rem] text-center ${activeField === 'weight' ? 'border-blue-500 text-blue-500' : 'text-white'}`}>
                                      {activeField === 'weight' ? tempInput : s.weight}
                                </div>
                                <span className="text-xs text-slate-500">{s.weightUnit}</span>
                                <span className="text-xs text-slate-500">×</span>
                                <div onClick={() => startEditingHistory(s.id, 'reps')} className={`px-2 py-1 rounded bg-slate-900 border border-slate-700 min-w-[3rem] text-center ${activeField === 'reps' ? 'border-blue-500 text-blue-500' : 'text-white'}`}>
                                      {activeField === 'reps' ? tempInput : s.reps}
                                </div>
                                <span className="text-xs text-slate-500">{s.repsUnit === 'min' ? '分' : (isDurationMode ? '秒' : '次')}</span>
                             </div>
                             {s.isDropSet && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-orange-500 font-bold">↓</span>
                                    <div onClick={() => startEditingHistory(s.id, 'dropWeight')} className={`px-2 py-1 rounded bg-slate-900 border border-slate-700 min-w-[3rem] text-center ${activeField === 'dropWeight' ? 'border-orange-500 text-orange-500' : 'text-white'}`}>
                                          {activeField === 'dropWeight' ? tempInput : (s.dropWeight || 0)}
                                    </div>
                                    <span className="text-xs text-slate-500">{s.weightUnit}</span>
                                    <span className="text-xs text-slate-500">×</span>
                                    <div onClick={() => startEditingHistory(s.id, 'dropReps')} className={`px-2 py-1 rounded bg-slate-900 border border-slate-700 min-w-[3rem] text-center ${activeField === 'dropReps' ? 'border-orange-500 text-orange-500' : 'text-white'}`}>
                                          {activeField === 'dropReps' ? tempInput : (s.dropReps || 0)}
                                    </div>
                                    <span className="text-xs text-slate-500">{s.repsUnit === 'min' ? '分' : (isDurationMode ? '秒' : '次')}</span>
                                </div>
                             )}
                             {!s.isWarmup && (<div className="flex items-center gap-2"><span className="text-[10px] text-slate-500 font-black">RIR</span><RirPicker value={s.rir} onChange={(v) => onUpdateSessionSet({ ...s, rir: v })} /></div>)}
                          </div>
                        ) : (
                          <div className="flex-1 text-right font-bold text-slate-200 cursor-pointer" onClick={() => startEditingHistory(s.id, 'weight')}>
                            {s.weight}{s.weightUnit} × {s.reps}{s.repsUnit === 'min' ? '分' : (isDurationMode ? '秒' : '次')}
                            {s.isDropSet && <span className="text-orange-500 ml-2 text-xs">↓ {s.dropWeight}{s.weightUnit}×{s.dropReps}{s.repsUnit === 'min' ? '分' : (isDurationMode ? '秒' : '次')}</span>}
                            {typeof s.rir === 'number' && <span className="text-blue-400 ml-2 text-xs">@RIR{rirLabel(s.rir)}</span>}
                          </div>
                        )}
                      </div>
                      {!isEditing && (
                        <button onClick={() => onDeleteSessionSet(s.id)} className="p-2 ml-2 text-slate-600 active:text-red-500 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                      {isEditing && (
                        <button onClick={() => { setEditingSetId(null); setActiveField(null); setTempInput(''); }} className="p-2 ml-2 text-blue-500 font-bold text-xs">OK</button>
                      )}
                    </div>
                    {isEditing && (
                      <div ref={keyboard1Ref} className="animate-slide-up pb-2">
                         <NumericKeyboard 
                            onKeyPress={handleKeyPress} 
                            onClose={() => { setActiveField(null); setEditingSetId(null); setTempInput(''); }} 
                            allowDecimal={
                                activeField === 'weight' || 
                                activeField === 'dropWeight' || 
                                ((activeField === 'reps' || activeField === 'dropReps') && isDurationMode && s.repsUnit === 'min')
                            } 
                         />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex flex-col gap-3 px-1">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <h3 className="text-2xl font-black text-white uppercase tracking-widest">第 {setNumber} 組數據</h3>
                <div className="text-xs font-black text-blue-500 mt-1">
                  容量：{Math.round(currentVolume * 10) / 10} / {Math.round(previousVolume * 10) / 10}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
                  <button onClick={() => setIsWarmup(true)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${isWarmup ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500'}`}>熱身</button>
                  <button onClick={() => setIsWarmup(false)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${!isWarmup ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>正式</button>
                </div>
                <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
                  {(['kg', 'lb'] as const).map(u => (
                    <button key={u} onClick={() => setCurrentUnit(u)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${currentUnit === u ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>{u}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div onClick={() => startEditingMain('weight')} className={`h-24 bg-slate-900 border-2 rounded-2xl flex flex-col items-center justify-center transition-all ${activeField === 'weight' && !editingSetId ? 'border-blue-500 bg-blue-600/5 scale-[1.02] shadow-2xl shadow-blue-500/10' : 'border-slate-800'}`}>
              <span className="text-[10px] font-black text-slate-500 uppercase mb-0.5">重量 ({currentUnit})</span>
              <span className="text-3xl font-black text-white">
                {activeField === 'weight' && !editingSetId ? tempInput : formData.weight}
              </span>
            </div>
            
            <div className="relative">
                <div onClick={() => startEditingMain('reps')} className={`h-24 bg-slate-900 border-2 rounded-2xl flex flex-col items-center justify-center transition-all ${activeField === 'reps' && !editingSetId ? 'border-blue-500 bg-blue-600/5 scale-[1.02] shadow-2xl shadow-blue-500/10' : 'border-slate-800'}`}>
                  <span className="text-[10px] font-black text-slate-500 uppercase mb-0.5">
                      {isDurationMode ? (timeUnit === 'min' ? '時長 (分)' : '時長 (秒)') : '次數'}
                  </span>
                  <span className="text-3xl font-black text-white">
                    {activeField === 'reps' && !editingSetId ? tempInput : formData.reps}
                  </span>
                </div>
                {isDurationMode && (
                    <button 
                        onClick={toggleTimeUnit}
                        className="absolute top-2 right-2 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[9px] font-black text-slate-400 active:scale-95 transition-all"
                    >
                        {timeUnit === 'sec' ? '轉分' : '轉秒'}
                    </button>
                )}
            </div>
          </div>

          {/* 鍵盤槽 1 - 只在非歷史編輯模式下顯示 */}
          {(activeField === 'weight' || activeField === 'reps') && !editingSetId && (
            <div ref={keyboard1Ref} className="animate-fade-in py-2">
              <NumericKeyboard 
                onKeyPress={handleKeyPress} 
                onClose={() => { setActiveField(null); setEditingSetId(null); setTempInput(''); }} 
                allowDecimal={activeField === 'weight' || (activeField === 'reps' && isDurationMode && timeUnit === 'min')} 
              />
            </div>
          )}

          <div className="flex items-center justify-between bg-slate-900/50 border border-slate-800 p-3.5 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDropSetEnabled ? 'bg-orange-500/10 text-orange-500' : 'bg-slate-800 text-slate-500'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
              </div>
              <span className="text-xs font-black text-slate-300">啟用遞減組 (Drop Set)</span>
            </div>
            <button onClick={() => setIsDropSetEnabled(!isDropSetEnabled)} className={`w-10 h-6 rounded-full relative transition-colors duration-300 ${isDropSetEnabled ? 'bg-orange-500' : 'bg-slate-700'}`}>
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isDropSetEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </button>
          </div>

          {isDropSetEnabled && (
            <>
              <div className="grid grid-cols-2 gap-3 animate-scale-in">
                <div onClick={() => startEditingMain('dropWeight')} className={`h-20 bg-slate-900/80 border-2 rounded-2xl flex flex-col items-center justify-center transition-all ${activeField === 'dropWeight' && !editingSetId ? 'border-orange-500 bg-orange-500/5 shadow-2xl shadow-orange-500/10' : 'border-slate-800'}`}>
                  <span className="text-[9px] font-black text-orange-500/70 uppercase mb-0.5">遞減重量</span>
                  <span className="text-2xl font-black text-white">
                    {activeField === 'dropWeight' && !editingSetId ? tempInput : (formData.dropWeight || 0)}
                  </span>
                </div>
                <div onClick={() => startEditingMain('dropReps')} className={`h-20 bg-slate-900/80 border-2 rounded-2xl flex flex-col items-center justify-center transition-all ${activeField === 'dropReps' && !editingSetId ? 'border-orange-500 bg-orange-500/5 shadow-2xl shadow-orange-500/10' : 'border-slate-800'}`}>
                  <span className="text-[9px] font-black text-orange-500/70 uppercase mb-0.5">遞減{isDurationMode ? '時長' : '次數'}</span>
                  <span className="text-2xl font-black text-white">
                    {activeField === 'dropReps' && !editingSetId ? tempInput : (formData.dropReps || 0)}
                  </span>
                </div>
              </div>
              {/* 鍵盤槽 2 - 只在非歷史編輯模式下顯示 */}
              {(activeField === 'dropWeight' || activeField === 'dropReps') && !editingSetId && (
                <div ref={keyboard2Ref} className="animate-fade-in py-2">
                  <NumericKeyboard 
                    onKeyPress={handleKeyPress} 
                    onClose={() => { setActiveField(null); setEditingSetId(null); setTempInput(''); }} 
                    allowDecimal={activeField === 'dropWeight'} 
                  />
                </div>
              )}
            </>
          )}

          <div className="space-y-3 pt-2">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">組間休息</h3>
            <div className="flex gap-2">
              <div onClick={() => startEditingMain('rest')} className={`flex-1 bg-slate-900 border-2 rounded-xl py-2.5 px-4 flex justify-between items-center transition-all ${activeField === 'rest' ? 'border-blue-500 shadow-2xl shadow-blue-500/10' : 'border-slate-800'}`}>
                <span className="text-[10px] font-black text-slate-400">休息秒數</span>
                <span className="text-lg font-black text-blue-500">
                    {activeField === 'rest' ? tempInput : timerSecs}s
                </span>
              </div>
              <div className="flex gap-1.5">
                {[60, 90, 120].map(s => (
                  <button key={s} onClick={() => setTimerSecs(s)} className={`px-3 rounded-xl text-[10px] font-black border transition-all ${timerSecs === s ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>{s}</button>
                ))}
              </div>
            </div>
            {/* 鍵盤槽 3 */}
            {activeField === 'rest' && (
              <div ref={keyboard3Ref} className="animate-fade-in py-2">
                <NumericKeyboard 
                  onKeyPress={handleKeyPress} 
                  onClose={() => setActiveField(null)} 
                  allowDecimal={false} 
                />
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800/50 z-50">
        <div className="flex flex-col gap-3">
          <button onClick={handleFinishSet} className="w-full bg-blue-600 py-5 rounded-3xl font-black text-xl shadow-2xl shadow-blue-900/40 active:scale-[0.98] transition-all text-white flex items-center justify-center gap-3">
            完成此組
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          </button>
          <button onClick={() => setIsConfirmingEnd(true)} className="w-full py-5 bg-slate-900 border-2 border-slate-800 rounded-3xl text-red-500 text-xl font-black active:scale-[0.98] transition-all">結束目前動作</button>
        </div>
      </div>

      {isAddExModalOpen && createPortal(
        <div className="fixed inset-0 z-[2000] flex flex-col p-6 animate-fade-in">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsAddExModalOpen(false)}></div>
          <div className="relative z-10 flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl animate-modal-pop">
            <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <h3 className="text-xl font-black text-white">臨時新增動作</h3>
              <button onClick={() => setIsAddExModalOpen(false)} className="p-2 bg-slate-800 rounded-xl text-slate-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </header>
            <div className="p-4 border-b border-slate-800 flex gap-2 overflow-x-auto no-scrollbar">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setAddExFilter(cat)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${addExFilter === cat ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{cat}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
              {filteredAddExercises.map(ex => (
                <button key={ex.id} onClick={() => { onAddExerciseToQueue(ex); onSwitchExercise(ex); setIsAddExModalOpen(false); }} className="w-full text-left p-5 bg-slate-800/50 border border-slate-800 rounded-2xl active:bg-blue-600 active:scale-[0.98] transition-all group">
                  <span className="text-[10px] font-black text-slate-500 uppercase block mb-1 group-active:text-blue-200">{ex.category}</span>
                  <span className="font-bold text-slate-200 group-active:text-white">{ex.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {isCalendarOpen && (
        <CalendarModal initialDate={sessionDate} onSelect={(date) => { setSessionDate(date); setIsCalendarOpen(false); }} onClose={() => setIsCalendarOpen(false)} />
      )}
      {isConfirmingEnd && (
        <ConfirmModal title="結束目前動作？" message="確定要結束這個動作的訓練嗎？剩餘清單內的動作將會保留。" onConfirm={() => { setIsConfirmingEnd(false); onEndExercise(); }} onCancel={() => setIsConfirmingEnd(false)} />
      )}
    </div>
  );
};

export default WorkoutSession;