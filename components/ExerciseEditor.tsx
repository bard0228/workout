import React, { useState, useEffect, useRef, useMemo } from 'react';
import Sortable from 'sortablejs';
import { Exercise, Category, RecordMode } from '../types';
import { CATEGORIES } from '../constants';
import ConfirmModal from './ConfirmModal';
import MuscleMap from './MuscleMap';
import { Edit2, Trash2, Camera, X, Loader2 } from 'lucide-react';
import { compressImage } from '../lib/imageUtils';
import {
  MuscleGroup,
  FRONT_MUSCLES,
  BACK_MUSCLES,
  getExerciseMuscleInfo,
} from '../lib/muscleMapping';

interface ExerciseEditorProps {
  exercises: Exercise[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  onSave: (exercises: Exercise[], renameInfo?: { oldName: string; newName: string }) => void;
  onBack: () => void;
}

const ExerciseEditor: React.FC<ExerciseEditorProps> = ({
  exercises,
  editingId,
  setEditingId,
  onSave,
  onBack,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('腿部');
  const [mode, setMode] = useState<RecordMode>('REPS');
  const [primaryMuscles, setPrimaryMuscles] = useState<MuscleGroup[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>([]);
  const [paintMode, setPaintMode] = useState<'primary' | 'secondary' | 'eraser'>('primary');
  const [equipmentPhoto, setEquipmentPhoto] = useState<string | undefined>(undefined);
  const [isCompressing, setIsCompressing] = useState(false);
  const [filterCategory, setFilterCategory] = useState<Category>('全部');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const sortableInstance = useRef<Sortable | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredExercises = useMemo(() => {
    if (filterCategory === '全部') return exercises;
    return exercises.filter((ex) => ex.category === filterCategory);
  }, [exercises, filterCategory]);

  useEffect(() => {
    if (!editingId && listRef.current) {
      if (sortableInstance.current) {
        sortableInstance.current.destroy();
      }
      sortableInstance.current = new Sortable(listRef.current, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
          const { oldIndex, newIndex } = evt;
          if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
          const currentList = [...filteredExercises];
          const [movedItem] = currentList.splice(oldIndex, 1);
          currentList.splice(newIndex, 0, movedItem);
          const otherExercises = exercises.filter(
            (ex) => !filteredExercises.some((f) => f.id === ex.id)
          );
          onSave([...currentList, ...otherExercises]);
        },
      });
    }
    return () => {
      if (sortableInstance.current) {
        sortableInstance.current.destroy();
        sortableInstance.current = null;
      }
    };
  }, [editingId, filteredExercises, exercises, onSave]);

  useEffect(() => {
    if (editingId === 'new') {
      setName('');
      setCategory('腿部');
      setMode('REPS');
      setEquipmentPhoto(undefined);
      const defaultInfo = getExerciseMuscleInfo({ category: '腿部', name: '' });
      setPrimaryMuscles(defaultInfo.primary);
      setSecondaryMuscles(defaultInfo.secondary);
      setPaintMode('primary');
    } else if (editingId && editingId !== 'new') {
      const ex = exercises.find((e) => e.id === editingId);
      if (ex) {
        setName(ex.name);
        setCategory(ex.category);
        setMode(ex.mode || 'REPS');
        setEquipmentPhoto(ex.equipmentPhoto);
        const info = getExerciseMuscleInfo(ex);
        setPrimaryMuscles(ex.primaryMuscles || info.primary);
        setSecondaryMuscles(ex.secondaryMuscles || info.secondary);
        setPaintMode('primary');
      }
    }
  }, [editingId, exercises]);

  const handleCategoryChange = (newCat: Category) => {
    setCategory(newCat);
    // If user creates a new exercise and changes category, update muscle suggestions
    if (editingId === 'new') {
      const defaultInfo = getExerciseMuscleInfo({ category: newCat, name });
      setPrimaryMuscles(defaultInfo.primary);
      setSecondaryMuscles(defaultInfo.secondary);
    }
  };

  const handleMuscleClick = (group: MuscleGroup) => {
    if (paintMode === 'primary') {
      if (primaryMuscles.includes(group)) {
        setPrimaryMuscles((prev) => prev.filter((g) => g !== group));
      } else {
        setSecondaryMuscles((prev) => prev.filter((g) => g !== group));
        setPrimaryMuscles((prev) => [...prev, group]);
      }
    } else if (paintMode === 'secondary') {
      if (secondaryMuscles.includes(group)) {
        setSecondaryMuscles((prev) => prev.filter((g) => g !== group));
      } else {
        setPrimaryMuscles((prev) => prev.filter((g) => g !== group));
        setSecondaryMuscles((prev) => [...prev, group]);
      }
    } else if (paintMode === 'eraser') {
      setPrimaryMuscles((prev) => prev.filter((g) => g !== group));
      setSecondaryMuscles((prev) => prev.filter((g) => g !== group));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressed = await compressImage(file);
      setEquipmentPhoto(compressed);
    } catch (err) {
      console.error('Image compression failed:', err);
      alert('圖片處理失敗，請換一張試試');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const save = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return alert('請輸入動作名稱');

    let renameInfo: { oldName: string; newName: string } | undefined;
    let newEx: Exercise[];

    if (editingId === 'new') {
      const newExerciseItem: Exercise = {
        id: crypto.randomUUID(),
        name: trimmedName,
        category,
        mode,
        equipmentPhoto,
        primaryMuscles,
        secondaryMuscles,
      };
      newEx = [...exercises, newExerciseItem];
    } else {
      const original = exercises.find((e) => e.id === editingId);
      if (original && original.name !== trimmedName) {
        renameInfo = { oldName: original.name, newName: trimmedName };
      }

      newEx = exercises.map((ex) =>
        ex.id === editingId
          ? {
              ...ex,
              name: trimmedName,
              category,
              mode,
              equipmentPhoto,
              primaryMuscles,
              secondaryMuscles,
            }
          : ex
      );
    }

    onSave(newEx, renameInfo);
    setEditingId(null);
  };

  const deleteEx = (id: string) => {
    const newEx = exercises.filter((ex) => ex.id !== id);
    onSave(newEx);
    setDeletingId(null);
  };

  if (editingId) {
    return (
      <div key="exercise-form" className="flex-1 flex flex-col p-6 overflow-y-auto animate-slide-in-right no-scrollbar">
        <h2 className="text-3xl font-black mb-6 text-white">
          {editingId === 'new' ? '新增訓練動作' : '編輯訓練動作'}
        </h2>
        <div className="space-y-6 pb-36">
          {/* 動作名稱 */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase mb-2 block tracking-wider">
              動作名稱
            </label>
            <input
              type="text"
              placeholder="例如：槓鈴臥推、機械腿推..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border-2 border-slate-800 p-4 rounded-2xl text-lg font-bold outline-none focus:border-blue-500 transition-all text-white"
            />
          </div>

          {/* 目標分類 */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-wider">
              目標分類
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {CATEGORIES.filter((c) => c !== '全部').map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`py-3.5 rounded-2xl text-xs font-black border-2 transition-all ${
                    category === cat
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 記錄模式 */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-wider">
              記錄模式
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('REPS')}
                className={`py-3.5 rounded-2xl text-xs font-black border-2 transition-all ${
                  mode === 'REPS'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                次數 (Reps)
              </button>
              <button
                type="button"
                onClick={() => setMode('DURATION')}
                className={`py-3.5 rounded-2xl text-xs font-black border-2 transition-all ${
                  mode === 'DURATION'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                時長 (Duration)
              </button>
            </div>
          </div>

          {/* 肌肉訓練分布圖 (可互動點選標記主要鍛鍊 / 輔助肌群) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-black text-slate-500 uppercase block tracking-wider">
                肌肉訓練分布圖
              </label>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-inner space-y-4">
              {/* 標記模式按鈕列 */}
              <div className="flex items-center justify-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaintMode('primary')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paintMode === 'primary'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
                  主要鍛鍊
                </button>
                <button
                  type="button"
                  onClick={() => setPaintMode('secondary')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paintMode === 'secondary'
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                  輔助肌群
                </button>
                <button
                  type="button"
                  onClick={() => setPaintMode('eraser')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paintMode === 'eraser'
                      ? 'bg-slate-700 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                  清除
                </button>
              </div>

              {/* 人體解剖圖 - 支援直接點選人體部位 */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-2">
                <MuscleMap
                  primaryMuscles={primaryMuscles}
                  secondaryMuscles={secondaryMuscles}
                  variant="interactive"
                  interactive={true}
                  onMuscleClick={handleMuscleClick}
                  showLabels={true}
                />
              </div>

              {/* 部位快捷點選按鈕清單 */}
              <div className="space-y-3 pt-1">
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">
                    正面部位
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {FRONT_MUSCLES.map((m) => {
                      const isPrimary = primaryMuscles.includes(m.id);
                      const isSecondary = secondaryMuscles.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleMuscleClick(m.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isPrimary
                              ? 'bg-teal-600/30 text-teal-300 border-teal-500/60 shadow-sm'
                              : isSecondary
                              ? 'bg-sky-600/30 text-sky-300 border-sky-500/60 shadow-sm'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">
                    背面部位
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {BACK_MUSCLES.map((m) => {
                      const isPrimary = primaryMuscles.includes(m.id);
                      const isSecondary = secondaryMuscles.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleMuscleClick(m.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isPrimary
                              ? 'bg-teal-600/30 text-teal-300 border-teal-500/60 shadow-sm'
                              : isSecondary
                              ? 'bg-sky-600/30 text-sky-300 border-sky-500/60 shadow-sm'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 器材照片 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-500 uppercase block tracking-wider">
                器材照片
              </label>
            </div>

            {equipmentPhoto ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video max-h-48 flex items-center justify-center">
                  <img
                    src={equipmentPhoto}
                    alt="器材照片預覽"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setEquipmentPhoto(undefined)}
                    className="absolute top-2 right-2 p-2 bg-black/75 hover:bg-red-600 text-white rounded-full transition-colors backdrop-blur-sm cursor-pointer"
                    title="移除照片"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing}
                    className="flex-1 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-blue-400" />
                    更換器材照片
                  </button>
                  <button
                    type="button"
                    onClick={() => setEquipmentPhoto(undefined)}
                    className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl text-xs font-bold text-red-400 transition-all cursor-pointer"
                  >
                    移除照片
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => !isCompressing && fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-900/40 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-[0.99] group text-center"
              >
                {isCompressing ? (
                  <div className="flex flex-col items-center gap-2 text-blue-400 py-3">
                    <Loader2 className="w-7 h-7 animate-spin" />
                    <span className="text-xs font-bold">正在壓縮處理器材照片...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-slate-200">
                      點此拍照或上傳器材照片
                    </span>
                  </>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        </div>

        {/* Bottom Save / Cancel bar */}
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 grid grid-cols-2 gap-3 z-30">
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="py-4 bg-slate-800 hover:bg-slate-700/80 rounded-2xl font-black text-slate-300 active:scale-95 transition-all text-sm cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isCompressing}
            className="py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-white active:scale-95 shadow-xl shadow-blue-900/40 transition-all text-sm disabled:opacity-50 cursor-pointer"
          >
            儲存變更
          </button>
        </div>
      </div>
    );
  }

  return (
    <div key="exercise-list" className="flex-1 flex flex-col p-6 overflow-y-auto animate-slide-in-left no-scrollbar">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 active:scale-75 transition-all hover:text-white cursor-pointer"
          aria-label="返回"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="text-2xl font-black text-white">訓練動作庫</h2>
        <button
          onClick={() => setEditingId('new')}
          className="p-3 bg-blue-600 hover:bg-blue-500 rounded-2xl text-white shadow-lg shadow-blue-900/40 active:scale-75 transition-all cursor-pointer"
          title="新增訓練動作"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar sticky top-0 bg-slate-950 py-2 z-10">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filterCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Exercises List */}
      <div ref={listRef} className="space-y-3 pb-12">
        {filteredExercises.map((ex) => (
          <div
            key={ex.id}
            data-id={ex.id}
            className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-[2rem] flex justify-between items-center shadow-md active:bg-slate-800/80 transition-all gap-2"
          >
            {/* Left Drag & Info */}
            <div
              className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
              onClick={() => setEditingId(ex.id)}
            >
              <div className="drag-handle p-1.5 text-slate-600 active:text-blue-500 transition-colors shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                </svg>
              </div>

              {/* Muscle Map Icon (正方形局部聚焦圖) */}
              <div className="w-12 h-12 bg-slate-950/80 border border-slate-800 rounded-2xl p-1 shrink-0 flex items-center justify-center relative overflow-hidden shadow-inner">
                <MuscleMap exercise={ex} variant="compact" />
              </div>

              {/* Name & Badge */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base text-slate-200 line-clamp-1">
                    {ex.name}
                  </span>
                  {ex.equipmentPhoto && (
                    <span className="text-[10px] text-teal-400 shrink-0" title="已附器材照片">
                      📷
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                  {ex.category} {ex.mode === 'DURATION' ? '• 時長模式' : ''}
                </span>
              </div>
            </div>

            {/* Right Buttons: Pencil (Edit) & Trash (Delete) */}
            <div className="flex items-center gap-2 shrink-0">
              {/* 鉛筆圖示 (進行名字修正、肌肉分布圖與器材照片維護) */}
              <button
                type="button"
                onClick={() => setEditingId(ex.id)}
                className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white rounded-2xl active:scale-75 transition-all flex items-center justify-center cursor-pointer"
                title="修改動作名稱、肌肉分布與器材照片"
                aria-label="編輯動作"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              {/* 垃圾桶圖示 (刪除動作) */}
              <button
                type="button"
                onClick={() => setDeletingId(ex.id)}
                className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-2xl active:scale-75 transition-all flex items-center justify-center cursor-pointer"
                title="刪除動作"
                aria-label="刪除動作"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {deletingId && (
        <ConfirmModal
          title="刪除動作？"
          message="刪除動作後，相關的歷史數據將無法在統計圖表中完整顯示。確定刪除嗎？"
          onConfirm={() => deleteEx(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
};

export default ExerciseEditor;
