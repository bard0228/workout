
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Exercise, WorkoutHistoryEntry, Category } from '../types';
import { CATEGORIES } from '../constants';
import { calculateTotalVolume, LB_TO_KG, KG_TO_LB } from '../lib/workout';
import { e1rmSeries, isStagnant, weeklyMuscleSets } from '../lib/stats';

// 趨勢圖組件
const TrendChart: React.FC<{ data: { date: string; weight: number }[], unit: string }> = ({ data, unit }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 初始載入時，自動捲動到最右邊（最新日期）
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-slate-600 text-xs italic border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
        尚未有足夠的數據產生圖表
      </div>
    );
  }

  // Chart Configuration
  const height = 200;
  const padding = { top: 30, bottom: 30, left: 20, right: 20 };
  const pointWidth = 70; // 每個資料點的寬度，確保 6 個點能塞滿手機螢幕寬度 (約 350-400px)
  
  // 計算總寬度：如果資料少於 6 筆，則撐滿容器；否則依資料量延伸
  const minWidth = "100%"; 
  const calculatedWidth = Math.max(data.length * pointWidth, 0); 
  
  // Y-Axis Range
  const weights = data.map(d => d.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const range = maxWeight - minWeight || 10; // Avoid division by zero
  const yBuffer = range * 0.2; // 20% buffer on top/bottom
  // Allow negative values for yMin
  const yMin = minWeight - yBuffer;
  const yMax = maxWeight + yBuffer;

  const getY = (w: number) => {
    return height - padding.bottom - ((w - yMin) / (yMax - yMin)) * (height - padding.top - padding.bottom);
  };

  // Generate SVG Path
  const points = data.map((d, i) => {
    const x = padding.left + i * pointWidth;
    const y = getY(d.weight);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div 
      className="w-full overflow-x-auto no-scrollbar bg-slate-900/50 rounded-2xl border border-slate-800 relative"
      ref={containerRef}
    >
      <div style={{ width: calculatedWidth, minWidth: minWidth, height: height }} className="relative">
        <svg width="100%" height="100%" className="overflow-visible">
          {/* Grid Lines (Optional, simple horizontal lines) */}
          <line x1="0" y1={getY(minWeight)} x2="100%" y2={getY(minWeight)} stroke="#1e293b" strokeWidth="1" strokeDasharray="4" />
          <line x1="0" y1={getY(maxWeight)} x2="100%" y2={getY(maxWeight)} stroke="#1e293b" strokeWidth="1" strokeDasharray="4" />

          {/* Trend Line */}
          <polyline
            points={points}
            fill="none"
            stroke="#3b82f6" // blue-500
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Gradient Area under line (Optional polish) */}
          <defs>
            <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            points={`${padding.left},${height} ${points} ${padding.left + (data.length - 1) * pointWidth},${height}`}
            fill="url(#chartGradient)"
          />

          {/* Data Points & Labels */}
          {data.map((d, i) => {
            const x = padding.left + i * pointWidth;
            const y = getY(d.weight);
            return (
              <g key={i}>
                {/* Point */}
                <circle cx={x} cy={y} r="4" fill="#1e293b" stroke="#60a5fa" strokeWidth="2" />
                
                {/* Value Label (Top) */}
                <text 
                  x={x} 
                  y={y - 12} 
                  textAnchor="middle" 
                  fill="#fff" 
                  fontSize="10" 
                  fontWeight="900"
                >
                  {d.weight}
                </text>

                {/* Date Label (Bottom) */}
                <text 
                  x={x} 
                  y={height - 10} 
                  textAnchor="middle" 
                  fill="#64748b" 
                  fontSize="9" 
                  fontWeight="bold"
                >
                  {d.date.slice(5).replace('-', '/')}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// Fixed: Added missing StatisticsProps interface
interface StatisticsProps {
  exercises: Exercise[];
  history: WorkoutHistoryEntry[];
  onBack: () => void;
}

const Statistics: React.FC<StatisticsProps> = ({ exercises, history, onBack }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>('全部');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statMode, setStatMode] = useState<'max' | 'volume' | 'e1rm'>('max');
  const [weekOffset, setWeekOffset] = useState(0);
  const weekly = useMemo(() => weeklyMuscleSets(history, exercises, weekOffset), [history, exercises, weekOffset]);
  const stagnantIds = useMemo(() => new Set(exercises.filter(ex => isStagnant(history, ex)).map(ex => ex.id)), [history, exercises]);
  const [displayUnit, setDisplayUnit] = useState<'kg' | 'lb'>('kg');

  // Filter Logic
  const filteredExercises = useMemo(() => {
    // 1. Calculate frequencies
    const frequencies: Record<string, number> = {};
    history.forEach(h => {
      frequencies[h.exerciseName] = (frequencies[h.exerciseName] || 0) + 1;
    });

    let result = [...exercises];
    
    // 2. Filter
    if (selectedCategory !== '全部') {
      result = result.filter(ex => ex.category === selectedCategory);
    }
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(ex => ex.name.toLowerCase().includes(lowerTerm));
    }

    // 3. Sort
    result.sort((a, b) => {
      // If "All" is selected, we maintain category order first
      if (selectedCategory === '全部') {
        const catIndexA = CATEGORIES.indexOf(a.category);
        const catIndexB = CATEGORIES.indexOf(b.category);
        if (catIndexA !== catIndexB) {
          return catIndexA - catIndexB;
        }
      }
      
      // Then sort by frequency (descending)
      const freqA = frequencies[a.name] || 0;
      const freqB = frequencies[b.name] || 0;
      
      if (freqB !== freqA) {
        return freqB - freqA;
      }
      
      // If frequency is the same, sort by name
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [exercises, history, selectedCategory, searchTerm]);

  // Data Preparation for Chart
  const getExerciseData = (ex: Exercise) => {
    const isDuration = ex.mode === 'DURATION';
    // 1. Filter history for this exercise
    if (statMode === 'e1rm') {
      const f = displayUnit === 'kg' ? 1 : KG_TO_LB;
      return e1rmSeries(history, ex.name).map(d => ({ date: d.date, weight: Math.round(d.weight * f * 10) / 10 }));
    }
    const relevantHistory = history.filter(h => h.exerciseName === ex.name);
    
    // 2. Group by date to sum volume or find max for the day
    const groupedByDate: Record<string, { date: string; weight: number }> = {};

    relevantHistory.forEach(entry => {
      const date = entry.date;
      if (statMode === 'volume') {
        const entryVolume = calculateTotalVolume(entry.detailedSets, displayUnit, isDuration);
        if (!groupedByDate[date]) {
          groupedByDate[date] = { date, weight: entryVolume };
        } else {
          groupedByDate[date].weight += entryVolume;
        }
      } else {
        let entryMax = -Infinity;
        entry.detailedSets.forEach(set => {
          if (set.isWarmup) return;
          let val = isDuration ? set.reps : set.weight;
          
          if (isDuration) {
            if (set.repsUnit === 'min') val *= 60;
          } else {
            const setUnit = set.weightUnit || 'kg';
            if (setUnit !== displayUnit) {
              if (displayUnit === 'kg') val *= LB_TO_KG;
              else val *= KG_TO_LB;
            }
          }
          if (val > entryMax) entryMax = val;
        });

        if (entryMax !== -Infinity) {
          if (!groupedByDate[date] || entryMax > groupedByDate[date].weight) {
            groupedByDate[date] = { date, weight: entryMax };
          }
        }
      }
    });

    // 3. Convert back to array and round values
    const processedData = Object.values(groupedByDate).map(d => ({
      ...d,
      weight: Math.round(d.weight * 10) / 10
    }));

    // 4. Sort by date ascending (old -> new)
    return processedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-slide-in-right">
      <div className="p-6 pb-2 border-b border-slate-800 bg-slate-950 z-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-white">訓練統計</h2>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
              {(['kg', 'lb'] as const).map(u => (
                <button key={u} onClick={() => setDisplayUnit(u)} className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${displayUnit === u ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500'}`}>{u}</button>
              ))}
            </div>
            <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
              <button 
                onClick={(e) => { e.stopPropagation(); setStatMode('max'); }} 
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${statMode === 'max' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}
              >
                最重
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setStatMode('volume'); }} 
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${statMode === 'volume' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}
              >
                容量
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setStatMode('e1rm'); }} 
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${statMode === 'e1rm' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}
              >
                1RM
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4 relative">
          <input 
            type="text" 
            placeholder="搜尋動作查看圖表..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-sm font-bold text-white placeholder-slate-600 focus:border-blue-500 outline-none transition-all"
          />
          <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setSearchTerm(''); }}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
                selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 no-scrollbar">
        {selectedCategory === '全部' && !searchTerm.trim() && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 animate-fade-in">
            <div className="flex justify-between items-center mb-3">
              <div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">各肌群每週有效組數</div>
                <div className="text-xs font-bold text-slate-400">{weekly.from.slice(5)} ~ {weekly.to.slice(5)}・建議 10–20 組</div>
              </div>
              <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
                <button onClick={() => setWeekOffset(o => o + 1)} className="px-2 py-1 rounded-lg text-[10px] font-black text-slate-400">‹</button>
                <button onClick={() => setWeekOffset(0)} className={`px-2 py-1 rounded-lg text-[10px] font-black ${weekOffset === 0 ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>本週</button>
                <button onClick={() => setWeekOffset(o => Math.max(0, o - 1))} className="px-2 py-1 rounded-lg text-[10px] font-black text-slate-400">›</button>
              </div>
            </div>
            {weekly.rows.length === 0 ? (
              <div className="text-xs text-slate-600 italic py-2">這週還沒有正式組紀錄</div>
            ) : (
              <div className="space-y-2">
                {weekly.rows.map(r => {
                  const color = r.sets < 10 ? 'bg-orange-500' : (r.sets <= 20 ? 'bg-blue-500' : 'bg-red-500');
                  return (
                    <div key={r.id} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-xs font-bold text-slate-300 truncate">{r.label}</span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full relative overflow-hidden">
                        <div className="absolute top-0 bottom-0 bg-slate-700/60" style={{ left: `${(10 / 25) * 100}%`, width: `${(10 / 25) * 100}%` }} />
                        <div className={`absolute top-0 bottom-0 left-0 ${color} rounded-full transition-all duration-300`} style={{ width: `${Math.min(r.sets / 25, 1) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right text-xs font-black text-white">{r.sets % 1 ? r.sets.toFixed(1) : r.sets}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {stagnantIds.size > 0 && selectedCategory === '全部' && !searchTerm.trim() && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl px-4 py-3 text-xs font-bold text-orange-400 animate-fade-in">
            ⚠ 停滯提醒：{exercises.filter(e => stagnantIds.has(e.id)).map(e => e.name).join('、')}（連續 3 次 1RM 推算沒進步）
          </div>
        )}
        {filteredExercises.map(ex => {
          const isExpanded = expandedId === ex.id;
          const chartData = isExpanded ? getExerciseData(ex) : [];
          const isDuration = ex.mode === 'DURATION';
          
          return (
            <div 
              key={ex.id}
              onClick={() => toggleExpand(ex.id)}
              className={`bg-slate-900 border rounded-3xl overflow-hidden transition-all duration-[400ms] ${
                isExpanded ? 'border-blue-500 shadow-xl shadow-blue-900/10' : 'border-slate-800 active:scale-[0.98]'
              }`}
            >
              <div className="p-5 flex justify-between items-center cursor-pointer">
                <div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{ex.category}</div>
                  <div className={`font-bold text-lg transition-colors ${isExpanded ? 'text-blue-400' : 'text-slate-200'}`}>
                    {ex.name}
                    {stagnantIds.has(ex.id) && <span className="ml-2 align-middle text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-500 border border-orange-500/30">停滯</span>}
                  </div>
                </div>
                <div className={`bg-slate-800 p-2 rounded-full text-slate-400 transition-transform duration-[400ms] ${isExpanded ? 'rotate-180 bg-blue-600 text-white' : ''}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              {/* Chart Content Area */}
              {isExpanded && (
                <div className="px-5 pb-6 animate-fade-in border-t border-slate-800/50 pt-4 bg-slate-950/30">
                  <div className="mb-3 flex justify-between items-end px-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase">
                      {statMode === 'e1rm'
                        ? `推算 1RM 趨勢 (${displayUnit.toUpperCase()})`
                        : statMode === 'volume' 
                        ? `總容量趨勢 (${displayUnit.toUpperCase()})` 
                        : (isDuration ? '最長時長趨勢 (秒)' : `最大重量趨勢 (${displayUnit.toUpperCase()})`)}
                    </span>
                    {chartData.length > 0 && (
                      <span className="text-[10px] font-black text-blue-500">
                        最新: {chartData[chartData.length - 1].weight}{isDuration && statMode === 'max' ? 's' : displayUnit}
                      </span>
                    )}
                  </div>
                  <TrendChart data={chartData} unit={isDuration && statMode === 'max' ? 's' : displayUnit} />
                  {chartData.length > 0 && (
                     <div className="text-center mt-3">
                        <p className="text-[10px] text-slate-600 animate-pulse">← 左右滑動查看歷史數據 →</p>
                     </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredExercises.length === 0 && (
          <div className="text-center py-20 text-slate-500 italic">
            無符合的訓練動作
          </div>
        )}
      </div>
    </div>
  );
};

export default Statistics;
