import React from 'react';
import { X, AlertCircle, Copy, Check, ExternalLink } from 'lucide-react';

interface AuthErrorModalProps {
  error: {
    code: string;
    message: string;
    origin: string;
  } | null;
  onClose: () => void;
}

const AuthErrorModal: React.FC<AuthErrorModalProps> = ({ error, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!error) return null;

  const originUrl = error.origin;
  const hostname = new URL(originUrl).hostname;

  // 判斷錯誤類型
  const isUnauthorizedDomain = error.code === 'auth/unauthorized-domain';
  const isPopupBlocked = error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user';
  const isWebStorageUnsupported = error.code === 'auth/web-storage-unsupported' || error.message.includes('storage');

  const handleCopyHost = () => {
    navigator.clipboard.writeText(hostname);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        id="auth-error-card"
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800/80 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-modal-pop"
      >
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600"></div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-slate-800/60 text-slate-400 hover:text-slate-100 rounded-full flex items-center justify-center backdrop-blur-sm active:scale-90 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {/* Main Icon and Title */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center shrink-0 border border-rose-500/20">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-100 tracking-tight">Google 登入失敗</h3>
              <p className="text-xs text-rose-400 font-mono mt-1 pr-10 truncate" title={error.code}>
                代碼: {error.code}
              </p>
            </div>
          </div>

          {/* Core Error Information Card */}
          <div className="bg-slate-950/50 rounded-2xl border border-slate-800/50 p-4 mb-6">
            <div className="text-xs text-slate-400 leading-relaxed font-bold">
              {isUnauthorizedDomain ? (
                <>您的部署/執行網域 <span className="text-amber-400 font-mono underline">{hostname}</span> 目前尚未被新增至您的 Firebase 授權網域清單。這導致 Google 登入驗證被安全性機制拒絕。</>
              ) : isPopupBlocked ? (
                <>您的瀏覽器封鎖了 Google 驗證的彈出視窗，或者您在登入流程完成前將其關閉。這在手機 App (如 LINE, FB / Messenger) 的內置瀏覽器中極為常見。</>
              ) : isWebStorageUnsupported ? (
                <>您的瀏覽器目前停用了第三方儲存空間 (LocalStorage/Cookies)。或是您可能開啟了防止跨網站追蹤、無痕私密模式，導致 Firebase Auth Auth 無法正常初始化。</>
              ) : (
                <>Google 驗證過程中遇到預期之外的問題。錯誤詳細資訊：{error.message || '無詳細訊息'}</>
              )}
            </div>
          </div>

          {/* Actionable Steps Panel */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">建議排除步驟：</h4>

            {isUnauthorizedDomain && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between p-3.5 bg-slate-800/40 rounded-xl border border-slate-800">
                  <div className="min-w-0 pr-3">
                    <div className="text-[10px] uppercase tracking-wider font-black text-slate-500">網域位置 (請點擊複製)</div>
                    <div className="text-sm font-mono text-slate-200 select-all truncate">{hostname}</div>
                  </div>
                  <button 
                    onClick={handleCopyHost}
                    className={`shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${copied ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        已複製
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        複製
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed pl-1.5">
                  <div className="flex gap-2">
                    <span className="text-blue-500 font-black">1.</span>
                    <span>前往您的 <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-bold inline-flex items-center gap-0.5">Firebase 控制台 <ExternalLink className="w-3 h-3.5" /></a> 並點選您的專案</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-blue-500 font-black">2.</span>
                    <span>切換到左側 <strong className="text-slate-100 font-bold">Authentication (驗證)</strong> ⮕ 點選頂部的 <strong className="text-slate-100 font-bold">Settings (設定)</strong> 分頁</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-blue-500 font-black">3.</span>
                    <span>點擊左側清單的 <strong className="text-slate-100 font-bold">Authorized domains (授權網域)</strong> ⮕ 點擊右側的「新增網域」</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-blue-500 font-black">4.</span>
                    <span>將上方已複製的貼上，然後點選「新增」儲存後即可解決！</span>
                  </div>
                </div>
              </div>
            )}

            {isPopupBlocked && (
              <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed pl-1.5">
                <div className="flex gap-2">
                  <span className="text-rose-500 font-black">●</span>
                  <span><strong className="text-slate-100 font-bold">不使用 App 內建瀏覽器</strong>：若您目前是在 LINE 或 Facebook/Messenger 裡面直接開啟本 App，請點擊螢幕右上角選單「...」⮕ 選擇<strong className="text-blue-400 font-bold underline">「使用預設瀏覽器開啟」</strong>(如 Chrome 或 Safari) 再試。</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-rose-500 font-black">●</span>
                  <span><strong className="text-slate-100 font-bold">允許彈出視窗</strong>：請注意您的網址列右側，是否提示「已封鎖彈出視窗」，請選取「一律允許此網站的彈出式視窗並重新整理」。</span>
                </div>
              </div>
            )}

            {isWebStorageUnsupported && (
              <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed pl-1.5">
                <div className="flex gap-2">
                  <span className="text-rose-500 font-black">●</span>
                  <span><strong className="text-slate-100 font-bold">關閉私密/無痕模式</strong>：您的瀏覽器在私密分頁中可能會嚴格封鎖 Session 儲存空間，請使用一般正常分頁開啟並登入。</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-rose-500 font-black">●</span>
                  <span><strong className="text-slate-100 font-bold">檢查 Cookie 設定</strong>：確認您的瀏覽器沒有開啟「封鎖所有第三方 Cookie」或停用本地 JavaScript 儲存權限。</span>
                </div>
              </div>
            )}

            {!isUnauthorizedDomain && !isPopupBlocked && !isWebStorageUnsupported && (
              <div className="p-3 bg-slate-800/30 rounded-xl text-slate-300 text-xs leading-relaxed space-y-1.5">
                <div>1. 檢查 Firebase 專案配置是否正確，且 Firebase 專案具備可用的 Google 登入選項。</div>
                <div>2. 如果您先前是在 iframe 預覽中測試，請嘗試點擊專案右上方圖示開啟「新分頁 / 獨立新視窗獨立執行」。</div>
                <div>3. 檢查網路狀態與網路防火牆是否在通暢的環境。</div>
              </div>
            )}
          </div>

          {/* Bottom Close Button */}
          <div className="mt-8">
            <button 
              onClick={onClose}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 font-black text-sm tracking-widest rounded-2xl transition-all"
            >
              我知道了，關閉視窗
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthErrorModal;
