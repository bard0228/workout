import { Exercise, Category, Combo } from './types';

export const CATEGORIES: Category[] = ['全部', '腿部', '胸部', '背部', '肩膀', '手臂', '其他'];

export const DEFAULT_EXERCISES_VERSION = '20261013_v2';

export const DEFAULT_EXERCISES: Exercise[] = [
  // 背部
  { id: 'b1', name: '單手水平划船', category: '背部', mode: 'REPS', primaryMuscles: ['lats'], secondaryMuscles: ['teres', 'rhomboids', 'trapezius', 'rear_shoulders'] },
  { id: 'b2', name: '引體向上', category: '背部', mode: 'REPS', primaryMuscles: ['lats', 'teres'], secondaryMuscles: ['rhomboids', 'trapezius', 'rear_shoulders'] },
  { id: 'b3', name: '寬握水平划船', category: '背部', mode: 'REPS', primaryMuscles: ['rhomboids', 'trapezius', 'rear_shoulders'], secondaryMuscles: ['lats', 'teres'] },
  { id: 'b4', name: '窄握滑輪下拉', category: '背部', mode: 'REPS', primaryMuscles: ['lats', 'teres'], secondaryMuscles: ['rhomboids', 'trapezius'] },
  { id: 'b5', name: '寬握滑輪下拉', category: '背部', mode: 'REPS', primaryMuscles: ['lats', 'teres'], secondaryMuscles: ['rhomboids', 'trapezius', 'rear_shoulders', 'biceps'] },
  { id: 'b6', name: '窄握水平划船', category: '背部', mode: 'REPS', primaryMuscles: ['lats'], secondaryMuscles: ['teres', 'rhomboids', 'trapezius'] },
  { id: 'b7', name: '器械高位下拉', category: '背部', mode: 'REPS', primaryMuscles: ['lats', 'teres'], secondaryMuscles: ['rhomboids', 'trapezius', 'rear_shoulders'] },
  { id: 'b8', name: '器械低位上拉', category: '背部', mode: 'REPS', primaryMuscles: ['lats', 'teres'], secondaryMuscles: ['rhomboids', 'trapezius', 'rear_shoulders'] },
  { id: 'b9', name: '單手滑輪下拉', category: '背部', mode: 'REPS', primaryMuscles: ['lats'], secondaryMuscles: ['teres', 'biceps', 'forearms'] },
  { id: 'b10', name: '直臂下壓', category: '背部', mode: 'REPS', primaryMuscles: ['lats', 'teres'], secondaryMuscles: ['triceps_long', 'rear_shoulders'] },
  { id: 'b11', name: '器械俯身划船', category: '背部', mode: 'REPS', primaryMuscles: ['lats', 'rhomboids', 'trapezius'], secondaryMuscles: ['teres', 'rear_shoulders'] },
  { id: 'b12', name: '槓鈴俯身划船', category: '背部', mode: 'REPS', primaryMuscles: ['lats', 'rhomboids', 'trapezius'], secondaryMuscles: ['rear_shoulders', 'teres'] },
  // 腿部
  { id: 'l1', name: '坐姿腿彎舉', category: '腿部', mode: 'REPS', primaryMuscles: ['hamstrings'], secondaryMuscles: ['calves'] },
  { id: 'l2', name: '臀外展', category: '腿部', mode: 'REPS', primaryMuscles: ['gluteus_med'], secondaryMuscles: ['gluteus_max'] },
  { id: 'l3', name: '保加利亞分腿蹲', category: '腿部', mode: 'REPS', primaryMuscles: ['quads', 'gluteus_max'], secondaryMuscles: ['gluteus_med', 'hamstrings', 'adductors'] },
  { id: 'l4', name: '腿推機', category: '腿部', mode: 'REPS', primaryMuscles: ['quads', 'gluteus_max'], secondaryMuscles: ['hamstrings', 'adductors'] },
  { id: 'l5', name: '腿部內收', category: '腿部', mode: 'REPS', primaryMuscles: ['adductors'], secondaryMuscles: ['hamstrings', 'gluteus_max'] },
  { id: 'l6', name: '坐姿腿伸屈', category: '腿部', mode: 'REPS', primaryMuscles: ['quads'] },
  { id: 'l7', name: '站姿提踵', category: '腿部', mode: 'REPS', primaryMuscles: ['calves', 'soleus'] },
  { id: 'l8', name: '坐姿提踵', category: '腿部', mode: 'REPS', primaryMuscles: ['soleus'], secondaryMuscles: ['calves', 'front_calves'] },
  { id: 'l9', name: '槓鈴相撲硬舉', category: '腿部', mode: 'REPS', primaryMuscles: ['gluteus_max', 'quads', 'adductors'], secondaryMuscles: ['hamstrings'] },
  { id: 'l10', name: '器械後踢', category: '腿部', mode: 'REPS', primaryMuscles: ['gluteus_max'], secondaryMuscles: ['hamstrings'] },
  { id: 'l11', name: '哈克機', category: '腿部', mode: 'REPS', primaryMuscles: ['quads', 'gluteus_max'], secondaryMuscles: ['hamstrings', 'adductors'] },
  { id: 'l12', name: '器械腿後勾', category: '腿部', mode: 'REPS', primaryMuscles: ['hamstrings'], secondaryMuscles: ['calves'] },
  { id: 'l13', name: '槓鈴深蹲', category: '腿部', mode: 'REPS', primaryMuscles: ['quads', 'gluteus_max'], secondaryMuscles: ['adductors', 'hamstrings', 'gluteus_med'] },
  { id: 'l14', name: '羅馬尼亞硬舉', category: '腿部', mode: 'REPS', primaryMuscles: ['hamstrings', 'gluteus_max'], secondaryMuscles: ['adductors', 'lower_back'] },
  { id: 'l15', name: '傳統硬舉', category: '腿部', mode: 'REPS', primaryMuscles: ['gluteus_max', 'hamstrings', 'lower_back'], secondaryMuscles: ['quads', 'adductors'] },
  { id: 'l16', name: '羅馬椅挺身', category: '腿部', mode: 'REPS', primaryMuscles: ['lower_back', 'gluteus_max'], secondaryMuscles: ['hamstrings'] },
  { id: 'l17', name: '腰帶深蹲', category: '腿部', mode: 'REPS', primaryMuscles: ['quads', 'gluteus_max'], secondaryMuscles: ['hamstrings', 'adductors'] },
  { id: 'l18', name: '弓箭步蹲', category: '腿部', mode: 'REPS', primaryMuscles: ['quads', 'gluteus_max'], secondaryMuscles: ['gluteus_med', 'adductors', 'hamstrings'] },
  // 胸部
  { id: 'c1', name: '器械臥推', category: '胸部', mode: 'REPS', primaryMuscles: ['mid_chest'], secondaryMuscles: ['front_shoulders', 'triceps_lateral', 'triceps_long'] },
  { id: 'c2', name: '槓鈴臥推', category: '胸部', mode: 'REPS', primaryMuscles: ['mid_chest'], secondaryMuscles: ['front_shoulders', 'triceps_lateral', 'triceps_long'] },
  { id: 'c3', name: '啞鈴臥推', category: '胸部', mode: 'REPS', primaryMuscles: ['mid_chest'], secondaryMuscles: ['front_shoulders', 'triceps_lateral', 'triceps_long'] },
  { id: 'c4', name: '史密斯臥推', category: '胸部', mode: 'REPS', primaryMuscles: ['mid_chest'], secondaryMuscles: ['front_shoulders', 'triceps_lateral', 'triceps_long'] },
  { id: 'c5', name: '器械上胸推', category: '胸部', mode: 'REPS', primaryMuscles: ['upper_chest'], secondaryMuscles: ['front_shoulders', 'triceps_lateral', 'triceps_long'] },
  { id: 'c6', name: '槓鈴上胸推', category: '胸部', mode: 'REPS', primaryMuscles: ['upper_chest'], secondaryMuscles: ['front_shoulders', 'triceps_lateral', 'triceps_long'] },
  { id: 'c7', name: '啞鈴上胸推', category: '胸部', mode: 'REPS', primaryMuscles: ['upper_chest'], secondaryMuscles: ['front_shoulders', 'triceps_lateral', 'triceps_long'] },
  { id: 'c8', name: '史密斯上胸推', category: '胸部', mode: 'REPS', primaryMuscles: ['upper_chest'], secondaryMuscles: ['triceps_long', 'front_shoulders', 'triceps_lateral'] },
  { id: 'c9', name: '器械夾胸', category: '胸部', mode: 'REPS', primaryMuscles: ['mid_chest'], secondaryMuscles: ['front_shoulders', 'biceps'] },
  { id: 'c10', name: '繩索夾胸', category: '胸部', mode: 'REPS', primaryMuscles: ['mid_chest'], secondaryMuscles: ['front_shoulders', 'biceps'] },
  { id: 'c11', name: '輔助雙槓撐體', category: '胸部', mode: 'REPS', primaryMuscles: ['lower_chest'], secondaryMuscles: ['front_shoulders', 'triceps_lateral', 'triceps_long'] },
  { id: 'c12', name: '坐姿器械撐體', category: '胸部', mode: 'REPS', primaryMuscles: ['lower_chest', 'triceps_lateral'], secondaryMuscles: ['front_shoulders', 'triceps_long'] },
  { id: 'c13', name: '器械水平胸推', category: '胸部', mode: 'REPS', primaryMuscles: ['mid_chest'], secondaryMuscles: ['front_shoulders', 'triceps_lateral', 'triceps_long'] },
  { id: 'c14', name: '槓鈴下斜推', category: '胸部', mode: 'REPS', primaryMuscles: ['lower_chest'], secondaryMuscles: ['triceps_long', 'front_shoulders', 'triceps_lateral'] },
  { id: 'c15', name: '啞鈴下斜推', category: '胸部', mode: 'REPS', primaryMuscles: ['lower_chest'], secondaryMuscles: ['triceps_long', 'front_shoulders', 'triceps_lateral'] },
  // 肩部
  { id: 's1', name: '繩索側平舉', category: '肩膀', mode: 'REPS', primaryMuscles: ['lateral_deltoid'], secondaryMuscles: ['front_shoulders', 'trapezius'] },
  { id: 's2', name: '器械肩推', category: '肩膀', mode: 'REPS', primaryMuscles: ['front_shoulders'], secondaryMuscles: ['lateral_deltoid', 'upper_chest', 'triceps_lateral', 'triceps_long'] },
  { id: 's3', name: '啞鈴肩推', category: '肩膀', mode: 'REPS', primaryMuscles: ['front_shoulders'], secondaryMuscles: ['lateral_deltoid', 'upper_chest', 'triceps_lateral', 'triceps_long'] },
  { id: 's4', name: '槓鈴肩推', category: '肩膀', mode: 'REPS', primaryMuscles: ['front_shoulders'], secondaryMuscles: ['lateral_deltoid', 'upper_chest', 'triceps_lateral', 'triceps_long'] },
  { id: 's5', name: '史密斯肩推', category: '肩膀', mode: 'REPS', primaryMuscles: ['front_shoulders'], secondaryMuscles: ['lateral_deltoid', 'upper_chest', 'triceps_lateral', 'triceps_long'] },
  { id: 's6', name: '器械飛鳥', category: '肩膀', mode: 'REPS', primaryMuscles: ['lateral_deltoid'], secondaryMuscles: ['trapezius'] },
  { id: 's7', name: '臉拉', category: '肩膀', mode: 'REPS', primaryMuscles: ['rear_shoulders', 'rhomboids', 'teres'], secondaryMuscles: ['trapezius', 'lateral_deltoid'] },
  { id: 's8', name: '器械反向飛鳥', category: '肩膀', mode: 'REPS', primaryMuscles: ['rear_shoulders'], secondaryMuscles: ['rhomboids', 'trapezius', 'teres'] },
  { id: 's9', name: '繩索反向飛鳥', category: '肩膀', mode: 'REPS', primaryMuscles: ['rear_shoulders'], secondaryMuscles: ['rhomboids', 'trapezius', 'teres'] },
  // 手臂
  { id: 'a1', name: '器械二頭彎舉', category: '手臂', mode: 'REPS', primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'] },
  { id: 'a2', name: '啞鈴垂式彎舉', category: '手臂', mode: 'REPS', primaryMuscles: ['forearms', 'biceps'] },
  { id: 'a3', name: '啞鈴二頭彎舉', category: '手臂', mode: 'REPS', primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'] },
  { id: 'a4', name: '繩索垂式彎舉', category: '手臂', mode: 'REPS', primaryMuscles: ['forearms', 'biceps'] },
  { id: 'a5', name: '繩索二頭彎舉', category: '手臂', mode: 'REPS', primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'] },
  { id: 'a6', name: '繩索三頭下壓', category: '手臂', mode: 'REPS', primaryMuscles: ['triceps_lateral'], secondaryMuscles: ['triceps_long'] },
  { id: 'a7', name: '繩索過頭臂伸屈', category: '手臂', mode: 'REPS', primaryMuscles: ['triceps_long'], secondaryMuscles: ['triceps_lateral'] },
  { id: 'a8', name: '啞鈴過頭臂伸屈', category: '手臂', mode: 'REPS', primaryMuscles: ['triceps_long'], secondaryMuscles: ['triceps_lateral'] },
  { id: 'a9', name: '三頭伸展機', category: '手臂', mode: 'REPS', primaryMuscles: ['triceps_lateral', 'triceps_long'] },
  { id: 'a10', name: '手腕屈曲', category: '手臂', mode: 'REPS', primaryMuscles: ['forearms'] },
  // 其他
  { id: 'o1', name: '器械腹屈曲', category: '其他', mode: 'REPS', primaryMuscles: ['abs'], secondaryMuscles: ['obliques'] },
  { id: 'o2', name: '羅馬椅等長', category: '其他', mode: 'DURATION', primaryMuscles: ['lower_back', 'gluteus_max'], secondaryMuscles: ['hamstrings'] },
  { id: 'o3', name: '羅馬椅側屈曲', category: '其他', mode: 'REPS', primaryMuscles: ['obliques'], secondaryMuscles: ['lower_back', 'gluteus_med'] },
  { id: 'o4', name: '寬握主動懸吊', category: '其他', mode: 'DURATION', primaryMuscles: ['forearms', 'lats', 'rhomboids', 'trapezius'], secondaryMuscles: ['teres'] },
  { id: 'o5', name: '滑步機', category: '其他', mode: 'DURATION', primaryMuscles: ['quads', 'gluteus_max'] },
  { id: 'o6', name: '跑步機', category: '其他', mode: 'DURATION', primaryMuscles: ['quads', 'calves', 'soleus', 'hamstrings'], secondaryMuscles: ['gluteus_max', 'front_calves'] },
  { id: 'o7', name: '登階機', category: '其他', mode: 'DURATION', primaryMuscles: ['quads', 'gluteus_max'], secondaryMuscles: ['hamstrings', 'calves', 'soleus'] },
  { id: 'o8', name: '飛輪', category: '其他', mode: 'DURATION', primaryMuscles: ['quads', 'gluteus_max'], secondaryMuscles: ['hamstrings', 'calves', 'soleus', 'front_calves'] },
  { id: 'o9', name: '跪姿繩索捲腹', category: '其他', mode: 'REPS', primaryMuscles: ['abs'], secondaryMuscles: ['obliques'] },
  { id: 'o10', name: '仰臥起坐機', category: '其他', mode: 'REPS', primaryMuscles: ['abs'], secondaryMuscles: ['obliques'] },
  { id: 'o11', name: '側棒式', category: '其他', mode: 'DURATION', primaryMuscles: ['obliques'], secondaryMuscles: ['gluteus_med', 'lateral_deltoid', 'lower_back'] },
  { id: 'o12', name: '平板撐', category: '其他', mode: 'DURATION', primaryMuscles: ['abs'], secondaryMuscles: ['obliques', 'front_shoulders', 'quads', 'lower_back'] },
  { id: 'o13', name: '哥本哈根側棒式', category: '其他', mode: 'DURATION', primaryMuscles: ['adductors', 'obliques'], secondaryMuscles: ['gluteus_med', 'lower_back', 'abs', 'quads'] },
];

export const DEFAULT_COMBOS: Combo[] = [
  {
    id: 'def_combo_legs',
    name: '臀+腿',
    exerciseIds: ['l3', 'l1', 'l13', 'l9']
  },
  {
    id: 'def_combo_chest',
    name: '胸+肩',
    exerciseIds: ['c2', 'c5', 'c10', 's3', 's1', 's7']
  },
  {
    id: 'def_combo_back',
    name: '鬼背組合',
    exerciseIds: ['b2', 'b1', 'b5', 'b12', 'a6', 'a3']
  }
];

export const STORAGE_KEYS = {
  HISTORY: 'pro_fit_history',
  EXERCISES: 'pro_fit_exercises',
  COMBOS: 'pro_fit_combos',
  ACTIVE_SESSION: 'pro_fit_active_session'
};
