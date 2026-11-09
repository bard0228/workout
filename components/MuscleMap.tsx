import React, { useMemo } from 'react';
import { Exercise } from '../types';
import { getExerciseMuscleInfo, MuscleGroup } from '../lib/muscleMapping';

interface MuscleMapProps {
  exercise?: Partial<Exercise>;
  primaryMuscles?: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  variant?: 'compact' | 'modal' | 'large' | 'interactive';
  className?: string;
  showLabels?: boolean;
  interactive?: boolean;
  onMuscleClick?: (group: MuscleGroup) => void;
}

export const MuscleMap: React.FC<MuscleMapProps> = ({
  exercise = {},
  primaryMuscles,
  secondaryMuscles,
  variant = 'compact',
  className = '',
  showLabels = true,
  interactive = false,
  onMuscleClick,
}) => {
  const isInteractive = interactive || variant === 'interactive';

  const muscleInfo = useMemo(() => {
    if (primaryMuscles) {
      return {
        primary: primaryMuscles,
        secondary: secondaryMuscles || [],
        primaryLabel: '',
        secondaryLabel: '',
      };
    }
    return getExerciseMuscleInfo(exercise);
  }, [exercise, primaryMuscles, secondaryMuscles]);

  const activeSet = useMemo(() => new Set(muscleInfo.primary), [muscleInfo.primary]);
  const secondarySet = useMemo(() => new Set(muscleInfo.secondary), [muscleInfo.secondary]);

  // Color mapping:
  // Inactive: #334155 (slate-700)
  // Primary: #0d9488 (Teal)
  // Secondary: #0284c7 (Sky Blue)
  const getFill = (group: MuscleGroup) => {
    if (activeSet.has(group)) {
      return '#0d9488';
    }
    if (secondarySet.has(group)) {
      return '#0284c7';
    }
    return '#334155';
  };

  const getStroke = (group: MuscleGroup) => {
    if (activeSet.has(group)) {
      return '#2dd4bf';
    }
    if (secondarySet.has(group)) {
      return '#38bdf8';
    }
    return isInteractive ? '#475569' : '#1e293b';
  };

  const handlePartClick = (group: MuscleGroup) => {
    if (isInteractive && onMuscleClick) {
      onMuscleClick(group);
    }
  };

  const partClass = isInteractive
    ? 'cursor-pointer hover:opacity-85 hover:filter hover:brightness-125 transition-all select-none'
    : '';

  const neutralMuscle = '#475569';
  const neutralStroke = '#334155';

  const FRONT_MUSCLE_Y_MAP: Record<string, [number, number]> = {
    upper_chest: [24, 31],
    mid_chest: [30, 36],
    lower_chest: [35, 41],
    chest: [24, 41],
    front_shoulders: [25, 40],
    lateral_deltoid: [26, 40],
    biceps: [40, 55],
    forearms: [55, 76],
    abs: [40, 58],
    obliques: [41, 58],
    quads: [61, 97],
    front_calves: [100, 135],
  };

  const BACK_MUSCLE_Y_MAP: Record<string, [number, number]> = {
    trapezius: [20, 35],
    rhomboids: [30, 41],
    teres: [31, 41],
    upper_back: [20, 41],
    rear_shoulders: [25, 40],
    lateral_deltoid: [26, 40],
    triceps_long: [40, 55],
    triceps_lateral: [40, 55],
    triceps: [40, 55],
    forearms: [55, 76],
    lats: [38, 55],
    lower_back: [48, 61],
    gluteus_med: [58, 66],
    gluteus_max: [65, 75],
    glutes: [58, 75],
    adductors: [74, 98],
    hamstrings: [74, 98],
    calves: [101, 120],
    gastrocnemius: [101, 120],
    soleus: [116, 135],
  };

  if (variant === 'compact') {
    // 1. Determine dominant side (Front vs Back) based on active/secondary muscle weights
    let frontScore = 0;
    let backScore = 0;
    muscleInfo.primary.forEach(m => {
      if (FRONT_MUSCLE_Y_MAP[m]) frontScore += 3;
      if (BACK_MUSCLE_Y_MAP[m]) backScore += 3;
    });
    muscleInfo.secondary.forEach(m => {
      if (FRONT_MUSCLE_Y_MAP[m]) frontScore += 1;
      if (BACK_MUSCLE_Y_MAP[m]) backScore += 1;
    });

    const category = (exercise as Partial<Exercise>)?.category || '';
    let displaySide: 'front' | 'back' = 'front';
    if (category === '背部' || backScore > frontScore) {
      displaySide = 'back';
    } else {
      displaySide = 'front';
    }

    // 2. Find vertical bounding box of active muscles on the displayed side
    const yMap = displaySide === 'front' ? FRONT_MUSCLE_Y_MAP : BACK_MUSCLE_Y_MAP;
    const activeGroupsOnSide = [...muscleInfo.primary, ...muscleInfo.secondary].filter(m => yMap[m]);

    let minY = 18;
    let maxY = 55;
    if (activeGroupsOnSide.length > 0) {
      minY = Math.min(...activeGroupsOnSide.map(m => yMap[m][0]));
      maxY = Math.max(...activeGroupsOnSide.map(m => yMap[m][1]));
    }

    // 3. Calculate 1:1 square viewBox zoomed in to the local target region
    const span = maxY - minY;
    const centerY = (minY + maxY) / 2;
    const boxSize = Math.max(50, Math.min(68, span + 12));
    const viewBoxX = 30 - boxSize / 2;
    const rawViewBoxY = centerY - boxSize / 2;
    const viewBoxY = Math.max(2, Math.min(142 - boxSize, rawViewBoxY));

    return (
      <div className={`relative flex items-center justify-center select-none w-full h-full ${className}`}>
        <svg
          viewBox={`${viewBoxX} ${viewBoxY} ${boxSize} ${boxSize}`}
          className="w-full h-full overflow-hidden drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {displaySide === 'front' ? (
            <g>
              {/* Head & Neck */}
              <circle cx="30" cy="11" r="7" fill={neutralMuscle} stroke={neutralStroke} strokeWidth="1" />
              <path d="M28 18 H32 V24 H28 Z" fill={neutralMuscle} />

              {/* Front & Lateral Deltoids */}
              <path d="M17 26 C15 30 15 35 18 39 C20 36 21 30 20 26 Z" fill={getFill('front_shoulders')} stroke={getStroke('front_shoulders')} strokeWidth="0.8" />
              <path d="M43 26 C45 30 45 35 42 39 C40 36 39 30 40 26 Z" fill={getFill('front_shoulders')} stroke={getStroke('front_shoulders')} strokeWidth="0.8" />
              <path d="M14 27 C12 30 12 35 15 39 C16 35 16 30 15 27 Z" fill={getFill('lateral_deltoid')} stroke={getStroke('lateral_deltoid')} strokeWidth="0.8" />
              <path d="M46 27 C48 30 48 35 45 39 C44 35 44 30 45 27 Z" fill={getFill('lateral_deltoid')} stroke={getStroke('lateral_deltoid')} strokeWidth="0.8" />

              {/* Pecs subdivided: Upper, Mid, Lower */}
              <path d="M22 26 C25 25 29 26 29 30 C25 30 22 30 21 28 Z" fill={getFill('upper_chest')} stroke={getStroke('upper_chest')} strokeWidth="0.8" />
              <path d="M38 26 C35 25 31 26 31 30 C35 30 38 30 39 28 Z" fill={getFill('upper_chest')} stroke={getStroke('upper_chest')} strokeWidth="0.8" />
              <path d="M21 31 C25 32 29 32 29 35 C25 35 21 35 20 33 Z" fill={getFill('mid_chest')} stroke={getStroke('mid_chest')} strokeWidth="0.8" />
              <path d="M39 31 C35 32 31 32 31 35 C35 35 39 35 40 33 Z" fill={getFill('mid_chest')} stroke={getStroke('mid_chest')} strokeWidth="0.8" />
              <path d="M20 36 C25 37 29 37 29 39 C24 40 21 39 19 37 Z" fill={getFill('lower_chest')} stroke={getStroke('lower_chest')} strokeWidth="0.8" />
              <path d="M40 36 C35 37 31 37 31 39 C36 40 39 39 41 37 Z" fill={getFill('lower_chest')} stroke={getStroke('lower_chest')} strokeWidth="0.8" />

              {/* Biceps */}
              <path d="M14 41 C12 46 13 52 16 54 C17 50 17 45 15 41 Z" fill={getFill('biceps')} stroke={getStroke('biceps')} strokeWidth="0.8" />
              <path d="M46 41 C48 46 47 52 44 54 C43 50 43 45 45 41 Z" fill={getFill('biceps')} stroke={getStroke('biceps')} strokeWidth="0.8" />

              {/* Forearms */}
              <path d="M13 56 C10 64 9 73 12 76 C14 73 15 65 15 56 Z" fill={getFill('forearms')} stroke={getStroke('forearms')} strokeWidth="0.8" />
              <path d="M47 56 C50 64 51 73 48 76 C46 73 45 65 45 56 Z" fill={getFill('forearms')} stroke={getStroke('forearms')} strokeWidth="0.8" />

              {/* Abs */}
              <rect x="26" y="41" width="3.5" height="4.5" rx="1" fill={getFill('abs')} stroke={getStroke('abs')} strokeWidth="0.6" />
              <rect x="30.5" y="41" width="3.5" height="4.5" rx="1" fill={getFill('abs')} stroke={getStroke('abs')} strokeWidth="0.6" />
              <rect x="26" y="47" width="3.5" height="4.5" rx="1" fill={getFill('abs')} stroke={getStroke('abs')} strokeWidth="0.6" />
              <rect x="30.5" y="47" width="3.5" height="4.5" rx="1" fill={getFill('abs')} stroke={getStroke('abs')} strokeWidth="0.6" />
              <rect x="26" y="53" width="3.5" height="4.5" rx="1" fill={getFill('abs')} stroke={getStroke('abs')} strokeWidth="0.6" />
              <rect x="30.5" y="53" width="3.5" height="4.5" rx="1" fill={getFill('abs')} stroke={getStroke('abs')} strokeWidth="0.6" />

              {/* Obliques */}
              <path d="M21 42 C23 49 24 55 25 58 C22 55 20 49 21 42 Z" fill={getFill('obliques')} stroke={getStroke('obliques')} strokeWidth="0.6" />
              <path d="M39 42 C37 49 36 55 35 58 C38 55 40 49 39 42 Z" fill={getFill('obliques')} stroke={getStroke('obliques')} strokeWidth="0.6" />

              {/* Quads */}
              <path d="M22 62 C19 72 20 88 23 96 C26 95 28 85 28 64 Z" fill={getFill('quads')} stroke={getStroke('quads')} strokeWidth="1" />
              <path d="M38 62 C41 72 40 88 37 96 C34 95 32 85 32 64 Z" fill={getFill('quads')} stroke={getStroke('quads')} strokeWidth="1" />

              {/* Front Shins / Calves */}
              <path d="M22 101 C20 112 21 125 24 134 C26 130 26 115 25 101 Z" fill={getFill('front_calves')} stroke={getStroke('front_calves')} strokeWidth="0.8" />
              <path d="M38 101 C40 112 39 125 36 134 C34 130 34 115 35 101 Z" fill={getFill('front_calves')} stroke={getStroke('front_calves')} strokeWidth="0.8" />
            </g>
          ) : (
            <g>
              {/* Head & Neck */}
              <circle cx="30" cy="11" r="7" fill={neutralMuscle} stroke={neutralStroke} strokeWidth="1" />
              <path d="M28 18 H32 V24 H28 Z" fill={neutralMuscle} />

              {/* Trapezius */}
              <path d="M24 23 C28 21 32 21 36 23 C34 29 31 33 30 35 C29 33 26 29 24 23 Z" fill={getFill('trapezius')} stroke={getStroke('trapezius')} strokeWidth="0.8" />

              {/* Rhomboids */}
              <path d="M26 31 C29 32 29 39 27 40 C25 36 25 33 26 31 Z" fill={getFill('rhomboids')} stroke={getStroke('rhomboids')} strokeWidth="0.6" />
              <path d="M34 31 C31 32 31 39 33 40 C35 36 35 33 34 31 Z" fill={getFill('rhomboids')} stroke={getStroke('rhomboids')} strokeWidth="0.6" />

              {/* Teres (大小圓肌) */}
              <path d="M21 32 C24 33 24 38 22 40 C19 37 20 34 21 32 Z" fill={getFill('teres')} stroke={getStroke('teres')} strokeWidth="0.6" />
              <path d="M39 32 C36 33 36 38 38 40 C41 37 40 34 39 32 Z" fill={getFill('teres')} stroke={getStroke('teres')} strokeWidth="0.6" />

              {/* Rear Deltoids & Lateral Deltoid */}
              <path d="M17 26 C15 30 15 35 18 39 C20 36 21 30 20 26 Z" fill={getFill('rear_shoulders')} stroke={getStroke('rear_shoulders')} strokeWidth="0.8" />
              <path d="M43 26 C45 30 45 35 42 39 C40 36 39 30 40 26 Z" fill={getFill('rear_shoulders')} stroke={getStroke('rear_shoulders')} strokeWidth="0.8" />
              <path d="M14 27 C12 30 12 35 15 39 C16 35 16 30 15 27 Z" fill={getFill('lateral_deltoid')} stroke={getStroke('lateral_deltoid')} strokeWidth="0.8" />
              <path d="M46 27 C48 30 48 35 45 39 C44 35 44 30 45 27 Z" fill={getFill('lateral_deltoid')} stroke={getStroke('lateral_deltoid')} strokeWidth="0.8" />

              {/* Triceps: Lateral head & Long head */}
              <path d="M13 41 C12 46 12 52 15 54 C16 50 16 45 14 41 Z" fill={getFill('triceps_lateral')} stroke={getStroke('triceps_lateral')} strokeWidth="0.7" />
              <path d="M47 41 C48 46 48 52 45 54 C44 50 44 45 46 41 Z" fill={getFill('triceps_lateral')} stroke={getStroke('triceps_lateral')} strokeWidth="0.7" />
              <path d="M15 41 C17 46 17 51 16 54 C18 53 19 48 18 41 Z" fill={getFill('triceps_long')} stroke={getStroke('triceps_long')} strokeWidth="0.7" />
              <path d="M45 41 C43 46 43 51 44 54 C42 53 41 48 42 41 Z" fill={getFill('triceps_long')} stroke={getStroke('triceps_long')} strokeWidth="0.7" />

              {/* Forearms */}
              <path d="M13 56 C10 64 9 73 12 76 C14 73 15 65 15 56 Z" fill={getFill('forearms')} stroke={getStroke('forearms')} strokeWidth="0.7" />
              <path d="M47 56 C50 64 51 73 48 76 C46 73 45 65 45 56 Z" fill={getFill('forearms')} stroke={getStroke('forearms')} strokeWidth="0.7" />

              {/* Lats */}
              <path d="M21 40 C26 42 27 47 26 54 C22 50 20 44 21 40 Z" fill={getFill('lats')} stroke={getStroke('lats')} strokeWidth="1" />
              <path d="M39 40 C34 42 33 47 34 54 C38 50 40 44 39 40 Z" fill={getFill('lats')} stroke={getStroke('lats')} strokeWidth="1" />

              {/* Lower Back */}
              <path d="M27 49 C28 54 28 57 28 60 H32 C32 57 32 54 33 49 Z" fill={getFill('lower_back')} stroke={getStroke('lower_back')} strokeWidth="0.7" />

              {/* Gluteus Medius (臀中肌) */}
              <path d="M19 60 C23 59 27 61 25 65 C21 65 19 63 19 60 Z" fill={getFill('gluteus_med')} stroke={getStroke('gluteus_med')} strokeWidth="0.8" />
              <path d="M41 60 C37 59 33 61 35 65 C39 65 41 63 41 60 Z" fill={getFill('gluteus_med')} stroke={getStroke('gluteus_med')} strokeWidth="0.8" />

              {/* Gluteus Maximus (臀大肌) */}
              <path d="M20 66 C23 66 29 67 29 74 C24 74 20 71 20 66 Z" fill={getFill('gluteus_max')} stroke={getStroke('gluteus_max')} strokeWidth="1" />
              <path d="M40 66 C37 66 31 67 31 74 C36 74 40 71 40 66 Z" fill={getFill('gluteus_max')} stroke={getStroke('gluteus_max')} strokeWidth="1" />

              {/* 腿後腱肌群 (Hamstrings) & 大腿內收肌群 (Adductors) */}
              <path d="M22 75 C20 84 21 93 24.5 97 C26 93 26 84 26 75 Z" fill={getFill('hamstrings')} stroke={getStroke('hamstrings')} strokeWidth="0.8" />
              <path d="M38 75 C40 84 39 93 35.5 97 C34 93 34 84 34 75 Z" fill={getFill('hamstrings')} stroke={getStroke('hamstrings')} strokeWidth="0.8" />
              <path d="M26.5 75 H29 C29 83 28 92 25.5 97 C26.5 93 26.5 84 26.5 75 Z" fill={getFill('adductors')} stroke={getStroke('adductors')} strokeWidth="0.8" />
              <path d="M33.5 75 H31 C31 83 32 92 34.5 97 C33.5 93 33.5 84 33.5 75 Z" fill={getFill('adductors')} stroke={getStroke('adductors')} strokeWidth="0.8" />

              {/* 小腿腓腸肌 (Calves) & 比目魚肌 (Soleus) */}
              <path d="M21 102 C19 107 20 113 22 117 C24 117 25.5 117 26 117 C26.5 112 26.5 107 26 102 Z" fill={getFill('calves')} stroke={getStroke('calves')} strokeWidth="0.8" />
              <path d="M39 102 C41 107 40 113 38 117 C36 117 34.5 117 34 117 C33.5 112 33.5 107 34 102 Z" fill={getFill('calves')} stroke={getStroke('calves')} strokeWidth="0.8" />
              <path d="M22 118 C21 123 22 128 24 133 C26 128 26 123 26 118 Z" fill={getFill('soleus')} stroke={getStroke('soleus')} strokeWidth="0.8" />
              <path d="M38 118 C39 123 38 128 36 133 C34 128 34 123 34 118 Z" fill={getFill('soleus')} stroke={getStroke('soleus')} strokeWidth="0.8" />
            </g>
          )}
        </svg>
        <span className="absolute bottom-0.5 right-0.5 text-[7px] font-black px-1 py-0.2 rounded bg-slate-900/90 text-slate-400 border border-slate-800 leading-none pointer-events-none select-none">
          {displaySide === 'front' ? '正' : '背'}
        </span>
      </div>
    );
  }

  // Large / Interactive / Modal View
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="w-full flex items-center justify-center gap-6 sm:gap-12 py-2">
        {/* Front Figure */}
        <div className="flex flex-col items-center">
          <div className="w-32 sm:w-36 h-64 sm:h-72 flex items-center justify-center p-1">
            <svg
              viewBox="0 0 100 210"
              className="w-full h-full drop-shadow-md overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Head & Neck */}
              <circle cx="50" cy="18" r="11" fill={neutralMuscle} stroke={neutralStroke} strokeWidth="1.5" />
              <path d="M46 29 H54 V38 H46 Z" fill={neutralMuscle} />
              <path d="M43 38 C47 36 53 36 57 38 L60 44 H40 Z" fill={neutralMuscle} />

              {/* Front Deltoids (前三角肌) */}
              <g className={partClass} onClick={() => handlePartClick('front_shoulders')}>
                <path
                  d="M29 42 C24 46 25 56 29 62 C33 58 34 49 33 42 Z"
                  fill={getFill('front_shoulders')}
                  stroke={getStroke('front_shoulders')}
                  strokeWidth="1.5"
                />
                <path
                  d="M71 42 C76 46 75 56 71 62 C67 58 66 49 67 42 Z"
                  fill={getFill('front_shoulders')}
                  stroke={getStroke('front_shoulders')}
                  strokeWidth="1.5"
                />
              </g>

              {/* Lateral Deltoids (三角肌中束) */}
              <g className={partClass} onClick={() => handlePartClick('lateral_deltoid')}>
                <path
                  d="M24 43 C19 48 19 58 24 64 C26 58 26 49 24 43 Z"
                  fill={getFill('lateral_deltoid')}
                  stroke={getStroke('lateral_deltoid')}
                  strokeWidth="1.5"
                />
                <path
                  d="M76 43 C81 48 81 58 76 64 C74 58 74 49 76 43 Z"
                  fill={getFill('lateral_deltoid')}
                  stroke={getStroke('lateral_deltoid')}
                  strokeWidth="1.5"
                />
              </g>

              {/* 1. 上胸 (Upper Chest) */}
              <g className={partClass} onClick={() => handlePartClick('upper_chest')}>
                <path
                  d="M34 43 C42 41 49 43 49 49 C42 49 35 49 31 46 Z"
                  fill={getFill('upper_chest')}
                  stroke={getStroke('upper_chest')}
                  strokeWidth="1.5"
                />
                <path
                  d="M66 43 C58 41 51 43 51 49 C58 49 65 49 69 46 Z"
                  fill={getFill('upper_chest')}
                  stroke={getStroke('upper_chest')}
                  strokeWidth="1.5"
                />
              </g>

              {/* 2. 中胸 (Mid Chest) */}
              <g className={partClass} onClick={() => handlePartClick('mid_chest')}>
                <path
                  d="M31 48 C41 51 49 51 49 56 C41 56 34 56 30 53 Z"
                  fill={getFill('mid_chest')}
                  stroke={getStroke('mid_chest')}
                  strokeWidth="1.5"
                />
                <path
                  d="M69 48 C59 51 51 51 51 56 C59 56 66 56 70 53 Z"
                  fill={getFill('mid_chest')}
                  stroke={getStroke('mid_chest')}
                  strokeWidth="1.5"
                />
              </g>

              {/* 3. 下胸 (Lower Chest) */}
              <g className={partClass} onClick={() => handlePartClick('lower_chest')}>
                <path
                  d="M30 55 C40 58 48 58 48 62 C41 64 33 63 29 58 Z"
                  fill={getFill('lower_chest')}
                  stroke={getStroke('lower_chest')}
                  strokeWidth="1.5"
                />
                <path
                  d="M70 55 C60 58 52 58 52 62 C59 64 67 63 71 58 Z"
                  fill={getFill('lower_chest')}
                  stroke={getStroke('lower_chest')}
                  strokeWidth="1.5"
                />
              </g>

              {/* Biceps */}
              <g className={partClass} onClick={() => handlePartClick('biceps')}>
                <path
                  d="M23 65 C20 73 21 84 26 87 C28 81 28 73 25 65 Z"
                  fill={getFill('biceps')}
                  stroke={getStroke('biceps')}
                  strokeWidth="1.5"
                />
                <path
                  d="M77 65 C80 73 79 84 74 87 C72 81 72 73 75 65 Z"
                  fill={getFill('biceps')}
                  stroke={getStroke('biceps')}
                  strokeWidth="1.5"
                />
              </g>

              {/* Forearms */}
              <g className={partClass} onClick={() => handlePartClick('forearms')}>
                <path
                  d="M22 90 C17 103 16 118 20 124 C24 120 25 106 25 90 Z"
                  fill={getFill('forearms')}
                  stroke={getStroke('forearms')}
                  strokeWidth="1.5"
                />
                <path
                  d="M78 90 C83 103 84 118 80 124 C76 120 75 106 75 90 Z"
                  fill={getFill('forearms')}
                  stroke={getStroke('forearms')}
                  strokeWidth="1.5"
                />
              </g>

              {/* Rectus Abdominis (Abs) */}
              <g className={partClass} onClick={() => handlePartClick('abs')}>
                <rect x="43" y="63" width="6" height="7" rx="1.5" fill={getFill('abs')} stroke={getStroke('abs')} strokeWidth="1" />
                <rect x="51" y="63" width="6" height="7" rx="1.5" fill={getFill('abs')} stroke={getStroke('abs')} strokeWidth="1" />
                <rect x="43" y="72" width="6" height="7" rx="1.5" fill={getFill('abs')} stroke={getStroke('abs')} strokeWidth="1" />
                <rect x="51" y="72" width="6" height="7" rx="1.5" fill={getFill('abs')} stroke={getStroke('abs')} strokeWidth="1" />
                <rect x="43" y="81" width="6" height="8" rx="1.5" fill={getFill('abs')} stroke={getStroke('abs')} strokeWidth="1" />
                <rect x="51" y="81" width="6" height="8" rx="1.5" fill={getFill('abs')} stroke={getStroke('abs')} strokeWidth="1" />
              </g>

              {/* Obliques */}
              <g className={partClass} onClick={() => handlePartClick('obliques')}>
                <path
                  d="M34 66 C37 77 39 88 41 93 C36 88 33 78 34 66 Z"
                  fill={getFill('obliques')}
                  stroke={getStroke('obliques')}
                  strokeWidth="1.2"
                />
                <path
                  d="M66 66 C63 77 61 88 59 93 C64 88 67 78 66 66 Z"
                  fill={getFill('obliques')}
                  stroke={getStroke('obliques')}
                  strokeWidth="1.2"
                />
              </g>

              {/* Pelvis */}
              <path d="M42 94 H58 L55 102 H45 Z" fill={neutralMuscle} />

              {/* Quads */}
              <g className={partClass} onClick={() => handlePartClick('quads')}>
                <path
                  d="M36 102 C30 118 31 142 37 154 C42 152 45 136 46 104 Z"
                  fill={getFill('quads')}
                  stroke={getStroke('quads')}
                  strokeWidth="1.8"
                />
                <path
                  d="M64 102 C70 118 69 142 63 154 C58 152 55 136 54 104 Z"
                  fill={getFill('quads')}
                  stroke={getStroke('quads')}
                  strokeWidth="1.8"
                />
              </g>

              {/* Knees */}
              <circle cx="41" cy="157" r="3.5" fill={neutralMuscle} />
              <circle cx="59" cy="157" r="3.5" fill={neutralMuscle} />

              {/* Shins & Calves Front */}
              <g className={partClass} onClick={() => handlePartClick('front_calves')}>
                <path
                  d="M37 163 C33 178 34 196 39 206 C42 201 43 182 42 163 Z"
                  fill={getFill('front_calves')}
                  stroke={getStroke('front_calves')}
                  strokeWidth="1.5"
                />
                <path
                  d="M63 163 C67 178 66 196 61 206 C58 201 57 182 58 163 Z"
                  fill={getFill('front_calves')}
                  stroke={getStroke('front_calves')}
                  strokeWidth="1.5"
                />
              </g>
            </svg>
          </div>
          {showLabels && (
            <span className="text-sm font-black text-slate-300 mt-2 tracking-widest">
              正面
            </span>
          )}
        </div>

        {/* Back Figure */}
        <div className="flex flex-col items-center">
          <div className="w-32 sm:w-36 h-64 sm:h-72 flex items-center justify-center p-1">
            <svg
              viewBox="0 0 100 210"
              className="w-full h-full drop-shadow-md overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Head & Neck */}
              <circle cx="50" cy="18" r="11" fill={neutralMuscle} stroke={neutralStroke} strokeWidth="1.5" />
              <path d="M46 29 H54 V37 H46 Z" fill={neutralMuscle} />

              {/* 斜方肌 (Trapezius) */}
              <g className={partClass} onClick={() => handlePartClick('trapezius')}>
                <path
                  d="M38 37 C46 34 54 34 62 37 C58 48 53 56 50 58 C47 56 42 48 38 37 Z"
                  fill={getFill('trapezius')}
                  stroke={getStroke('trapezius')}
                  strokeWidth="1.5"
                />
              </g>

              {/* 菱形肌 (Rhomboids) */}
              <g className={partClass} onClick={() => handlePartClick('rhomboids')}>
                <path
                  d="M43 49 C47 51 47 64 42 66 C39 59 40 53 43 49 Z"
                  fill={getFill('rhomboids')}
                  stroke={getStroke('rhomboids')}
                  strokeWidth="1.2"
                />
                <path
                  d="M57 49 C53 51 53 64 58 66 C61 59 60 53 57 49 Z"
                  fill={getFill('rhomboids')}
                  stroke={getStroke('rhomboids')}
                  strokeWidth="1.2"
                />
              </g>

              {/* 大小圓肌 (Teres) */}
              <g className={partClass} onClick={() => handlePartClick('teres')}>
                <path
                  d="M33 51 C39 53 39 61 34 64 C29 60 30 54 33 51 Z"
                  fill={getFill('teres')}
                  stroke={getStroke('teres')}
                  strokeWidth="1.2"
                />
                <path
                  d="M67 51 C61 53 61 61 66 64 C71 60 70 54 67 51 Z"
                  fill={getFill('teres')}
                  stroke={getStroke('teres')}
                  strokeWidth="1.2"
                />
              </g>

              {/* 後三角肌 (Rear Deltoids) */}
              <g className={partClass} onClick={() => handlePartClick('rear_shoulders')}>
                <path
                  d="M28 42 C23 46 24 56 29 62 C32 57 33 48 32 42 Z"
                  fill={getFill('rear_shoulders')}
                  stroke={getStroke('rear_shoulders')}
                  strokeWidth="1.5"
                />
                <path
                  d="M72 42 C77 46 76 56 71 62 C68 57 67 48 68 42 Z"
                  fill={getFill('rear_shoulders')}
                  stroke={getStroke('rear_shoulders')}
                  strokeWidth="1.5"
                />
              </g>

              {/* 三角肌中束 (Lateral Deltoid - Back view) */}
              <g className={partClass} onClick={() => handlePartClick('lateral_deltoid')}>
                <path
                  d="M22 43 C18 48 18 58 23 64 C25 58 25 49 22 43 Z"
                  fill={getFill('lateral_deltoid')}
                  stroke={getStroke('lateral_deltoid')}
                  strokeWidth="1.5"
                />
                <path
                  d="M78 43 C82 48 82 58 77 64 C75 58 75 49 78 43 Z"
                  fill={getFill('lateral_deltoid')}
                  stroke={getStroke('lateral_deltoid')}
                  strokeWidth="1.5"
                />
              </g>

              {/* 肱三頭肌(外側頭) (Triceps Lateral Head) */}
              <g className={partClass} onClick={() => handlePartClick('triceps_lateral')}>
                <path
                  d="M21 65 C18 73 19 82 23 85 C25 80 25 72 23 65 Z"
                  fill={getFill('triceps_lateral')}
                  stroke={getStroke('triceps_lateral')}
                  strokeWidth="1.4"
                />
                <path
                  d="M79 65 C82 73 81 82 77 85 C75 80 75 72 77 65 Z"
                  fill={getFill('triceps_lateral')}
                  stroke={getStroke('triceps_lateral')}
                  strokeWidth="1.4"
                />
              </g>

              {/* 肱三頭肌(長頭) (Triceps Long Head) */}
              <g className={partClass} onClick={() => handlePartClick('triceps_long')}>
                <path
                  d="M24 65 C26 73 26 81 24 86 C27 84 28 77 28 65 Z"
                  fill={getFill('triceps_long')}
                  stroke={getStroke('triceps_long')}
                  strokeWidth="1.4"
                />
                <path
                  d="M76 65 C74 73 74 81 76 86 C73 84 72 77 72 65 Z"
                  fill={getFill('triceps_long')}
                  stroke={getStroke('triceps_long')}
                  strokeWidth="1.4"
                />
              </g>

              {/* Forearms */}
              <g className={partClass} onClick={() => handlePartClick('forearms')}>
                <path
                  d="M22 90 C17 103 16 118 20 124 C24 120 25 106 25 90 Z"
                  fill={getFill('forearms')}
                  stroke={getStroke('forearms')}
                  strokeWidth="1.4"
                />
                <path
                  d="M78 90 C83 103 84 118 80 124 C76 120 75 106 75 90 Z"
                  fill={getFill('forearms')}
                  stroke={getStroke('forearms')}
                  strokeWidth="1.4"
                />
              </g>

              {/* 闊背肌 (Lats) */}
              <g className={partClass} onClick={() => handlePartClick('lats')}>
                <path
                  d="M33 63 C42 66 43 74 41 86 C34 79 31 71 33 63 Z"
                  fill={getFill('lats')}
                  stroke={getStroke('lats')}
                  strokeWidth="1.8"
                />
                <path
                  d="M67 63 C58 66 57 74 59 86 C66 79 69 71 67 63 Z"
                  fill={getFill('lats')}
                  stroke={getStroke('lats')}
                  strokeWidth="1.8"
                />
              </g>

              {/* 下背豎脊肌 (Lower Back) */}
              <g className={partClass} onClick={() => handlePartClick('lower_back')}>
                <path
                  d="M44 76 C46 86 46 92 46 98 H54 C54 92 54 86 56 76 Z"
                  fill={getFill('lower_back')}
                  stroke={getStroke('lower_back')}
                  strokeWidth="1.3"
                />
              </g>

              {/* 臀中肌 (Gluteus Medius) */}
              <g className={partClass} onClick={() => handlePartClick('gluteus_med')}>
                <path
                  d="M30 96 C36 94 43 97 41 105 C33 105 30 101 30 96 Z"
                  fill={getFill('gluteus_med')}
                  stroke={getStroke('gluteus_med')}
                  strokeWidth="1.5"
                />
                <path
                  d="M70 96 C64 94 57 97 59 105 C67 105 70 101 70 96 Z"
                  fill={getFill('gluteus_med')}
                  stroke={getStroke('gluteus_med')}
                  strokeWidth="1.5"
                />
              </g>

              {/* 臀大肌 (Gluteus Maximus) */}
              <g className={partClass} onClick={() => handlePartClick('gluteus_max')}>
                <path
                  d="M31 106 C36 106 48 107 48 119 C38 120 31 114 31 106 Z"
                  fill={getFill('gluteus_max')}
                  stroke={getStroke('gluteus_max')}
                  strokeWidth="1.8"
                />
                <path
                  d="M69 106 C64 106 52 107 52 119 C62 120 69 114 69 106 Z"
                  fill={getFill('gluteus_max')}
                  stroke={getStroke('gluteus_max')}
                  strokeWidth="1.8"
                />
              </g>

              {/* 腿後腱肌群 (Hamstrings) */}
              <g className={partClass} onClick={() => handlePartClick('hamstrings')}>
                <path
                  d="M35 122 C31 136 34 150 39.5 156 C42 150 42.5 136 42.5 122 Z"
                  fill={getFill('hamstrings')}
                  stroke={getStroke('hamstrings')}
                  strokeWidth="1.6"
                />
                <path
                  d="M65 122 C69 136 66 150 60.5 156 C58 150 57.5 136 57.5 122 Z"
                  fill={getFill('hamstrings')}
                  stroke={getStroke('hamstrings')}
                  strokeWidth="1.6"
                />
              </g>

              {/* 大腿內收肌群 (Adductors) */}
              <g className={partClass} onClick={() => handlePartClick('adductors')}>
                <path
                  d="M43.5 122 H47 C47 135 44.5 149 41.5 156 C43 150 43.5 136 43.5 122 Z"
                  fill={getFill('adductors')}
                  stroke={getStroke('adductors')}
                  strokeWidth="1.6"
                />
                <path
                  d="M56.5 122 H53 C53 135 55.5 149 58.5 156 C57 150 56.5 136 56.5 122 Z"
                  fill={getFill('adductors')}
                  stroke={getStroke('adductors')}
                  strokeWidth="1.6"
                />
              </g>

              {/* Knee Back */}
              <rect x="38" y="156" width="6" height="3" rx="1.5" fill={neutralMuscle} />
              <rect x="56" y="156" width="6" height="3" rx="1.5" fill={neutralMuscle} />

              {/* 小腿腓腸肌 (Gastrocnemius / Calves) */}
              <g className={partClass} onClick={() => handlePartClick('calves')}>
                <path
                  d="M34 163 C30 172 31 179 34 184 C37 185 40 185 43 184 C44 178 44 170 43 163 Z"
                  fill={getFill('calves')}
                  stroke={getStroke('calves')}
                  strokeWidth="1.6"
                />
                <path
                  d="M66 163 C70 172 69 179 66 184 C63 185 60 185 57 184 C56 178 56 170 57 163 Z"
                  fill={getFill('calves')}
                  stroke={getStroke('calves')}
                  strokeWidth="1.6"
                />
              </g>

              {/* 比目魚肌 (Soleus) */}
              <g className={partClass} onClick={() => handlePartClick('soleus')}>
                <path
                  d="M34.5 185.5 C32 193 34 201 38 206 C42 198 42.5 192 42.5 185.5 C40 186.5 37 186.5 34.5 185.5 Z"
                  fill={getFill('soleus')}
                  stroke={getStroke('soleus')}
                  strokeWidth="1.6"
                />
                <path
                  d="M65.5 185.5 C68 193 66 201 62 206 C58 198 57.5 192 57.5 185.5 C60 186.5 63 186.5 65.5 185.5 Z"
                  fill={getFill('soleus')}
                  stroke={getStroke('soleus')}
                  strokeWidth="1.6"
                />
              </g>
            </svg>
          </div>
          {showLabels && (
            <span className="text-sm font-black text-slate-300 mt-2 tracking-widest">
              背面
            </span>
          )}
        </div>
      </div>

      {/* Target Muscle Badges */}
      {!isInteractive && muscleInfo.primaryLabel && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 px-4 text-center">
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            主要鍛鍊：{muscleInfo.primaryLabel}
          </span>
          {muscleInfo.secondaryLabel && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
              輔助肌群：{muscleInfo.secondaryLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MuscleMap;
