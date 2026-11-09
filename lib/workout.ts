
export const KG_TO_LB = 2.20462262;
export const LB_TO_KG = 0.45359237;

export interface SetData {
  id: string;
  weight: number;
  reps: number;
  isWarmup?: boolean;
  isDropSet: boolean;
  dropWeight?: number;
  dropReps?: number;
  weightUnit?: 'kg' | 'lb';
  repsUnit?: 'sec' | 'min';
}

export const calculateSetVolume = (s: SetData, targetUnit: 'kg' | 'lb', isDuration: boolean) => {
  if (s.isWarmup === true) return 0;

  const setUnit = s.weightUnit || 'kg';
  let weight = Number(s.weight) || 0;
  let dWeight = Number(s.dropWeight) || 0;

  // Normalize weight to target unit
  if (setUnit !== targetUnit) {
    if (targetUnit === 'kg') {
      weight *= LB_TO_KG;
      dWeight *= LB_TO_KG;
    } else {
      weight *= KG_TO_LB;
      dWeight *= KG_TO_LB;
    }
  }

  // Normalize reps/time
  let reps = Number(s.reps) || 0;
  let dReps = Number(s.dropReps) || 0;
  if (isDuration && s.repsUnit === 'min') {
    reps *= 60;
    dReps *= 60;
  }

  let vol = weight * reps;
  if (s.isDropSet && s.dropWeight && s.dropReps) {
    vol += dWeight * dReps;
  }
  return vol;
};

export const calculateTotalVolume = (sets: SetData[], targetUnit: 'kg' | 'lb', isDuration: boolean) => {
  const total = sets.reduce((acc, s) => acc + calculateSetVolume(s, targetUnit, isDuration), 0);
  return Math.round(total * 10) / 10;
};

export const getRecommendedCategory = (history: { date: string; exerciseName: string }[], exercises: { name: string; category: string }[]): string => {
  const targetCategories = ['胸部', '背部', '腿部'];
  
  // 建立動作名稱到類別的快速查找表
  const exerciseToCategory = new Map<string, string>();
  exercises.forEach(ex => {
    exerciseToCategory.set(ex.name.trim(), ex.category);
  });
  
  // 取得今天日期字串 (YYYY-MM-DD)
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  // 取得所有唯一日期並排序 (由新到舊)，排除今天
  const uniqueDates = (Array.from(new Set(history.map(h => h.date))) as string[])
    .filter(date => date !== today)
    .sort((a, b) => b.localeCompare(a));
  
  // 找出最近兩次「包含核心部位(胸背腿)」的訓練日
  const lastTwoTargetSessions: string[][] = [];
  for (const date of uniqueDates) {
    const entries = history.filter(h => h.date === date);
    // 找出該天練到的核心部位
    const sessionTargets: string[] = Array.from(new Set(
      entries.map(e => exerciseToCategory.get(e.exerciseName.trim()))
             .filter((cat): cat is string => !!cat && targetCategories.includes(cat))
    ));
    
    // 如果這天有練到核心部位，才計入追溯
    if (sessionTargets.length > 0) {
      lastTwoTargetSessions.push(sessionTargets);
      if (lastTwoTargetSessions.length === 2) break;
    }
  }

  if (lastTwoTargetSessions.length === 2) {
    const [last1, last2] = lastTwoTargetSessions;
    const combined = new Set([...last1, ...last2]);
    
    if (combined.size >= 2) {
      // 情況 A: 兩次練了不同的部位 -> 推薦剩下的那個
      const remaining = targetCategories.filter(c => !combined.has(c));
      if (remaining.length > 0) return remaining[0];
      return targetCategories[0];
    } else {
      // 情況 B: 兩次練了同一個部位 -> 推薦另外兩個之一
      const trained = Array.from(combined)[0];
      const others = targetCategories.filter(c => c !== trained);
      return others[0] || targetCategories[0];
    }
  } else if (lastTwoTargetSessions.length === 1) {
    // 情況 C: 只有一次紀錄 -> 推薦另外兩個核心部位之一
    const trained = lastTwoTargetSessions[0];
    const others = targetCategories.filter(c => !trained.includes(c));
    return others[0] || targetCategories[0];
  }

  // 情況 D: 無紀錄 -> 預設胸部
  return targetCategories[0];
};
