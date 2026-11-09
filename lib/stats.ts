import { Exercise, WorkoutHistoryEntry, SetData } from '../types';
import { LB_TO_KG } from './workout';
import { getMuscleName, FRONT_MUSCLES, BACK_MUSCLES } from './muscleMapping';

// e1RM（Epley）：有效次數 = reps + rir（rir 缺少視為 0）；排除熱身；lb 換 kg
export const setE1RMkg = (s: SetData): number | null => {
  if (s.isWarmup) return null;
  const w = (Number(s.weight) || 0) * ((s.weightUnit || 'kg') === 'lb' ? LB_TO_KG : 1);
  const reps = (Number(s.reps) || 0) + (typeof s.rir === 'number' ? s.rir : 0);
  if (w <= 0 || reps <= 0) return null;
  return reps === 1 ? w : w * (1 + reps / 30);
};

// 每次訓練（每天）的最佳 e1RM，依日期排序
export const e1rmSeries = (history: WorkoutHistoryEntry[], exName: string) => {
  const byDate: Record<string, number> = {};
  history.forEach(h => {
    if (h.exerciseName !== exName) return;
    h.detailedSets.forEach(s => {
      const v = setE1RMkg(s);
      if (v !== null && (!(h.date in byDate) || v > byDate[h.date])) byDate[h.date] = v;
    });
  });
  return Object.entries(byDate).map(([date, v]) => ({ date, weight: v })).sort((a, b) => a.date.localeCompare(b.date));
};

// 停滯：最近 3 次訓練的 e1RM 都沒有超過這 3 次之前的最佳值
export const isStagnant = (history: WorkoutHistoryEntry[], ex: Exercise) => {
  if (ex.mode === 'DURATION') return false;
  const s = e1rmSeries(history, ex.name);
  if (s.length < 4) return false;
  const prevBest = Math.max(...s.slice(0, -3).map(x => x.weight));
  return s.slice(-3).every(x => x.weight <= prevBest + 0.05);
};

const mondayOf = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// 各肌群每週有效組數：主要肌群 1、次要 0.5，排除熱身
export const weeklyMuscleSets = (history: WorkoutHistoryEntry[], exercises: Exercise[], weekOffset = 0) => {
  const start = mondayOf(new Date()); start.setDate(start.getDate() - 7 * weekOffset);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const from = ymd(start), to = ymd(end);
  const exByName = new Map(exercises.map(e => [e.name, e]));
  const totals: Record<string, number> = {};
  [...FRONT_MUSCLES, ...BACK_MUSCLES].forEach(m => { if (!(m.id in totals)) totals[m.id] = 0; });
  history.forEach(h => {
    if (h.date < from || h.date >= to) return;
    const ex = exByName.get(h.exerciseName); if (!ex) return;
    const n = h.detailedSets.filter(s => !s.isWarmup).length; if (!n) return;
    (ex.primaryMuscles || []).forEach(m => { totals[m] = (totals[m] || 0) + n; });
    (ex.secondaryMuscles || []).forEach(m => { totals[m] = (totals[m] || 0) + n * 0.5; });
  });
  return { from, to: ymd(new Date(end.getTime() - 86400000)), rows: Object.entries(totals).map(([m, v]) => ({ id: m, label: getMuscleName(m as any) || m, sets: v })).sort((a, b) => b.sets - a.sets) };
};
