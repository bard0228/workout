
import React, { useState, useEffect, useRef } from 'react';
import { LogIn, LogOut, RefreshCw, Cloud, UploadCloud, DownloadCloud } from 'lucide-react';
import ImportConfirmModal from './ImportConfirmModal';

interface TopNavProps {
  onExportCSV: () => void;
  onBackup: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>, onlyImported: boolean) => void;
  onGoToStats: () => void;
  onGoHome: () => void;
  isDashboard: boolean;
  user: any | null;
  onLogIn: () => void;
  onLogOut: () => void;
  isSyncing: boolean;
  onCloudBackup: () => void;
  onCloudRestore: () => void;
  lastBackupText?: string;
}

const TopNav: React.FC<TopNavProps> = ({ 
  onExportCSV, 
  onBackup, 
  onImport, 
  onGoToStats, 
  onGoHome, 
  isDashboard,
  user,
  onLogIn,
  onLogOut,
  isSyncing,
  onCloudBackup,
  onCloudRestore,
  lastBackupText
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const importModeRef = useRef<boolean>(false);
  
  // 使用 Ref 來操作隱藏的 Input 元素
  const importInputRef = useRef<HTMLInputElement>(null);

  // 監聽 PopState 事件（返回手勢），當選單開啟時，將其關閉
  useEffect(() => {
    const handlePopState = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen]);

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const toggleMenu = () => {
    if (isOpen) {
      // 如果已開啟，使用 back 來觸發 popstate 以關閉選單，保持歷史紀錄乾淨
      window.history.back();
    } else {
      // 開啟時，推入一個帶有標記的 state，這樣返回手勢就可以捕捉到
      window.history.pushState({ ...window.history.state, menuOpen: true }, '');
      setIsOpen(true);
    }
  };

  const closeMenuBackdrop = () => {
    // 點擊背景關閉時，同樣使用 back 模擬返回，以清除 menuOpen 的歷史狀態
    if (isOpen) {
        window.history.back();
    }
  };

  // 處理導航動作：先退回歷史紀錄（關閉選單），再執行跳轉
  const handleNav = (action: () => void) => {
    if (isOpen) {
        window.history.back(); // 關閉選單並移除歷史堆疊中的 menuOpen
        // 稍微延遲以確保 popstate 完成後再進行頁面切換
        setTimeout(() => {
            action();
        }, 50);
    } else {
        action();
    }
  };

  // 處理動作（如匯出、備份）：
  const handleAction = (action: () => void) => {
    // 先執行動作，確保下載等操作能被瀏覽器捕捉
    action();
    triggerToast();

    // 稍微延遲後再關閉選單，避免同步的 state 變更（history.back）干擾下載啟動
    if (isOpen) {
        setTimeout(() => {
            window.history.back();
        }, 300);
    }
  };

  // 觸發「匯入 (合併)」流程：關閉選單並跳出確認視窗
  const handleImportClick = () => {
    if (isOpen) {
      window.history.back();
    }
    setShowImportConfirm(true);
  };

  const handleSelectImportMode = (onlyImported: boolean) => {
    importModeRef.current = onlyImported;
    setShowImportConfirm(false);
    // 立即在使用者點擊手勢中觸發檔案選擇器
    importInputRef.current?.click();
  };

  const handleCancelImport = () => {
    setShowImportConfirm(false);
  };

  // 統一處理檔案變更後的邏輯
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>, handler: (e: React.ChangeEvent<HTMLInputElement>) => void) => {
    if (e.target.files && e.target.files.length > 0) {
        handler(e);
        // 注意：這裡不立即觸發 Toast，因為覆蓋模式如果使用者取消確認，就不該顯示成功
        // 但為了簡化邏輯與 UI 反饋，這裡還是先顯示選取成功，具體操作結果由 Alert 提示
        triggerToast();
        
        // 讀取觸發後再延遲關閉選單
        if (isOpen) {
            setTimeout(() => {
                window.history.back();
            }, 300);
        }
    }
  };

  return (
    <>
      {/* Global Blur Backdrop for the entire screen */}
      <div 
        className={`fixed inset-0 z-[110] bg-black/40 backdrop-blur-2xl cursor-default transition-all duration-[350ms] ease-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`} 
        onClick={closeMenuBackdrop}
      />

      <nav className="sticky top-0 z-[120] bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 relative z-[130]">
          {/* Dumbbell Icon Button */}
          <button 
            onClick={toggleMenu}
            className={`w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-blue-600/40 active:scale-75 hover:scale-105 transition-all duration-[400ms] ${isOpen ? 'rotate-180 bg-blue-500 scale-110' : 'rotate-0'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2M7 7h10M5 11h14M7 17h10M11 19h2" />
            </svg>
          </button>
          <span className="text-xl font-black tracking-tighter text-slate-100 select-none">PRO WORKOUT</span>
        </div>

        {/* Dropdown Menu - Smooth scale & opacity animation expanding from / retracting into the dumbbell icon */}
        <div 
          className={`absolute left-4 top-16 w-64 bg-slate-900/95 backdrop-blur-3xl border border-slate-700/50 rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,1)] z-[130] overflow-hidden origin-top-left transition-all duration-[350ms] ${
            isOpen 
              ? 'opacity-100 scale-100 translate-x-0 translate-y-0 pointer-events-auto ease-[cubic-bezier(0.16,1,0.3,1)]' 
              : 'opacity-0 scale-0 -translate-x-3 -translate-y-4 pointer-events-none ease-[cubic-bezier(0.7,0,0.84,0)]'
          }`}
        >
            <div className="p-3 space-y-1.5">
              
              <div className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] border-b border-slate-800/50 mb-1">頁面導航</div>
              
              {!isDashboard ? (
                <button 
                  onClick={() => handleNav(onGoHome)} 
                  className="w-full text-left px-5 py-4 text-sm font-bold text-slate-300 hover:bg-blue-600 hover:text-white rounded-2xl transition-all active:scale-95 flex items-center gap-4 group"
                >
                  <div className="bg-slate-800 group-hover:bg-blue-500 p-2 rounded-xl transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  </div>
                  回到首頁
                </button>
              ) : (
                <button 
                  onClick={() => handleNav(onGoToStats)} 
                  className="w-full text-left px-5 py-4 text-sm font-bold text-slate-300 hover:bg-blue-600 hover:text-white rounded-2xl transition-all active:scale-95 flex items-center gap-4 group"
                >
                  <div className="bg-slate-800 group-hover:bg-blue-500 p-2 rounded-xl transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                  </div>
                  統計圖表
                </button>
              )}

              <div className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] border-b border-slate-800/50 mb-1 mt-2">資料管理</div>
              
              <button 
                onClick={() => handleAction(onExportCSV)} 
                className="w-full text-left px-5 py-4 text-sm font-bold text-slate-300 hover:bg-blue-600 hover:text-white rounded-2xl transition-all active:scale-95 flex items-center gap-4 group"
              >
                <div className="bg-slate-800 group-hover:bg-blue-500 p-2 rounded-xl transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </div>
                匯出 CSV 報表
              </button>
              <button 
                onClick={() => handleAction(onBackup)} 
                className="w-full text-left px-5 py-4 text-sm font-bold text-slate-300 hover:bg-blue-600 hover:text-white rounded-2xl transition-all active:scale-95 flex items-center gap-4 group"
              >
                <div className="bg-slate-800 group-hover:bg-blue-500 p-2 rounded-xl transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                </div>
                備份完整資料
              </button>

              {/* 匯入資料 (合併) - 按鈕 UI */}
              <button 
                onClick={handleImportClick}
                className="w-full text-left px-5 py-4 text-sm font-bold text-slate-300 hover:bg-blue-600 hover:text-white rounded-2xl transition-all active:scale-95 flex items-center gap-4 group"
              >
                <div className="bg-slate-800 group-hover:bg-blue-500 p-2 rounded-xl transition-colors">
                   {/* 新增文件圖示 (Document Add) */}
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                匯入資料
              </button>
              {/* 隱藏的 Input 用於匯入 */}
              <input 
                  ref={importInputRef}
                  type="file" 
                  className="hidden" 
                  accept=".json" 
                  onChange={(e) => onFileChange(e, (event) => onImport(event, importModeRef.current))} 
              />

              {/* 帳號同步 */}
              <div className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] border-b border-slate-800/50 mb-1 mt-2">帳號同步</div>
              {!user ? (
                <button 
                  onClick={() => {
                    if (isOpen) {
                      window.history.back();
                      setIsOpen(false);
                    }
                    onLogIn();
                  }}
                  className="w-full text-left px-5 py-4 text-sm font-bold text-slate-300 hover:bg-blue-600 hover:text-white rounded-2xl transition-all active:scale-95 flex items-center gap-4 group"
                >
                  <div className="bg-slate-800 group-hover:bg-blue-500 p-2 rounded-xl transition-colors">
                    <LogIn className="w-5 h-5" />
                  </div>
                  登入 Google 帳號
                </button>
              ) : (
                <div className="space-y-2 p-1">
                  <div className="px-4 py-3.5 bg-slate-950/40 rounded-2xl border border-slate-800/40 min-w-0">
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <img referrerPolicy="no-referrer" src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-blue-500/50" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm">
                          {user.displayName?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black text-slate-100 truncate">{user.displayName || '使用者'}</div>
                        <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-col gap-1 text-[10px] font-bold text-slate-400">
                      <div className="flex items-center gap-2">
                        {isSyncing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                            <span className="text-blue-400 animate-pulse">正在備份/同步資料...</span>
                          </>
                        ) : (
                          <>
                            <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-500">雲端同步已就緒</span>
                          </>
                        )}
                      </div>
                      {lastBackupText && (
                        <div className="text-[9px] text-slate-400 font-medium pl-5.5">
                          {lastBackupText}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 手動雲端備份上傳與還原下載按鈕 */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={isSyncing}
                      onClick={() => {
                        onCloudBackup();
                      }}
                      className="flex flex-col items-center justify-center p-3.5 bg-blue-600/10 hover:bg-slate-800 border border-blue-500/20 hover:border-blue-500/50 rounded-2xl transition-all duration-300 group disabled:opacity-50 disabled:pointer-events-none active:scale-95"
                    >
                      <UploadCloud className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                      <span className="text-[10px] font-black mt-1.5 text-blue-300 group-hover:text-blue-100 transition-colors">備份上傳</span>
                    </button>
                    <button
                      disabled={isSyncing}
                      onClick={() => {
                        onCloudRestore();
                      }}
                      className="flex flex-col items-center justify-center p-3.5 bg-emerald-600/10 hover:bg-slate-800 border border-emerald-500/20 hover:border-emerald-500/50 rounded-2xl transition-all duration-300 group disabled:opacity-50 disabled:pointer-events-none active:scale-95"
                    >
                      <DownloadCloud className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                      <span className="text-[10px] font-black mt-1.5 text-emerald-300 group-hover:text-emerald-100 transition-colors">還原下載</span>
                    </button>
                  </div>

                  <button 
                    onClick={() => {
                      if (isOpen) {
                        window.history.back();
                        setIsOpen(false);
                      }
                      onLogOut();
                    }}
                    className="w-full text-left px-5 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl transition-all active:scale-95 flex items-center gap-3 group"
                  >
                    <LogOut className="w-4 h-4 text-rose-400 group-hover:text-rose-300" />
                    登出帳戶
                  </button>
                </div>
              )}

            </div>
          </div>

        {/* Success Toast */}
        {showToast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-4 bg-blue-600 text-white px-8 py-5 rounded-full shadow-[0_20px_50px_rgba(37,99,235,0.5)] animate-fade-in-up duration-[400ms]">
            <div className="bg-white text-blue-600 p-1 rounded-full scale-110">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-black text-sm uppercase tracking-widest">操作已成功完成</span>
          </div>
        )}

        {/* 匯入確認視窗 */}
        <ImportConfirmModal
          isOpen={showImportConfirm}
          onSelectOption={handleSelectImportMode}
          onCancel={handleCancelImport}
        />
      </nav>
    </>
  );
};

export default TopNav;
