import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Exercise } from '../types';
import MuscleMap from './MuscleMap';
import { Play, X, Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { compressImage } from '../lib/imageUtils';

interface WorkoutConfirmModalProps {
  exercise: Exercise;
  onConfirm: () => void;
  onCancel: () => void;
  onUpdatePhoto?: (photoBase64: string) => void;
}

export const WorkoutConfirmModal: React.FC<WorkoutConfirmModalProps> = ({
  exercise,
  onConfirm,
  onCancel,
  onUpdatePhoto,
}) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressed = await compressImage(file);
      if (onUpdatePhoto) {
        onUpdatePhoto(compressed);
      }
    } catch (err) {
      console.error('Failed to compress image:', err);
      alert('圖片處理失敗，請換一張試試');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[2500] flex flex-col p-3 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
        onClick={onCancel}
      />

      {/* Modal Dialog - 像「詳細訓練情形」一樣幾乎佔滿畫面，具備圓角與乾淨滾動 */}
      <div className="relative z-10 flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl animate-modal-pop max-w-xl mx-auto w-full">
        {/* Header */}
        <header className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
              {exercise.category}
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
              {exercise.name}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-90 text-slate-400 hover:text-white rounded-xl transition-all shrink-0 ml-2"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Modal Body - 排版順序：
            1. 最上方：「開始訓練」按鈕 (取消按鈕已移除，以右上角叉叉為準)
            2. 器材照片
            3. 肌肉訓練分布圖
        */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 no-scrollbar">
          {/* 1. 最上面：開始訓練按鈕 */}
          <button
            onClick={onConfirm}
            className="w-full py-3.5 sm:py-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] rounded-2xl font-black text-white text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-blue-900/40 transition-all cursor-pointer sticky top-0 z-10 border border-blue-400/30"
          >
            <Play className="w-5 h-5 fill-current" />
            開始訓練
          </button>

          {/* 2. 器材照片 */}
          <section className="bg-slate-950/70 border border-slate-800/80 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-inner">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                器材照片
              </span>
              {exercise.equipmentPhoto && onUpdatePhoto && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  更換照片
                </button>
              )}
            </div>

            {exercise.equipmentPhoto ? (
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-slate-800 group aspect-video max-h-48 sm:max-h-56 w-full bg-slate-900 flex items-center justify-center">
                <img
                  src={exercise.equipmentPhoto}
                  alt={`${exercise.name} 器材照`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ) : (
              <div className="rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-800 p-4 sm:p-5 flex flex-col items-center justify-center text-center bg-slate-900/30 min-h-[96px]">
                {isCompressing ? (
                  <div className="flex flex-col items-center gap-2 text-blue-400 py-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs font-bold">正在壓縮處理照片...</span>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-7 h-7 text-slate-600 mb-1.5" />
                    <p className="text-xs font-bold text-slate-400 mb-2">尚未上傳器材照片</p>
                    {onUpdatePhoto && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        拍照或上傳器材照片
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </section>

          {/* 3. 最後：肌肉訓練分布圖 */}
          <section className="bg-slate-950/70 border border-slate-800/80 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-inner">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                肌肉訓練分布圖
              </span>
            </div>
            <MuscleMap exercise={exercise} variant="modal" showLabels={true} />
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WorkoutConfirmModal;
