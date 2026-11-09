
export type Category = '全部' | '腿部' | '胸部' | '背部' | '手臂' | '肩膀' | '其他';

export type RecordMode = 'REPS' | 'DURATION';

export interface SetData {
  id: string;
  weight: number;
  reps: number; // In DURATION mode, this represents seconds OR minutes based on repsUnit
  isWarmup?: boolean; // Added: Warm-up vs Working set
  isDropSet: boolean;
  dropWeight?: number;
  dropReps?: number;
  weightUnit?: 'kg' | 'lb'; // 'kg' or 'lb'
  repsUnit?: 'sec' | 'min'; // Added: 'sec' or 'min' for DURATION mode
  rir?: number | null; // RIR 0–5（5 代表 5+），null/缺少 = 未記錄
  restTime?: number; // Records the rest timer duration set after this set
  timestamp: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: Category;
  mode?: RecordMode; // Defaults to REPS if undefined
  equipmentPhoto?: string; // Compressed base64 JPEG data URL
  targetMuscles?: string[]; // Optional specific muscle groups
  primaryMuscles?: string[]; // Selected primary muscle groups
  secondaryMuscles?: string[]; // Selected secondary muscle groups
}

export interface Combo {
  id: string;
  name: string;
  exerciseIds: string[];
}

export interface WorkoutHistoryEntry {
  id: string;
  date: string; // ISO string for the specific workout date (yyyy-mm-dd)
  exerciseName: string;
  sets: string[]; // Formatted summary
  detailedSets: SetData[];
}

export enum View {
  DASHBOARD = 'DASHBOARD',
  WORKOUT_SESSION = 'WORKOUT_SESSION',
  REST_TIMER = 'REST_TIMER',
  COMBO_EDITOR = 'COMBO_EDITOR',
  EXERCISE_EDITOR = 'EXERCISE_EDITOR',
  STATISTICS = 'STATISTICS'
}
