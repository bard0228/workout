
import React, { useState, useMemo, useEffect } from 'react';
import { Combo, Exercise, Category } from '../types';
import { CATEGORIES } from '../constants';
import ConfirmModal from './ConfirmModal';

interface ComboEditorProps {
  combos: Combo[];
  exercises: Exercise[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  onSave: (combos: Combo[]) => void;
  onBack: () => void;
}

const ComboEditor: React.FC<ComboEditorProps> = ({ combos, exercises, editingId, setEditingId, onSave, onBack }) => {
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<Category>('全部');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (editingId === 'new') {
      setName('');
      setSelectedIds([]);
    } else if (editingId) {
      const combo = combos.find(c => c.id === editingId);
      if (combo) {
        setName(combo.name);
        setSelectedIds(combo.exerciseIds);
      }
    }
  }, [editingId, combos]);

  const save = () => {
    if (!name.trim()) return alert('請輸入組合名稱');
    if (selectedIds.length === 0) return alert('請至少選擇一個動作');

    let newCombos;
    if (editingId === 'new') {
      newCombos = [...combos, { id: crypto.randomUUID(), name, exerciseIds: selectedIds }];
    } else {
      newCombos = combos.map(c => c.id === editingId ? { ...c, name, exerciseIds: selectedIds } : c);
    }
    onSave(newCombos);
    setEditingId(null);
  };

  const deleteCombo = (id: string) => {
    onSave(combos.filter(c => c.id !== id));
    setDeletingId(null);
  };

  const toggleExercise = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filteredExercises = useMemo(() => {
    if (filterCategory === '全部') return exercises;
    return exercises.filter(ex => ex.category === filterCategory);
  }, [exercises, filterCategory]);

  if (editingId) {
    return (
      <div key="combo-form" className="flex-1 flex flex-col p-6 overflow-y-auto animate-slide-in-right">
        <h2 className="text-3xl font-black mb-8">{editingId === 'new' ? '新增訓練組合' : '編輯訓練組合'}</h2>
        <div className="space-y-8">
          <div>
            <label className="text-xs font-black text-slate-500 uppercase mb-3 block">組合名稱</label>
            <input type="text" placeholder="輸入組合名稱" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-800 p-5 rounded-3xl text-lg font-bold outline-none focus:border-blue-500 transition-all text-white" />
          </div>
          <div>
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar sticky top-0 bg-slate-950 py-2">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setFilterCategory(cat)} className={`flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-bold transition-all ${filterCategory === cat ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>{cat}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 mb-10">
              {filteredExercises.map(ex => (
                <button key={ex.id} onClick={() => toggleExercise(ex.id)} className={`w-full text-left p-5 rounded-2xl border-2 flex justify-between items-center transition-all ${selectedIds.includes(ex.id) ? 'bg-blue-600/10 border-blue-600 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                  <span className="font-bold">{ex.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-auto pt-8">
          <button onClick={() => setEditingId(null)} className="py-5 bg-slate-800 rounded-3xl font-black text-slate-400 active:scale-95 transition-transform">取消</button>
          <button onClick={save} className="py-5 bg-blue-600 rounded-3xl font-black text-white active:scale-95 shadow-xl">儲存變更</button>
        </div>
      </div>
    );
  }

  return (
    <div key="combo-list" className="flex-1 flex flex-col p-6 overflow-y-auto animate-fade-in">
      <div className="flex justify-between items-center mb-10">
        <button onClick={onBack} className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 active:scale-75 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
        <h2 className="text-2xl font-black">管理組合</h2>
        <button onClick={() => setEditingId('new')} className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg active:scale-75 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg></button>
      </div>
      <div className="space-y-4">
        {combos.map(combo => (
          <div key={combo.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] flex justify-between items-center shadow-xl">
            <span className="font-black text-xl text-slate-100">{combo.name}</span>
            <div className="flex gap-3">
              <button onClick={() => setEditingId(combo.id)} className="p-4 bg-slate-800 rounded-2xl text-slate-300 active:scale-90 transition-transform"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
              <button onClick={() => setDeletingId(combo.id)} className="p-4 bg-red-500/10 text-red-500 rounded-2xl active:scale-90 active:bg-red-500 active:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            </div>
          </div>
        ))}
      </div>
      {deletingId && (
        <ConfirmModal title="刪除組合？" message="確定要永久刪除這個訓練組合嗎？這不會刪除動作庫中的動作。" onConfirm={() => deleteCombo(deletingId)} onCancel={() => setDeletingId(null)} />
      )}
    </div>
  );
};

export default ComboEditor;
