
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 停留 1.5 秒讓使用者看到 Logo
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, 1500);

    // 等待出場動畫結束 (500ms) 後，通知父層切換狀態
    const cleanup = setTimeout(() => {
      onFinish();
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(cleanup);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center transition-all duration-500 ease-out ${
        isExiting ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <div className={`flex flex-col items-center transition-all duration-700 ${isExiting ? 'scale-90' : 'animate-pulse'}`}>
        {/* Logo Icon */}
        <div className="w-28 h-28 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-[0_0_80px_rgba(37,99,235,0.5)] mb-8 transform -rotate-12 border border-blue-400/30">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5h2M7 7h10M5 11h14M7 17h10M11 19h2" />
           </svg>
        </div>
        {/* Text */}
        <h1 className="text-4xl font-black text-white tracking-tighter mb-3 drop-shadow-2xl">PRO WORKOUT</h1>
        <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-blue-600/50"></div>
            <p className="text-[10px] font-black text-blue-500 tracking-[0.5em] uppercase text-shadow-sm">Minimalist Fitness</p>
            <div className="h-px w-8 bg-blue-600/50"></div>
        </div>
      </div>
      
      {/* Loading Indicator */}
      <div className="absolute bottom-12 flex gap-1.5">
         <div className="w-1.5 h-1.5 bg-slate-700 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
         <div className="w-1.5 h-1.5 bg-slate-700 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
         <div className="w-1.5 h-1.5 bg-slate-700 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
};

export default SplashScreen;
