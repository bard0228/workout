
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SetData } from '../types';

interface RestTimerProps {
  nextSetDraft: SetData;
  initialSeconds?: number;
  targetEndTime?: number; // 絕對結束時間戳 (毫秒)
  onTargetTimeChange?: (newTargetTime: number) => void;
  lastSetFinishedAt: number; // 監聽組數完成的時間戳
  isMinimized?: boolean; 
  onMinimize?: () => void; 
  onExpand?: () => void; 
  onSkip: (draft: SetData) => void;
}

const workerCode = `
self.onmessage = function(e) {
  if (e.data === 'start') {
    self.timerId = setInterval(() => {
      self.postMessage('tick');
    }, 100);
  } else if (e.data === 'stop') {
    if (self.timerId) {
      clearInterval(self.timerId);
      self.timerId = null;
    }
  }
};
`;

const RestTimer: React.FC<RestTimerProps> = ({ 
  nextSetDraft, 
  initialSeconds = 120, 
  targetEndTime,
  onTargetTimeChange,
  lastSetFinishedAt,
  isMinimized = false,
  onMinimize,
  onExpand,
  onSkip 
}) => {
  // 精準計算倒數目標時間：若有保留的 targetEndTime 或 lastSetFinishedAt，依真實時間差還原剩餘秒數
  const computeInitialTarget = () => {
    const now = Date.now();
    if (targetEndTime && targetEndTime > now) {
      return targetEndTime;
    }
    if (lastSetFinishedAt && lastSetFinishedAt > 0) {
      const computed = lastSetFinishedAt + initialSeconds * 1000;
      if (computed > now) return computed;
    }
    return now + initialSeconds * 1000;
  };

  const initialTarget = computeInitialTarget();
  const initialRemaining = Math.max(0, Math.ceil((initialTarget - Date.now()) / 1000));

  const [remainingSeconds, setRemainingSeconds] = useState(initialRemaining);
  const [isWakeLocked, setIsWakeLocked] = useState(false);
  const targetTimeRef = useRef<number>(initialTarget);
  const lastVibratedSecondRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wakeLockRef = useRef<any>(null);
  const isFirstMountRef = useRef(true); 

  // 拖動相關狀態
  const [pos, setPos] = useState({ 
    x: window.innerWidth - 88, // 初始位置接近 right-6 (24px)
    y: window.innerHeight - 180 // 初始位置接近 bottom-36 (144px)
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // 用於追蹤已經處理過的完成時間戳，防止單純因切換動作導致的 initialSeconds 變更觸發重置
  const handledFinishedAtRef = useRef<number>(lastSetFinishedAt);

  const onSkipRef = useRef(onSkip);
  const nextSetDraftRef = useRef(nextSetDraft);

  useEffect(() => {
    onSkipRef.current = onSkip;
    nextSetDraftRef.current = nextSetDraft;
  }, [onSkip, nextSetDraft]);

  // 監聽組數完成邏輯
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      handledFinishedAtRef.current = lastSetFinishedAt;
      return;
    }
    
    // 只有當 lastSetFinishedAt 真正變大（即完成新組數）時才重置
    if (lastSetFinishedAt > handledFinishedAtRef.current) {
      handledFinishedAtRef.current = lastSetFinishedAt;
      const newTarget = Date.now() + initialSeconds * 1000;
      targetTimeRef.current = newTarget;
      if (onTargetTimeChange) {
        onTargetTimeChange(newTarget);
      }
      setRemainingSeconds(initialSeconds);
      requestWakeLock(); 
    }
  }, [lastSetFinishedAt, initialSeconds, onTargetTimeChange]);

  // 拖拽處理
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    hasMovedRef.current = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { x: clientX - pos.x, y: clientY - pos.y };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      let newX = clientX - dragStartRef.current.x;
      let newY = clientY - dragStartRef.current.y;
      
      // 限制在螢幕範圍內
      newX = Math.max(10, Math.min(newX, window.innerWidth - 74));
      newY = Math.max(10, Math.min(newY, window.innerHeight - 74));
      
      if (Math.abs(newX - pos.x) > 5 || Math.abs(newY - pos.y) > 5) {
        hasMovedRef.current = true;
      }
      
      setPos({ x: newX, y: newY });
    };

    const handleEnd = () => {
      if (!isDragging) return;
      setIsDragging(false);
      
      // 自動吸附邏輯
      const buttonWidth = 64;
      const padding = 24;
      const centerX = pos.x + buttonWidth / 2;
      const snapX = centerX < window.innerWidth / 2 ? padding : window.innerWidth - buttonWidth - padding;
      
      setPos(prev => ({ ...prev, x: snapX }));
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, pos]);

  const handleExpandClick = (e: React.MouseEvent) => {
    if (!hasMovedRef.current && onExpand) {
      onExpand();
    }
  };

  const playBeep = (freq: number, duration: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.05, audioCtx.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  };

  const sendNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = '休息結束！';
      const options = {
        body: '休息時間到囉，該開始下一組訓練了！',
        icon: 'https://cdn-icons-png.flaticon.com/512/2964/2964514.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/2964/2964514.png',
        vibrate: [200, 100, 200],
        tag: 'workout-rest-end',
        renotify: true
      };

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, options);
        });
      } else {
        new Notification(title, options);
      }
    }
  };

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        if (wakeLockRef.current) return;
        const sentinel = await (navigator as any).wakeLock.request('screen');
        sentinel.addEventListener('release', () => {
          wakeLockRef.current = null;
          setIsWakeLocked(false);
        });
        wakeLockRef.current = sentinel;
        setIsWakeLocked(true);
      } catch (err: any) {
        useVideoHack();
      }
    } else {
      useVideoHack();
    }
  };

  const useVideoHack = () => {
    if (videoRef.current) {
      videoRef.current.play().then(() => {
        setIsWakeLocked(true);
      }).catch(e => {
        console.warn('Video Hack 播放失敗', e);
      });
    }
  };

  useEffect(() => {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerScript = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerScript);

    workerRef.current.onmessage = () => {
      const now = Date.now();
      const left = Math.ceil((targetTimeRef.current - now) / 1000);
      
      if (left !== lastVibratedSecondRef.current) {
        if (left >= 1 && left <= 3) {
          playBeep(880, 0.1); 
        } else if (left === 0) {
          playBeep(440, 0.6); 
          sendNotification(); 
        }

        if (left <= 3 && left > 0) {
          if (navigator.vibrate) navigator.vibrate(200);
        }
        lastVibratedSecondRef.current = left;
      }

      if (left <= 0) {
        setRemainingSeconds(0);
        if (navigator.vibrate) navigator.vibrate(800);
        workerRef.current?.postMessage('stop');
        onSkipRef.current(nextSetDraftRef.current);
      } else {
        setRemainingSeconds(left);
      }
    };

    workerRef.current.postMessage('start');
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      workerRef.current?.terminate();
      URL.revokeObjectURL(workerScript);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); 

  const addTime = (amount: number) => {
    targetTimeRef.current += amount * 1000;
    if (onTargetTimeChange) {
      onTargetTimeChange(targetTimeRef.current);
    }
    const now = Date.now();
    const left = Math.ceil((targetTimeRef.current - now) / 1000);
    setRemainingSeconds(Math.max(0, left));
    requestWakeLock();
  };

  const isUrgent = remainingSeconds <= 10;

  if (isMinimized) {
    return createPortal(
      <button 
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onClick={handleExpandClick}
        style={{ 
          left: `${pos.x}px`, 
          top: `${pos.y}px`,
          transition: isDragging ? 'none' : 'left 0.3s ease-out, top 0.3s ease-out'
        }}
        className="fixed z-[3000] w-16 h-16 rounded-full glass-panel border border-blue-500/30 flex flex-col items-center justify-center shadow-2xl shadow-blue-500/20 animate-scale-in group overflow-hidden touch-none"
      >
        <div className="absolute inset-0 bg-blue-600/10 animate-pulse pointer-events-none"></div>
        <span className={`text-lg font-black tabular-nums transition-colors pointer-events-none ${isUrgent ? 'text-red-500' : 'text-blue-500'}`}>
          {remainingSeconds}
        </span>
        <span className="text-[8px] font-black text-slate-500 -mt-1 uppercase tracking-widest pointer-events-none">REST</span>
      </button>,
      document.body
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black select-none animate-fade-in duration-[400ms]">
      <video ref={videoRef} className="hidden" loop muted playsInline src="data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21hc2gxAAAACHN0eXByZ3AxAAAAAG1vb3YAAABsbXZoZAAAAADNoM+hzaDPoQAAOEAAAAABAAEAAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAbXRyYWsAAAB0a2hkAAAAAc2gz6HNoM+hAAAAAQAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAZWR0cwAAABxlbHN0AAAAAAAAAAEAAAEAAAAAAAEAAAAAAABtZGlhAAAAIG1kaGQAAAAAz6DPoc+gz6EAAEAAAAABAAAAAAAAAAAAAAAAbWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAAB2aWRlbwAAAABtaW5mAAAAFHZtaGQAAAABAAAAAAAAAAAAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAABpc3RibAAAACpzdGJsAAAAGnN0c2QAAAAAAAAAAQAAABptcDR2AAAAAAAAAAEAAAAAAAAAAA==" />
      <style>{`
        @keyframes ghost-expand { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(2.5); opacity: 0; } }
        .animate-ghost-expand { animation: ghost-expand 0.8s cubic-bezier(0, 0, 0.2, 1) forwards; }
        @keyframes urgent-flash { 0%, 100% { opacity: 1; filter: brightness(1); } 50% { opacity: 0.4; filter: brightness(1.3); } }
        .animate-urgent-flash { animation: urgent-flash 0.8s ease-in-out infinite; }
      `}</style>
      <div className={`absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b transition-colors duration-1000 pointer-events-none ${isUrgent ? 'from-red-900/20' : 'from-blue-900/10'} to-transparent`}></div>
      <div className="absolute top-10 left-6 z-20">
        <button onClick={onMinimize} className="flex items-center gap-3 px-6 py-3 bg-slate-900/50 border border-slate-800 rounded-full text-sm font-bold text-slate-400 active:scale-90 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          暫時返回紀錄
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 pb-20">
        <div className="flex flex-col items-center mb-8">
          <div className={`mb-6 transition-colors duration-300 drop-shadow-[0_0_25px_rgba(37,99,235,0.6)] ${isUrgent ? 'text-red-500 animate-urgent-flash' : 'text-blue-600 animate-pulse'}`}>
             <svg xmlns="http://www.w3.org/2000/svg" className="w-20 h-20 animate-[spin_6s_linear_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2M7 7h10M5 11h14M7 17h10M11 19h2" />
             </svg>
          </div>
          <span className={`text-sm font-black uppercase tracking-[0.5em] mr-[-0.5em] text-shadow-sm transition-colors duration-300 ${isUrgent ? 'text-red-500' : 'text-blue-500'}`}>組間休息</span>
        </div>
        <div className="relative flex justify-center items-center w-full">
           {isUrgent && remainingSeconds > 0 && (
             <div key={`ghost-${remainingSeconds}`} className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <div className="text-[35vw] sm:text-[20rem] font-black leading-none tabular-nums text-red-500 animate-ghost-expand">{remainingSeconds}</div>
             </div>
           )}
           <div className={`text-[35vw] sm:text-[20rem] font-black leading-none tabular-nums transition-colors duration-300 relative z-10 ${isUrgent ? 'text-red-500 drop-shadow-[0_0_80px_rgba(239,68,68,0.6)]' : 'text-white drop-shadow-[0_0_60px_rgba(37,99,235,0.4)]'}`}>{remainingSeconds}</div>
          <span className={`absolute -bottom-4 right-4 font-black text-xl transition-colors duration-300 ${isUrgent ? 'text-red-500/50' : 'text-slate-500'}`}>SEC</span>
        </div>
        <div className="flex gap-4 mt-12 z-20">
           <button onClick={() => addTime(-10)} className="w-16 h-16 rounded-full border border-slate-800 bg-slate-900/50 text-slate-400 font-black text-lg flex items-center justify-center active:scale-90 active:bg-blue-600 active:text-white transition-all hover:bg-slate-800">-10</button>
           <button onClick={() => addTime(30)} className="w-16 h-16 rounded-full border border-slate-800 bg-slate-900/50 text-slate-400 font-black text-lg flex items-center justify-center active:scale-90 active:bg-blue-600 active:text-white transition-all hover:bg-slate-800">+30</button>
        </div>
      </div>
      <div className="flex-shrink-0 w-full p-4 bg-gradient-to-t from-black via-black/90 to-transparent pt-12 pb-8 z-20">
        <button onClick={() => onSkip(nextSetDraftRef.current)} className={`w-full py-6 bg-slate-900 border border-slate-800 rounded-3xl font-black text-xl uppercase tracking-[0.2em] active:scale-[0.98] active:bg-slate-800 transition-all flex items-center justify-center gap-3 hover:text-white ${isUrgent ? 'text-red-500' : 'text-slate-200'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          SKIP
        </button>
      </div>
    </div>
  );
};

export default RestTimer;
