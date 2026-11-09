import { Category, Exercise } from '../types';

export type MuscleGroup =
  // Front
  | 'upper_chest'
  | 'mid_chest'
  | 'lower_chest'
  | 'front_shoulders'
  | 'lateral_deltoid'
  | 'biceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'quads'
  | 'front_calves'
  // Back
  | 'trapezius'
  | 'rhomboids'
  | 'teres'
  | 'lats'
  | 'rear_shoulders'
  | 'triceps_long'
  | 'triceps_lateral'
  | 'lower_back'
  | 'gluteus_med'
  | 'gluteus_max'
  | 'adductors'
  | 'hamstrings'
  | 'calves'
  | 'soleus'
  // Legacy aliases for backward compatibility
  | 'gastrocnemius'
  | 'chest'
  | 'triceps'
  | 'upper_back'
  | 'glutes'
  | 'shoulders';

export interface ExerciseMuscleInfo {
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  primaryLabel: string;
  secondaryLabel: string;
}

const MUSCLE_NAMES: Record<MuscleGroup, string> = {
  // Chest
  upper_chest: '上胸',
  mid_chest: '中胸',
  lower_chest: '下胸',
  chest: '胸大肌',
  // Deltoids
  front_shoulders: '前三角肌',
  lateral_deltoid: '三角肌中束',
  rear_shoulders: '後三角肌',
  shoulders: '三角肌',
  // Arms
  biceps: '肱二頭肌',
  triceps_long: '肱三頭肌(長頭)',
  triceps_lateral: '肱三頭肌(外側頭)',
  triceps: '肱三頭肌',
  forearms: '前臂肌群',
  // Core
  abs: '腹直肌',
  obliques: '腹斜肌',
  // Back
  trapezius: '斜方肌',
  rhomboids: '菱形肌',
  teres: '大小圓肌',
  lats: '闊背肌',
  upper_back: '上背肌群',
  lower_back: '下背豎脊肌',
  // Lower body
  gluteus_med: '臀中肌',
  gluteus_max: '臀大肌',
  glutes: '臀大肌',
  quads: '股四頭肌',
  adductors: '大腿內收肌群',
  hamstrings: '腿後腱肌群',
  front_calves: '小腿前側',
  calves: '小腿腓腸肌',
  gastrocnemius: '小腿腓腸肌',
  soleus: '比目魚肌',
};

export const FRONT_MUSCLES: { id: MuscleGroup; label: string }[] = [
  { id: 'upper_chest', label: '上胸' },
  { id: 'mid_chest', label: '中胸' },
  { id: 'lower_chest', label: '下胸' },
  { id: 'front_shoulders', label: '前三角肌' },
  { id: 'lateral_deltoid', label: '三角肌中束' },
  { id: 'biceps', label: '肱二頭肌' },
  { id: 'forearms', label: '前臂肌群' },
  { id: 'abs', label: '腹直肌' },
  { id: 'obliques', label: '腹斜肌' },
  { id: 'quads', label: '股四頭肌' },
  { id: 'front_calves', label: '小腿前側' },
];

export const BACK_MUSCLES: { id: MuscleGroup; label: string }[] = [
  { id: 'trapezius', label: '斜方肌' },
  { id: 'rhomboids', label: '菱形肌' },
  { id: 'teres', label: '大小圓肌' },
  { id: 'lats', label: '闊背肌' },
  { id: 'rear_shoulders', label: '後三角肌' },
  { id: 'lateral_deltoid', label: '三角肌中束' },
  { id: 'triceps_long', label: '肱三頭肌(長頭)' },
  { id: 'triceps_lateral', label: '肱三頭肌(外側頭)' },
  { id: 'forearms', label: '前臂肌群' },
  { id: 'lower_back', label: '下背豎脊肌' },
  { id: 'gluteus_med', label: '臀中肌' },
  { id: 'gluteus_max', label: '臀大肌' },
  { id: 'adductors', label: '大腿內收肌群' },
  { id: 'hamstrings', label: '腿後腱肌群' },
  { id: 'calves', label: '小腿腓腸肌' },
  { id: 'soleus', label: '比目魚肌' },
];

export function getMuscleName(group: MuscleGroup): string {
  return MUSCLE_NAMES[group] || group;
}

// Maps legacy composite muscle keys into subdivided ones
export function normalizeMuscles(list: MuscleGroup[]): MuscleGroup[] {
  const result: MuscleGroup[] = [];
  list.forEach(m => {
    if (m === 'chest') {
      result.push('upper_chest', 'mid_chest', 'lower_chest');
    } else if (m === 'triceps') {
      result.push('triceps_long', 'triceps_lateral');
    } else if (m === 'upper_back') {
      result.push('trapezius', 'rhomboids', 'teres');
    } else if (m === 'glutes') {
      result.push('gluteus_max', 'gluteus_med');
    } else if (m === 'shoulders') {
      result.push('front_shoulders', 'lateral_deltoid', 'rear_shoulders');
    } else if (m === 'gastrocnemius') {
      result.push('calves');
    } else {
      result.push(m);
    }
  });
  return Array.from(new Set(result));
}

/**
 * Intelligent detector that maps any exercise (default or custom)
 * to its subdivided active muscles.
 */
export function getExerciseMuscleInfo(exercise: Partial<Exercise>): ExerciseMuscleInfo {
  const name = (exercise.name || '').toLowerCase();
  const category: Category = exercise.category || '全部';

  // 1. Check custom primaryMuscles / targetMuscles if specified
  if ((exercise.primaryMuscles && exercise.primaryMuscles.length > 0) || (exercise.targetMuscles && exercise.targetMuscles.length > 0)) {
    const rawPrimary = (exercise.primaryMuscles || exercise.targetMuscles || []) as MuscleGroup[];
    const rawSecondary = (exercise.secondaryMuscles || []) as MuscleGroup[];
    const primary = normalizeMuscles(rawPrimary);
    const secondary = normalizeMuscles(rawSecondary).filter(g => !primary.includes(g));

    return {
      primary,
      secondary,
      primaryLabel: primary.map(g => MUSCLE_NAMES[g] || g).join('、'),
      secondaryLabel: secondary.map(g => MUSCLE_NAMES[g] || g).join('、')
    };
  }

  // 2. Keyword & Category heuristics with finely subdivided muscle groups

  // Chest category & exercises
  if (name.includes('上斜')) {
    return {
      primary: ['upper_chest'],
      secondary: ['front_shoulders', 'triceps_lateral'],
      primaryLabel: '上胸',
      secondaryLabel: '前三角肌、肱三頭肌(外側頭)'
    };
  }

  if (name.includes('下斜') || name.includes('雙槓')) {
    return {
      primary: ['lower_chest', 'triceps_long'],
      secondary: ['mid_chest', 'front_shoulders'],
      primaryLabel: '下胸、肱三頭肌(長頭)',
      secondaryLabel: '中胸、前三角肌'
    };
  }

  if (
    category === '胸部' ||
    name.includes('臥推') ||
    name.includes('胸推') ||
    name.includes('夾胸') ||
    name.includes('胸')
  ) {
    return {
      primary: ['mid_chest'],
      secondary: ['upper_chest', 'lower_chest', 'triceps_lateral', 'front_shoulders'],
      primaryLabel: '中胸',
      secondaryLabel: '上胸、下胸、肱三頭肌(外側頭)、前三角肌'
    };
  }

  // Back category & exercises
  if (name.includes('寬握') || name.includes('引體') || name.includes('高位下拉')) {
    return {
      primary: ['lats', 'teres'],
      secondary: ['biceps', 'rhomboids', 'trapezius'],
      primaryLabel: '闊背肌、大小圓肌',
      secondaryLabel: '肱二頭肌、菱形肌、斜方肌'
    };
  }

  if (name.includes('窄握') || name.includes('划船') || name.includes('低位')) {
    return {
      primary: ['lats', 'rhomboids'],
      secondary: ['biceps', 'trapezius', 'teres'],
      primaryLabel: '闊背肌、菱形肌',
      secondaryLabel: '肱二頭肌、斜方肌、大小圓肌'
    };
  }

  if (category === '背部') {
    return {
      primary: ['lats', 'trapezius', 'rhomboids'],
      secondary: ['biceps', 'teres', 'rear_shoulders'],
      primaryLabel: '闊背肌、斜方肌、菱形肌',
      secondaryLabel: '肱二頭肌、大小圓肌、後三角肌'
    };
  }

  // Shoulders - Deltoids
  if (name.includes('側平舉')) {
    return {
      primary: ['lateral_deltoid'],
      secondary: ['trapezius'],
      primaryLabel: '三角肌中束',
      secondaryLabel: '斜方肌'
    };
  }

  if (name.includes('飛鳥') && name.includes('反向') || name.includes('臉拉')) {
    return {
      primary: ['rear_shoulders', 'rhomboids'],
      secondary: ['trapezius', 'teres'],
      primaryLabel: '後三角肌、菱形肌',
      secondaryLabel: '斜方肌、大小圓肌'
    };
  }

  if (category === '肩膀' || name.includes('肩推')) {
    return {
      primary: ['front_shoulders', 'lateral_deltoid'],
      secondary: ['triceps_lateral', 'trapezius'],
      primaryLabel: '前三角肌、三角肌中束',
      secondaryLabel: '肱三頭肌(外側頭)、斜方肌'
    };
  }

  // Legs - Posterior chain & Glutes
  // Legs - Posterior chain & Glutes & Calves
  if (name.includes('內收') || name.includes('夾腿')) {
    return {
      primary: ['adductors'],
      secondary: ['quads'],
      primaryLabel: '大腿內收肌群',
      secondaryLabel: '股四頭肌'
    };
  }

  if (name.includes('坐姿提踵')) {
    return {
      primary: ['soleus'],
      secondary: ['calves'],
      primaryLabel: '比目魚肌',
      secondaryLabel: '小腿腓腸肌'
    };
  }

  if (name.includes('提踵')) {
    return {
      primary: ['calves', 'soleus'],
      secondary: ['front_calves'],
      primaryLabel: '小腿腓腸肌、比目魚肌',
      secondaryLabel: '小腿前側'
    };
  }

  if (name.includes('硬舉') || name.includes('rdl') || name.includes('腿彎舉') || name.includes('挺身')) {
    return {
      primary: ['hamstrings', 'gluteus_max'],
      secondary: ['adductors', 'gluteus_med', 'lower_back', 'calves'],
      primaryLabel: '腿後腱肌群、臀大肌',
      secondaryLabel: '大腿內收肌群、臀中肌、下背豎脊肌、小腿腓腸肌'
    };
  }

  if (name.includes('分腿蹲') || name.includes('臀推')) {
    return {
      primary: ['quads', 'gluteus_max', 'gluteus_med'],
      secondary: ['hamstrings', 'adductors'],
      primaryLabel: '股四頭肌、臀大肌、臀中肌',
      secondaryLabel: '腿後腱肌群、大腿內收肌群'
    };
  }

  if (category === '腿部' || name.includes('蹲') || name.includes('腿推') || name.includes('腿伸屈')) {
    return {
      primary: ['quads', 'gluteus_max'],
      secondary: ['gluteus_med', 'hamstrings', 'adductors', 'calves'],
      primaryLabel: '股四頭肌、臀大肌',
      secondaryLabel: '臀中肌、腿後腱肌群、大腿內收肌群、小腿腓腸肌'
    };
  }

  // Arms - Triceps long head vs lateral head
  if (name.includes('過頭') || name.includes('仰臥')) {
    return {
      primary: ['triceps_long'],
      secondary: ['triceps_lateral', 'forearms'],
      primaryLabel: '肱三頭肌(長頭)',
      secondaryLabel: '肱三頭肌(外側頭)、前臂肌群'
    };
  }

  if (name.includes('下壓') || name.includes('三頭')) {
    return {
      primary: ['triceps_lateral'],
      secondary: ['triceps_long', 'forearms'],
      primaryLabel: '肱三頭肌(外側頭)',
      secondaryLabel: '肱三頭肌(長頭)、前臂肌群'
    };
  }

  if (name.includes('二頭') || name.includes('彎舉')) {
    return {
      primary: ['biceps'],
      secondary: ['forearms'],
      primaryLabel: '肱二頭肌',
      secondaryLabel: '前臂肌群'
    };
  }

  // Core & Cardio
  if (name.includes('腹') || name.includes('懸吊') || name.includes('側屈')) {
    return {
      primary: ['abs'],
      secondary: ['obliques'],
      primaryLabel: '腹直肌',
      secondaryLabel: '腹斜肌'
    };
  }

  if (name.includes('跑') || name.includes('滑步') || name.includes('登階')) {
    return {
      primary: ['quads', 'calves'],
      secondary: ['gluteus_max', 'gluteus_med', 'hamstrings'],
      primaryLabel: '股四頭肌、小腿腓腸肌',
      secondaryLabel: '臀大肌、臀中肌、腿後腱肌群'
    };
  }

  // Fallback
  return {
    primary: ['mid_chest', 'quads', 'lats'],
    secondary: ['gluteus_max', 'abs'],
    primaryLabel: '中胸、股四頭肌、闊背肌',
    secondaryLabel: '臀大肌、腹直肌'
  };
}
