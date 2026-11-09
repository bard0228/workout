
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Exercise } from '../types';

interface ResumeSessionButtonProps {
  activeExercise: Exercise;
  onResume: () => void;
}

const ResumeSessionButton: React.FC<ResumeSessionButtonProps> = ({ activeExercise, onResume }) => {
  const [pos, setPos] = useState({ 
    x: window.innerWidth - 180, // Default right-ish
    y: window.innerHeight - 100 // Below the timer
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Dragging logic
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
      
      // Bounds
      newX = Math.max(10, Math.min(newX, window.innerWidth - 150));
      newY = Math.max(10, Math.min(newY, window.innerHeight - 60));
      
      if (Math.abs(newX - pos.x) > 5 || Math.abs(newY - pos.y) > 5) {
        hasMovedRef.current = true;
      }
      
      setPos({ x: newX, y: newY });
    };

    const handleEnd = () => {
      if (!isDragging) return;
      setIsDragging(false);
      
      // Snap to sides
      const buttonWidth = 140; 
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

  const handleClick = (e: React.MouseEvent) => {
    if (!hasMovedRef.current) {
      onResume();
    }
  };

  return createPortal(
    <div 
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      onClick={handleClick}
      style={{ 
        left: `${pos.x}px`, 
        top: `${pos.y}px`,
        transition: isDragging ? 'none' : 'left 0.3s ease-out, top 0.3s ease-out'
      }}
      className="fixed z-[2900] animate-bounce-subtle touch-none"
    >
      <button 
        className="flex items-center gap-3 px-5 py-3 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-500/40 border-2 border-blue-400/30 active:scale-95 transition-all whitespace-nowrap"
      >
        <div className="relative">
          <svg className="w-5 h-5 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          </svg>
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-blue-600 animate-pulse"></div>
        </div>
        <div className="flex flex-col items-start">
          <span className="text-[8px] font-black uppercase tracking-widest opacity-70 leading-none mb-0.5">訓練進行中</span>
          <span className="text-xs font-black leading-none">繼續：{activeExercise.name}</span>
        </div>
      </button>
    </div>,
    document.body
  );
};

export default ResumeSessionButton;
