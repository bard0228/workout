
import React, { useState, useEffect, useRef } from 'react';
import { View, Exercise, SetData, WorkoutHistoryEntry, Combo, Category } from '../types';
import { DEFAULT_EXERCISES, DEFAULT_COMBOS, STORAGE_KEYS, DEFAULT_EXERCISES_VERSION } from '../constants';
import Dashboard from './Dashboard';
import WorkoutSession from './WorkoutSession';
import RestTimer from './RestTimer';
import TopNav from './TopNav';
import ComboEditor from './ComboEditor';
import ExerciseEditor from './ExerciseEditor';
import Statistics from './Statistics';
import SplashScreen from './SplashScreen';
import ResumeSessionButton from './ResumeSessionButton';
import AuthErrorModal from './AuthErrorModal';
import { db } from '../services/dbService';
import { 
  auth, 
  logInWithGoogle, 
  logOut, 
  downloadBackup,
  deleteHistoryEntry, 
  deleteExercise, 
  deleteCombo,
  uploadHistoryEntry,
  uploadExercise,
  uploadCombo
} from '../services/firebaseService';
import ConfirmModal from './ConfirmModal';
import { getRecommendedCategory } from '../lib/workout';
import { RirPicker, rirSuffix } from '../lib/rir';

interface ExerciseSessionState {
  sets: SetData[];
  draft: SetData;
  timer: number;
}

// 取得本地 YYYY-MM-DD 格式的字串
const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // 初始化 State 改為預設值，等待後續 useEffect 載入
  const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  const [history, setHistory] = useState<WorkoutHistoryEntry[]>([]);
  const [combos, setCombos] = useState<Combo[]>(DEFAULT_COMBOS);
  const [selectedCategory, setSelectedCategory] = useState<Category>('全部');
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editingComboId, setEditingComboId] = useState<string | null>(null);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [activeQueue, setActiveQueue] = useState<Exercise[]>([]);
  const [sessionSets, setSessionSets] = useState<SetData[]>([]);
  const [sessionStore, setSessionStore] = useState<Record<string, ExerciseSessionState>>({});
  const [nextSetDraft, setNextSetDraft] = useState<SetData>({ id: '', weight: 0, reps: 0, isWarmup: false, isDropSet: false, timestamp: '' });
  const [sessionDate, setSessionDate] = useState<string>(getLocalDateString());
  const [restTimerDuration, setRestTimerDuration] = useState<number>(120);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [lastSetFinishedAt, setLastSetFinishedAt] = useState<number>(0); 
  const [restTimerTargetTime, setRestTimerTargetTime] = useState<number | null>(null); 

  // 訓練進行中抽屜面板狀態與拖曳手勢
  const [isSessionCollapsed, setIsSessionCollapsed] = useState(false);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const touchStartYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false); 
  const hasDraggedRef = useRef<boolean>(false);
  const sheetHeaderRef = useRef<HTMLDivElement>(null);

  const isPopStateChange = useRef(false);

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [rirPromptSetId, setRirPromptSetId] = useState<string | null>(null);
  const [lastBackupText, setLastBackupText] = useState<string>('');
  const [autoBackupToast, setAutoBackupToast] = useState<string | null>(null);
  const [newDeviceRestorePromptOpen, setNewDeviceRestorePromptOpen] = useState(false);
  const [authError, setAuthError] = useState<{ code: string; message: string; origin: string } | null>(null);

  // 初始化載入資料與自動遷移邏輯
  useEffect(() => {
    const initApp = async () => {
      try {
        await db.init();
        
        let initialHistory = await db.getHistory();
        let initialExercises = await db.getExercises();
        let initialCombos = await db.getCombos();

        // 檢查版本：若預設動作有更新或尚未同步，清除舊預設動作並替換為全新 77 個預設動作
        const currentExVer = localStorage.getItem('fit_exercises_default_ver');
        if (currentExVer !== DEFAULT_EXERCISES_VERSION) {
          const oldDefaultIds = new Set([
            'l1','l2','l3','l4','l5','l6','l7','l8','l9',
            'c1','c2','c3','c4','c5','c6',
            'b1','b2','b3','b4','b5','b6','b7','b8','b9','b10','b11','b12',
            's1','s2','s3','s4','s5','s6','s7',
            'a1','a2','a3',
            'o1','o2','o3','o4','o5','o6','o7'
          ]);
          // 保留使用者完全自訂的動作（非舊預設動作 ID 且非新預設動作名稱）
          const customExercises = initialExercises.filter(ex => !oldDefaultIds.has(ex.id) && !DEFAULT_EXERCISES.some(de => de.name === ex.name));
          initialExercises = [...DEFAULT_EXERCISES, ...customExercises];
          await db.saveExercises(initialExercises);
          localStorage.setItem('fit_exercises_default_ver', DEFAULT_EXERCISES_VERSION);

          // 同步重設預設組合
          if (initialCombos.length === 0 || initialCombos.every(c => c.id.startsWith('def_combo_'))) {
            initialCombos = DEFAULT_COMBOS;
            await db.saveCombos(initialCombos);
          }
        }

        if (initialExercises.length === 0) {
          initialExercises = DEFAULT_EXERCISES;
          await db.saveExercises(initialExercises);
        }
        if (initialCombos.length === 0) {
          initialCombos = DEFAULT_COMBOS;
          await db.saveCombos(initialCombos);
        }

        if (initialHistory.length > 0) {
          initialHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setHistory(initialHistory);
        }
        if (initialExercises.length > 0) setExercises(initialExercises);
        if (initialCombos.length > 0) setCombos(initialCombos);

        // 自動還原重整前正在進行中的訓練
        try {
          const savedActiveSessionStr = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
          if (savedActiveSessionStr) {
            const savedSession = JSON.parse(savedActiveSessionStr);
            if (savedSession && savedSession.activeExercise) {
              setActiveExercise(savedSession.activeExercise);
              if (Array.isArray(savedSession.activeQueue)) setActiveQueue(savedSession.activeQueue);
              if (Array.isArray(savedSession.sessionSets)) setSessionSets(savedSession.sessionSets);
              if (savedSession.sessionStore) setSessionStore(savedSession.sessionStore);
              if (savedSession.nextSetDraft) setNextSetDraft(savedSession.nextSetDraft);
              if (savedSession.sessionDate) setSessionDate(savedSession.sessionDate);
              if (savedSession.restTimerDuration) setRestTimerDuration(savedSession.restTimerDuration);
              if (savedSession.lastSetFinishedAt) setLastSetFinishedAt(savedSession.lastSetFinishedAt);

              // 恢復精確倒數計時器：若重新整理時仍在倒數，依目標時間戳繼續倒數；若已過期則關閉
              if (savedSession.isRestTimerActive) {
                const now = Date.now();
                let target = savedSession.restTimerTargetTime;
                if (!target && savedSession.lastSetFinishedAt && savedSession.restTimerDuration) {
                  target = savedSession.lastSetFinishedAt + savedSession.restTimerDuration * 1000;
                }
                if (target && target > now) {
                  setRestTimerTargetTime(target);
                  setIsRestTimerActive(true);
                } else {
                  setRestTimerTargetTime(null);
                  setIsRestTimerActive(false);
                }
              } else {
                setIsRestTimerActive(false);
                setRestTimerTargetTime(null);
              }

              if (savedSession.isSessionCollapsed !== undefined) setIsSessionCollapsed(savedSession.isSessionCollapsed);
              if (savedSession.activeExercise.category && savedSession.activeExercise.category !== '全部') {
                setSelectedCategory(savedSession.activeExercise.category);
              }
              setCurrentView(View.WORKOUT_SESSION);
              console.log("成功還原重整前的訓練狀態：", savedSession.activeExercise.name, `已完成 ${savedSession.sessionSets?.length || 0} 組`);
            }
          }
        } catch (sessionErr) {
          console.warn("無法解析先前進行中的訓練快取：", sessionErr);
        }
        
      } catch (e) {
        console.error("Failed to load data from IndexedDB", e);
      } finally {
        setIsDataLoaded(true);
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    window.history.replaceState({ view: View.DASHBOARD }, "");
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      isPopStateChange.current = true;
      if (state) {
        if (state.view) {
           setCurrentView(state.view);
        }
        setIsCalendarOpen(state.modal === 'calendar');
        setEditingComboId(state.sub === 'combo-edit' ? state.id : null);
        setEditingExerciseId(state.sub === 'ex-edit' ? state.id : null);
      } else {
        setCurrentView(View.DASHBOARD);
      }
      setTimeout(() => { isPopStateChange.current = false; }, 0);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (isPopStateChange.current) return;
    const state = { view: currentView, modal: isCalendarOpen ? 'calendar' : null, sub: editingComboId ? 'combo-edit' : (editingExerciseId ? 'ex-edit' : null), id: editingComboId || editingExerciseId || null };
    const currentState = window.history.state;
    if (!currentState || currentState.view !== state.view || currentState.sub !== state.sub) {
      window.history.pushState(state, "");
    }
  }, [currentView, isCalendarOpen, editingComboId, editingExerciseId]);

  // 更新資料到 IndexedDB
  useEffect(() => {
    if (!isDataLoaded) return; // 確保載入完成後才開始寫入，避免覆蓋初值
    const syncToIndexedDB = async () => {
      try {
        await db.saveExercises(exercises);
        await db.saveHistory(history);
        await db.saveCombos(combos);
      } catch (err) {
        console.error("Failed to sync state to IndexedDB:", err);
      }
    };
    syncToIndexedDB();
  }, [exercises, history, combos, isDataLoaded]);

  // 即時持久化進行中的訓練狀態至 localStorage，確保使用者重新整理或意外關閉分頁後可自動無縫恢復
  useEffect(() => {
    if (!isDataLoaded) return;
    try {
      if (activeExercise) {
        const sessionPayload = {
          activeExercise,
          activeQueue,
          sessionSets,
          sessionStore,
          nextSetDraft,
          sessionDate,
          restTimerDuration,
          isRestTimerActive,
          lastSetFinishedAt,
          restTimerTargetTime,
          isSessionCollapsed,
        };
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(sessionPayload));
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
      }
    } catch (e) {
      console.warn("無法儲存進行中訓練狀態至 localStorage:", e);
    }
  }, [
    isDataLoaded,
    activeExercise,
    activeQueue,
    sessionSets,
    sessionStore,
    nextSetDraft,
    sessionDate,
    restTimerDuration,
    isRestTimerActive,
    lastSetFinishedAt,
    restTimerTargetTime,
    isSessionCollapsed,
  ]);

  // 備份訪客/本地資料的輔助函式
  const backupGuestData = (hist: WorkoutHistoryEntry[], exs: Exercise[], cmbs: Combo[]) => {
    if (localStorage.getItem('fit_guest_backup_exists') !== 'true') {
      localStorage.setItem('fit_guest_backup_history', JSON.stringify(hist));
      localStorage.setItem('fit_guest_backup_exercises', JSON.stringify(exs));
      localStorage.setItem('fit_guest_backup_combos', JSON.stringify(cmbs));
      localStorage.setItem('fit_guest_backup_exists', 'true');
      console.log("Guest data backed up successfully.");
    }
  };

  // Auth State Changes Listener
  useEffect(() => {
    if (!isDataLoaded) return;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, [isDataLoaded]);

  // 顯示暫時性的自動備份提示
  const showAutoBackupNotification = (msg: string) => {
    setAutoBackupToast(msg);
    setTimeout(() => {
      setAutoBackupToast(null);
    }, 4000);
  };

  // 格式化上次備份時間以顯示於選單
  const updateLastBackupDisplay = (uid: string) => {
    const isInitialized = localStorage.getItem(`fit_device_initialized_for_backup_${uid}`) === 'true' ||
      !!localStorage.getItem(`fit_last_cloud_backup_timestamp_${uid}`);

    if (!isInitialized) {
      setLastBackupText('此裝置尚未同步雲端');
      return;
    }

    const tsStr = localStorage.getItem(`fit_last_cloud_backup_timestamp_${uid}`);
    if (!tsStr) {
      setLastBackupText('尚未執行雲端備份');
      return;
    }
    const ts = Number(tsStr);
    if (isNaN(ts) || ts <= 0) {
      setLastBackupText('尚未執行雲端備份');
      return;
    }
    const dateObj = new Date(ts);
    const dateStr = getLocalDateString(dateObj);
    const todayStr = getLocalDateString(new Date());
    const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));

    const timePart = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    let dayPrefix = dateStr;
    if (dateStr === todayStr) {
      dayPrefix = '今日';
    } else if (dateStr === yesterdayStr) {
      dayPrefix = '昨日';
    }
    setLastBackupText(`上次備份：${dayPrefix} ${timePart}`);
  };

  // ===== 即時雲端同步（逐筆寫入）=====
  // 雲端資料載入完成前不寫入；cloudSnapshotRef 記錄「雲端目前已知狀態」，之後只對差異的單筆文件做 setDoc / deleteDoc
  const cloudReadyRef = useRef(false);
  const cloudSnapshotRef = useRef<{ h: Map<string, string>; e: Map<string, string>; c: Map<string, string> } | null>(null);
  const toMap = (arr: { id: string }[]) => new Map(arr.map(x => [x.id, JSON.stringify(x)]));

  // 開 App / 登入時：從 Firestore 拉資料並與本地合併（雲端優先，絕不刪除雲端資料）
  const pullAndMergeFromCloud = async (uid: string) => {
    cloudReadyRef.current = false;
    setIsSyncing(true);
    try {
      const cloud = await downloadBackup(uid);
      const cloudHasData = cloud.history.length > 0 || cloud.exercises.length > 0 || cloud.combos.length > 0;
      const isInitialized = localStorage.getItem(`fit_device_initialized_for_backup_${uid}`) === 'true' ||
        !!localStorage.getItem(`fit_last_cloud_backup_timestamp_${uid}`);
      const localHist = await db.getHistory();
      const localExs = await db.getExercises();
      const localCmbs = await db.getCombos();
      // 新裝置且雲端已有資料：直接採用雲端（不把本機預設值/空資料推上去）
      // 已初始化裝置：本機獨有的項目（例如離線新增）補上傳；同 id 以雲端為準
      const keepLocalOnly = isInitialized || !cloudHasData;
      // 雲端已有資料時，本機獨有的「系統預設」動作/組合不補上傳（避免把已刪除的預設項目復活）
      const defaultIds = new Set<string>([...DEFAULT_EXERCISES.map(x => x.id), ...DEFAULT_COMBOS.map(x => x.id)]);
      const merge = <T extends { id: string }>(c: T[], l: T[]) => {
        const m = new Map<string, T>(c.map(x => [x.id, x]));
        if (keepLocalOnly) l.forEach(x => { if (!m.has(x.id) && !(cloudHasData && defaultIds.has(x.id))) m.set(x.id, x); });
        return Array.from(m.values());
      };
      const mh = merge(cloud.history, localHist).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const me = merge(cloud.exercises, localExs);
      const mc = merge(cloud.combos, localCmbs);
      cloudSnapshotRef.current = { h: toMap(cloud.history), e: toMap(cloud.exercises), c: toMap(cloud.combos) };
      cloudReadyRef.current = true;
      setHistory(mh); setExercises(me); setCombos(mc);
      await db.saveHistory(mh); await db.saveExercises(me); await db.saveCombos(mc);
      localStorage.setItem(`fit_device_initialized_for_backup_${uid}`, 'true');
      localStorage.setItem(`fit_last_cloud_backup_timestamp_${uid}`, String(Date.now()));
      cloudReadyRef.current = true;
      updateLastBackupDisplay(uid);
      return true;
    } catch (e) {
      console.error('[CloudSync] 從雲端載入失敗（不會寫入雲端）', e);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // 狀態變動時：只把新增/修改/刪除的單筆文件同步到 Firestore
  useEffect(() => {
    if (!currentUser || !cloudReadyRef.current || !cloudSnapshotRef.current) return;
    const uid = currentUser.uid;
    const snap = cloudSnapshotRef.current;
    const run = async <T extends { id: string }>(arr: T[], known: Map<string, string>, up: (u: string, x: T) => Promise<void>, del: (u: string, id: string) => Promise<void>) => {
      const cur = new Map(arr.map(x => [x.id, x]));
      for (const [id, x] of cur) {
        const js = JSON.stringify(x);
        if (known.get(id) !== js) {
          known.set(id, js);
          up(uid, x).catch(err => { known.delete(id); console.error('[CloudSync] 寫入失敗', id, err); });
        }
      }
      for (const id of Array.from(known.keys())) {
        if (!cur.has(id)) {
          known.delete(id);
          del(uid, id).catch(err => console.error('[CloudSync] 刪除失敗', id, err));
        }
      }
    };
    run(history, snap.h, uploadHistoryEntry, deleteHistoryEntry);
    run(exercises, snap.e, uploadExercise, deleteExercise);
    run(combos, snap.c, uploadCombo, deleteCombo);
    localStorage.setItem(`fit_last_cloud_backup_timestamp_${uid}`, String(Date.now()));
  }, [history, exercises, combos, currentUser]);

  // App 從背景回到前景時，先增量拉一次雲端（避免舊分頁/背景 PWA 用過期資料覆寫雲端）
  const lastPullRef = useRef(0);
  useEffect(() => {
    if (!currentUser || !isDataLoaded) return;
    lastPullRef.current = Date.now();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastPullRef.current > 60000) {
        lastPullRef.current = Date.now();
        pullAndMergeFromCloud(currentUser.uid);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [currentUser, isDataLoaded]);

  // 手動「備份」按鈕：改為重新與雲端同步（合併，不整批覆蓋）
  const executeCloudBackup = async (options: { isSilent?: boolean; triggerReason?: string } = {}) => {
    if (!currentUser) return false;
    const ok = await pullAndMergeFromCloud(currentUser.uid);
    if (!options.isSilent) alert(ok ? '已與雲端同步完成！（新增/修改/刪除都會即時自動同步）' : '同步失敗，請稍後再試。');
    return ok;
  };


  // 監聽登入狀態與資料就緒，觸發自動備份檢查與更新備份時間文字
  useEffect(() => {
    if (currentUser && isDataLoaded) {
      updateLastBackupDisplay(currentUser.uid);

      pullAndMergeFromCloud(currentUser.uid);
    } else {
      cloudReadyRef.current = false;
      cloudSnapshotRef.current = null;
      setLastBackupText('');
    }
  }, [currentUser, isDataLoaded]);


  // 手動覆蓋備份到雲端
  const handleCloudBackup = () => {
    executeCloudBackup({ isSilent: false });
  };

  // 手動下載還原備份自雲端
  const handleCloudRestore = async (suppressConfirm = false) => {
    if (!currentUser) return;
    
    if (!suppressConfirm) {
      const confirmRestore = window.confirm(
        "確定要從雲端下載並還原備份嗎？\n這將會以雲端數據「覆蓋並還原」此裝置目前的本地紀錄（此動作無法復原）。"
      );
      if (!confirmRestore) return;
    }

    setIsSyncing(true);
    try {
      cloudReadyRef.current = false;
      const merged = await downloadBackup(currentUser.uid);
      cloudSnapshotRef.current = { h: toMap(merged.history), e: toMap(merged.exercises), c: toMap(merged.combos) };
      cloudReadyRef.current = true;
      
      // 更新本地 state
      setHistory(merged.history);
      setExercises(merged.exercises);
      setCombos(merged.combos);

      // 立即存入 IndexedDB
      await db.saveHistory(merged.history);
      await db.saveExercises(merged.exercises);
      await db.saveCombos(merged.combos);

      // 標記此裝置已完成初始化同步，納入後續備份排程
      localStorage.setItem(`fit_device_initialized_for_backup_${currentUser.uid}`, 'true');
      updateLastBackupDisplay(currentUser.uid);

      cloudReadyRef.current = true;
      alert("還原下載成功！已同步此裝置為最新的雲端備份狀態。");
    } catch (e: any) {
      console.error("Cloud restore failed", e);
      alert(`下載還原失敗：${e.message || String(e)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogIn = async () => {
    setIsSyncing(true);
    setAuthError(null);
    try {
      const user = await logInWithGoogle();
      
      const localHist = await db.getHistory();
      const localExs = await db.getExercises();
      const localCmbs = await db.getCombos();

      // 在合併前，先對目前的本地/訪客資料做一份備份
      backupGuestData(localHist, localExs, localCmbs);

      setCurrentUser(user);

      alert("登入成功！資料將自動與雲端同步。");
    } catch (e: any) {
      console.error("Login failed", e);
      const errorCode = e?.code || 'unknown';
      const errorMessage = e?.message || String(e);
      setAuthError({
        code: errorCode,
        message: errorMessage,
        origin: window.location.origin
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogOut = async () => {
    try {
      cloudReadyRef.current = false;
      cloudSnapshotRef.current = null;
      await logOut();
      setCurrentUser(null);
      
      // 登出時，恢復先前備份的本地/訪客資料 
      const hasBackup = localStorage.getItem('fit_guest_backup_exists') === 'true';
      if (hasBackup) {
        const backupHistory = localStorage.getItem('fit_guest_backup_history');
        const backupExercises = localStorage.getItem('fit_guest_backup_exercises');
        const backupCombos = localStorage.getItem('fit_guest_backup_combos');
        
        let restoredHist: WorkoutHistoryEntry[] = [];
        let restoredExs: Exercise[] = DEFAULT_EXERCISES;
        let restoredCmbs: Combo[] = DEFAULT_COMBOS;
        
        if (backupHistory) restoredHist = JSON.parse(backupHistory);
        if (backupExercises) restoredExs = JSON.parse(backupExercises);
        if (backupCombos) restoredCmbs = JSON.parse(backupCombos);
        
        setHistory(restoredHist);
        setExercises(restoredExs);
        setCombos(restoredCmbs);
        
        // 刪除備份，避免重複或髒資料
        localStorage.removeItem('fit_guest_backup_history');
        localStorage.removeItem('fit_guest_backup_exercises');
        localStorage.removeItem('fit_guest_backup_combos');
        localStorage.removeItem('fit_guest_backup_exists');
        console.log("Guest data restored successfully on logout.");
      } else {
        // 如果此裝置沒有備份過任何既有本地資料，則安全地重設為系統預設值（避免使用者資料殘留在本機上）
        setHistory([]);
        setExercises(DEFAULT_EXERCISES);
        setCombos(DEFAULT_COMBOS);
        console.log("No guest backup found. Reset to clean defaults.");
      }
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const handleSaveCombos = async (newCombos: Combo[]) => {
    // Identify deleted combos
    const deletedCombos = combos.filter(old => !newCombos.some(newC => newC.id === old.id));
    setCombos(newCombos);
    if (currentUser) {
      for (const combo of deletedCombos) {
        try {
          await deleteCombo(currentUser.uid, combo.id);
        } catch (err) {
          console.error("Failed to delete combo explicitly:", err);
        }
      }
    }
  };

  const handleSaveExercises = async (
    newExercises: Exercise[],
    renameInfo?: { oldName: string; newName: string }
  ) => {
    // 1. Synchronize workout history when exercise names are modified to preserve complete history continuity
    const renames: { oldName: string; newName: string }[] = [];
    if (renameInfo && renameInfo.oldName !== renameInfo.newName) {
      renames.push(renameInfo);
    } else {
      exercises.forEach((oldEx) => {
        const matching = newExercises.find((ne) => ne.id === oldEx.id);
        if (matching && matching.name !== oldEx.name) {
          renames.push({ oldName: oldEx.name, newName: matching.name });
        }
      });
    }

    if (renames.length > 0) {
      setHistory((prevHistory) =>
        prevHistory.map((entry) => {
          const match = renames.find((r) => r.oldName === entry.exerciseName);
          if (match) {
            return { ...entry, exerciseName: match.newName };
          }
          return entry;
        })
      );
    }

    // Identify deleted exercises
    const deletedExercises = exercises.filter((old) => !newExercises.some((newE) => newE.id === old.id));
    setExercises(newExercises);

    if (currentUser) {
      for (const ex of deletedExercises) {
        try {
          await deleteExercise(currentUser.uid, ex.id);
        } catch (err) {
          console.error("Failed to delete exercise explicitly:", err);
        }
      }
    }
  };

  const handleUpdateExercisePhoto = (exerciseId: string, photoBase64: string) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === exerciseId ? { ...ex, equipmentPhoto: photoBase64 } : ex))
    );
  };

  const goHome = () => {
    setIsCalendarOpen(false);
    setEditingComboId(null);
    setEditingExerciseId(null);
    setCurrentView(View.DASHBOARD);
  };

  const getExerciseInitialState = (exName: string) => {
    const entry = history.find(h => h.exerciseName === exName);
    const lastStats = entry && entry.detailedSets.length > 0 ? entry.detailedSets[entry.detailedSets.length - 1] : null;
    // 休息時間依動作記住：取此動作最近一次有設定的休息秒數
    let lastRest: number | undefined;
    for (const h of history) {
      if (h.exerciseName !== exName) continue;
      const withRest = [...h.detailedSets].reverse().find(s => typeof s.restTime === 'number');
      if (withRest) { lastRest = withRest.restTime; break; }
    }
    if (lastStats) {
      return {
        draft: { id: crypto.randomUUID(), weight: lastStats.weight, reps: lastStats.reps, isWarmup: false, isDropSet: lastStats.isDropSet || false, dropWeight: lastStats.dropWeight, dropReps: lastStats.dropReps, weightUnit: lastStats.weightUnit || 'kg', repsUnit: lastStats.repsUnit, timestamp: '' },
        timer: lastRest || 120
      };
    }
    return { draft: { id: crypto.randomUUID(), weight: 0, reps: 0, isWarmup: false, isDropSet: false, weightUnit: 'kg' as const, timestamp: '' }, timer: 120 };
  };

  // 在訓練進行中的抽屜把手監聽原生 touchmove，嚴格防止引發瀏覽器下拉重新整理
  useEffect(() => {
    const el = sheetHeaderRef.current;
    if (!el) return;

    const onTouchMove = (e: TouchEvent) => {
      // 只要觸控是從頂部手勢條開始拖曳，嚴格阻止瀏覽器的原生下拉重新整理與頁面拉扯手勢
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, [activeExercise, isSessionCollapsed]);

  const handleSheetTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
  };

  const handleSheetTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartYRef.current;

    if (Math.abs(deltaY) > 5) {
      hasDraggedRef.current = true;
    }

    if (!isSessionCollapsed) {
      if (deltaY > 0) setDragOffset(deltaY);
    } else {
      if (deltaY < 0) setDragOffset(deltaY);
    }
  };

  const handleSheetTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (dragOffset !== null) {
      if (!isSessionCollapsed && dragOffset > 50) {
        setIsSessionCollapsed(true);
      } else if (isSessionCollapsed && dragOffset < -35) {
        setIsSessionCollapsed(false);
      }
      setDragOffset(null);
    }
  };

  const handleSheetMouseDown = (e: React.MouseEvent) => {
    touchStartYRef.current = e.clientY;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = moveEvent.clientY - touchStartYRef.current;
      if (Math.abs(deltaY) > 5) {
        hasDraggedRef.current = true;
      }
      if (!isSessionCollapsed) {
        if (deltaY > 0) setDragOffset(deltaY);
      } else {
        if (deltaY < 0) setDragOffset(deltaY);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setDragOffset(prev => {
        if (prev !== null) {
          if (!isSessionCollapsed && prev > 50) {
            setIsSessionCollapsed(true);
          } else if (isSessionCollapsed && prev < -35) {
            setIsSessionCollapsed(false);
          }
        }
        return null;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleHeaderClick = () => {
    // 若方才執行過拖曳手勢，忽略隨後的點擊事件，避免剛下滑收折又被點擊展開反轉
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    if (dragOffset === null) {
      setIsSessionCollapsed(prev => !prev);
    }
  };

  const startSession = (exercise: Exercise, queue: Exercise[]) => {
    setActiveExercise(exercise);
    setActiveQueue(queue);
    setSessionSets([]);
    setSessionStore({});
    const { draft, timer } = getExerciseInitialState(exercise.name);
    setNextSetDraft(draft);
    setRestTimerDuration(timer);
    setSessionDate(getLocalDateString());
    setIsSessionCollapsed(false);
    const recCat = getRecommendedCategory(history, exercises);
    if (exercise.category === recCat) {
      setSelectedCategory('全部');
    } else if (exercise.category && exercise.category !== '全部') {
      setSelectedCategory(exercise.category);
    }
    setCurrentView(View.WORKOUT_SESSION);
  };

  const endSession = () => {
    let currentHistory = [...history];
    const saveToHistory = (exId: string, sets: SetData[]) => {
      const ex = exercises.find(e => e.id === exId);
      if (!ex || sets.length === 0) return;
      
      const summary = sets.map(s => {
        const unit = s.repsUnit === 'min' ? '分' : (ex.mode === 'DURATION' ? '秒' : '次');
        const prefix = s.isWarmup ? '[熱身] ' : '';
        const primary = `${s.weight}${s.weightUnit}x${s.reps}${unit}`;
        return `${prefix}${s.isDropSet ? `${primary} + ${s.dropWeight}${s.weightUnit}x${s.dropReps}${unit}` : primary}${rirSuffix(s.rir)}`;
      });

      currentHistory = [{ id: crypto.randomUUID(), date: sessionDate, exerciseName: ex.name, sets: summary, detailedSets: sets }, ...currentHistory];
    };

    if (activeExercise) saveToHistory(activeExercise.id, sessionSets);
    (Object.entries(sessionStore) as [string, ExerciseSessionState][]).forEach(([exId, state]) => {
      if (activeExercise && exId !== activeExercise.id) saveToHistory(exId, state.sets);
    });

    setHistory(currentHistory);
    setActiveExercise(null);
    setActiveQueue([]);
    setSessionSets([]);
    setSessionStore({});
    setIsRestTimerActive(false); 
    setRestTimerTargetTime(null);
    setIsSessionCollapsed(false);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    setCurrentView(View.DASHBOARD);
  };

  const handleBackup = () => {
    try {
      const data = { exercises: exercises, history: history, combos: combos };
      const fileName = `pro_fit_backup_${getLocalDateString()}.json`;
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Backup failed", e);
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['日期', '動作名稱', '組數', '重量', '單位', '次數', '單位類型', '備註'];
      const rows = history.flatMap(entry => 
        entry.detailedSets.map((set, index) => {
          const repsUnitDisplay = set.repsUnit === 'min' ? '分' : (set.repsUnit === 'sec' ? '秒' : '次');
          const note = set.isDropSet 
            ? `遞減: ${set.dropWeight || 0}${set.weightUnit || 'kg'} x ${set.dropReps || 0}${repsUnitDisplay}`
            : '';
          
          return [
            entry.date,
            entry.exerciseName,
            index + 1,
            set.weight,
            set.weightUnit || 'kg',
            set.reps,
            repsUnitDisplay,
            note
          ].map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(',');
        })
      );

      const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pro_fit_export_${getLocalDateString()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export CSV failed", e);
      alert("匯出失敗");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>, onlyImported: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (typeof content !== 'string') return;
        const data = JSON.parse(content);
        if (!data.exercises && !data.history && !data.combos) {
          alert('無效的檔案：缺少必要資料欄位');
          return;
        }
        const fileExercises = (data.exercises || []) as Exercise[];
        const fileHistory = (data.history || []) as WorkoutHistoryEntry[];
        const fileCombos = (data.combos || []) as Combo[];

        if (onlyImported) {
          // 點選「是」：內建預設動作將全數清除，改為僅保留匯入資料
          setExercises(fileExercises);
          if (fileCombos.length > 0) {
            setCombos(fileCombos);
          }
          const currentHistoryIds = new Set(history.map(h => h.id));
          const mergedHistory = [...history];
          fileHistory.forEach(h => { if (!currentHistoryIds.has(h.id)) mergedHistory.push(h); });
          mergedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setHistory(mergedHistory);

          alert(`匯入完成！已清除內建預設動作，改為僅保留匯入的 ${fileExercises.length} 個動作。`);
        } else {
          // 點選「否」：將匯入的資料與內建預設動作並存
          const currentExerciseIds = new Set(exercises.map(e => e.id));
          const currentExerciseNames = new Set(exercises.map(e => e.name));
          const newExercises = [...exercises];
          let addedCount = 0;
          fileExercises.forEach(ex => {
            if (!currentExerciseIds.has(ex.id) && !currentExerciseNames.has(ex.name)) {
              newExercises.push(ex);
              addedCount++;
            }
          });
          setExercises(newExercises);

          const currentComboIds = new Set(combos.map(c => c.id));
          const currentComboNames = new Set(combos.map(c => c.name));
          const newCombos = [...combos];
          fileCombos.forEach(c => {
            if (!currentComboIds.has(c.id) && !currentComboNames.has(c.name)) {
              newCombos.push(c);
            }
          });
          setCombos(newCombos);

          const currentHistoryIds = new Set(history.map(h => h.id));
          const mergedHistory = [...history];
          fileHistory.forEach(h => { if (!currentHistoryIds.has(h.id)) mergedHistory.push(h); });
          mergedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setHistory(mergedHistory);

          alert(`匯入完成！已將匯入資料與內建預設動作並存（新增 ${addedCount} 個動作）。`);
        }
      } catch (error) {
        console.error('Operation failed:', error);
        alert('操作失敗：檔案格式錯誤或損毀');
      } finally {
        if (e.target) {
          e.target.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden relative">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <div className={`flex-1 flex flex-col h-full transition-opacity duration-1000 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
        {(currentView === View.DASHBOARD || currentView === View.WORKOUT_SESSION) && (
          <div key="dashboard" className={`flex flex-col h-full animate-fade-in-up ${activeExercise && !isSessionCollapsed ? 'select-none pointer-events-none' : ''}`}>
            <TopNav 
              onExportCSV={handleExportCSV} 
              onBackup={handleBackup} 
              onImport={handleImport} 
              onGoToStats={() => setCurrentView(View.STATISTICS)} 
              onGoHome={goHome} 
              isDashboard={true} 
              user={currentUser}
              onLogIn={handleLogIn}
              onLogOut={handleLogOut}
              isSyncing={isSyncing}
              onCloudBackup={handleCloudBackup}
              onCloudRestore={handleCloudRestore}
              lastBackupText={lastBackupText}
            />
            <Dashboard 
              exercises={exercises} combos={combos} history={history} isCalendarOpen={isCalendarOpen} setIsCalendarOpen={setIsCalendarOpen}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onStartExercise={(ex) => startSession(ex, [ex])}
              onStartCombo={(combo) => {
                const queue = combo.exerciseIds.map(id => exercises.find(ex => ex.id === id)).filter(Boolean) as Exercise[];
                if (queue.length > 0) startSession(queue[0], queue);
              }}
              onEditCombos={() => setCurrentView(View.COMBO_EDITOR)}
              onEditExercises={() => setCurrentView(View.EXERCISE_EDITOR)}
              onUpdateHistory={(updated) => setHistory(prev => prev.map(h => h.id === updated.id ? updated : h))}
              onUpdateExercisePhoto={handleUpdateExercisePhoto}
              onDeleteHistory={async (id) => {
                setHistory(prev => prev.filter(h => h.id !== id));
                if (currentUser) {
                  try {
                    await deleteHistoryEntry(currentUser.uid, id);
                  } catch (err) {
                    console.error("Failed to delete history entry explicitly:", err);
                  }
                }
              }}
            />
          </div>
        )}
        {currentView === View.STATISTICS && (
          <div key="statistics" className="flex flex-col h-full animate-fade-in-up">
            <TopNav 
              onExportCSV={handleExportCSV} 
              onBackup={handleBackup} 
              onImport={handleImport} 
              onGoToStats={() => setCurrentView(View.STATISTICS)} 
              onGoHome={goHome} 
              isDashboard={false} 
              user={currentUser}
              onLogIn={handleLogIn}
              onLogOut={handleLogOut}
              isSyncing={isSyncing}
              onCloudBackup={handleCloudBackup}
              onCloudRestore={handleCloudRestore}
              lastBackupText={lastBackupText}
            />
            <Statistics exercises={exercises} history={history} onBack={goHome} />
          </div>
        )}
        {currentView === View.COMBO_EDITOR && (
          <div key={`combo-view-${editingComboId}`} className="flex-1 relative animate-slide-in-right">
            <ComboEditor combos={combos} exercises={exercises} editingId={editingComboId} setEditingId={setEditingComboId} onSave={handleSaveCombos} onBack={goHome} />
          </div>
        )}
        {currentView === View.EXERCISE_EDITOR && (
          <div key={`ex-view-${editingExerciseId}`} className="flex-1 relative animate-slide-in-right">
            <ExerciseEditor exercises={exercises} editingId={editingExerciseId} setEditingId={setEditingExerciseId} onSave={handleSaveExercises} onBack={goHome} />
          </div>
        )}

        {/* 訓練進行中 - 底部抽屜滑動面板 (保留頂部儀表板畫面並模糊化) */}
        {activeExercise && (currentView === View.DASHBOARD || currentView === View.WORKOUT_SESSION) && (
          <>
            {/* 上方露出的 Dashboard 模糊背景遮罩 (點選亦可下滑收折) */}
            <div 
              className={`fixed inset-0 z-[135] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
                isSessionCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
              }`}
              onClick={() => setIsSessionCollapsed(true)}
            />

            {/* 訓練進行中底部滑動面板 */}
            <div 
              className={`fixed inset-x-0 bottom-0 top-12 sm:top-14 z-[140] bg-slate-950 border-t border-slate-700/80 rounded-t-[2.5rem] shadow-[0_-25px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden will-change-transform overscroll-none ${
                dragOffset === null ? 'transition-transform duration-300 ease-out' : ''
              }`}
              style={{
                transform: dragOffset !== null 
                  ? (isSessionCollapsed 
                      ? `translateY(calc(100% - 76px + ${Math.min(0, dragOffset)}px))`
                      : `translateY(${Math.max(0, dragOffset)}px)`)
                  : (isSessionCollapsed 
                      ? 'translateY(calc(100% - 76px))' 
                      : 'translateY(0)')
              }}
            >
              {/* 頂部半透明手勢條 (支援觸控拖曳、滑鼠拖曳、以及點擊展開/收回；touch-none 徹底杜絕瀏覽器下拉重新整理) */}
              <div 
                ref={sheetHeaderRef}
                className="w-full shrink-0 flex flex-col items-center select-none cursor-pointer bg-slate-900 border-b border-slate-800/80 active:bg-slate-800 transition-colors pt-3 pb-2.5 touch-none overscroll-none"
                onTouchStart={handleSheetTouchStart}
                onTouchMove={handleSheetTouchMove}
                onTouchEnd={handleSheetTouchEnd}
                onMouseDown={handleSheetMouseDown}
                onClick={handleHeaderClick}
              >
                {/* 半透明手勢條橫線 (加大感應觸控寬度) */}
                <div className="w-16 h-1.5 rounded-full bg-slate-400/60 hover:bg-slate-300 active:bg-slate-200 transition-colors cursor-grab active:cursor-grabbing mb-1" />

                {/* 下滑收折至底部時：露出動作名稱、部位、已完成組數，點選或上滑可快速展開 */}
                {isSessionCollapsed && (
                  <div className="w-full px-5 pt-1 pb-1 flex items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
                        {activeExercise.category}
                      </span>
                      <span className="font-black text-sm sm:text-base text-white truncate">
                        {activeExercise.name}
                      </span>
                      {activeExercise.equipmentPhoto && (
                        <span className="text-[10px] text-teal-400 shrink-0" title="附器材照片">📷</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-400">
                        {sessionSets.length > 0 ? `已完成 ${sessionSets.length} 組` : '進行中'}
                      </span>
                      <span className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                        <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 訓練進行中主畫面 */}
              <div className={`flex-1 overflow-hidden flex flex-col ${isSessionCollapsed ? 'pointer-events-none' : ''}`}>
                <WorkoutSession 
                  exercise={activeExercise} queue={activeQueue} exercises={exercises} isCalendarOpen={isCalendarOpen} setIsCalendarOpen={setIsCalendarOpen}
                  fullHistory={history}
                  onSwitchExercise={(target) => {
                    if (activeExercise.id === target.id) return;
                    const recCat = getRecommendedCategory(history, exercises);
                    if (target.category !== recCat && target.category !== '全部') {
                      setSelectedCategory(target.category);
                    }
                    const currentExState: ExerciseSessionState = { sets: sessionSets, draft: nextSetDraft, timer: restTimerDuration };
                    const newStore = { ...sessionStore, [activeExercise.id]: currentExState };
                    setSessionStore(newStore);
                    const targetState = newStore[target.id];
                    setActiveExercise(target);
                    if (targetState) {
                        setSessionSets(targetState.sets);
                        setNextSetDraft(targetState.draft);
                        setRestTimerDuration(targetState.timer);
                    } else {
                        setSessionSets([]);
                        const { draft, timer } = getExerciseInitialState(target.name);
                        setNextSetDraft(draft);
                        setRestTimerDuration(timer);
                    }
                  }} 
                  onAddExerciseToQueue={(ex) => {
                    setActiveQueue(prev => [...prev, ex]);
                    const recCat = getRecommendedCategory(history, exercises);
                    if (ex.category !== recCat && ex.category !== '全部') {
                      setSelectedCategory(ex.category);
                    }
                  }}
                  onUpdateSessionSet={(updated) => setSessionSets(prev => prev.map(s => s.id === updated.id ? updated : s))} 
                  onDeleteSessionSet={(id) => setSessionSets(prev => prev.filter(s => s.id !== id))}
                  setNumber={sessionSets.length + 1} initialData={nextSetDraft} initialTimerSecs={restTimerDuration} sessionHistory={sessionSets}
                  onFinishSet={(data, timer) => {
                    const updated = { ...data, rir: null, restTime: timer };
                    setSessionSets(prev => [...prev, updated]);
                    setNextSetDraft({ ...updated, rir: undefined, id: crypto.randomUUID() });
                    setRirPromptSetId(updated.isWarmup ? null : updated.id);
                    setRestTimerDuration(timer);
                    const now = Date.now();
                    setLastSetFinishedAt(now);
                    setRestTimerTargetTime(now + timer * 1000);
                    setIsRestTimerActive(true);
                    setCurrentView(View.REST_TIMER);
                  }} 
                  onEndExercise={endSession} sessionDate={sessionDate} setSessionDate={setSessionDate} 
                />
              </div>
            </div>
          </>
        )}
        {rirPromptSetId && sessionSets.some(s => s.id === rirPromptSetId) && (
          <div className="fixed left-0 right-0 bottom-0 z-[3000] p-4 pb-6 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-slide-up">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-black text-slate-400 uppercase">這組還能再做幾下？（RIR）</span>
              <button onClick={() => setRirPromptSetId(null)} className="px-3 py-1 bg-slate-800 rounded-lg text-slate-400 text-xs font-bold">跳過</button>
            </div>
            <RirPicker size="md" value={null} onChange={(v) => { const id = rirPromptSetId; setSessionSets(prev => prev.map(s => s.id === id ? { ...s, rir: v } : s)); setRirPromptSetId(null); }} />
          </div>
        )}
        {isRestTimerActive && (
          <RestTimer 
            initialSeconds={restTimerDuration}
            targetEndTime={restTimerTargetTime ?? (lastSetFinishedAt ? lastSetFinishedAt + restTimerDuration * 1000 : undefined)}
            onTargetTimeChange={(newTarget) => setRestTimerTargetTime(newTarget)}
            nextSetDraft={nextSetDraft}
            lastSetFinishedAt={lastSetFinishedAt}
            isMinimized={currentView !== View.REST_TIMER}
            onMinimize={() => { setCurrentView(View.WORKOUT_SESSION); setIsSessionCollapsed(false); }} 
            onExpand={() => setCurrentView(View.REST_TIMER)}
            onSkip={(draft) => {
              setNextSetDraft(draft);
              setIsRestTimerActive(false);
              setRestTimerTargetTime(null);
              setCurrentView(View.WORKOUT_SESSION);
              setIsSessionCollapsed(false);
            }} 
          />
        )}
      </div>
      {autoBackupToast && (
        <div className="fixed top-16 right-4 z-[150] max-w-xs sm:max-w-sm bg-slate-900/95 border border-emerald-500/40 text-slate-100 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in-down pointer-events-none">
          <span className="flex h-2.5 w-2.5 relative flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div className="text-xs font-bold text-emerald-300 leading-snug">
            {autoBackupToast}
          </div>
        </div>
      )}
      <AuthErrorModal error={authError} onClose={() => setAuthError(null)} />

      {newDeviceRestorePromptOpen && (
        <ConfirmModal
          title="偵測到雲端備份"
          message="偵測到您的 Google 帳號在雲端已有訓練歷史紀錄！此新裝置目前尚未同步，是否立即從雲端下載還原至此裝置？"
          confirmText="立即下載還原"
          cancelText="稍後手動處理"
          isDangerous={false}
          onConfirm={async () => {
            setNewDeviceRestorePromptOpen(false);
            await handleCloudRestore(true);
          }}
          onCancel={() => {
            setNewDeviceRestorePromptOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default App;
