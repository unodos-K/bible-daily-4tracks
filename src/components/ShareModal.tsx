"use client";

import React, { useState, useEffect } from 'react';
import { X, GripVertical } from 'lucide-react';
import { MemoData, ShareableOneVerseRecord } from '@/lib/storage';

import { useSettings } from '@/contexts/SettingsContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ShareableOneVerseRecord | null;
  onShare: (orderedItems: string[]) => void;
}

export default function ShareModal({ isOpen, onClose, record, onShare }: ShareModalProps) {
  const [items, setItems] = useState<{ id: string; label: string; checked: boolean }[]>([]);
  const { shareOptions } = useSettings();

  useEffect(() => {
    if (isOpen && record) {
      const newItems = [];
      const memo = record.oneVerse?.memo as MemoData | undefined;
      
      for (const option of shareOptions) {
        if (option.id === 'verse') {
          newItems.push({ ...option });
        } else if (option.id === 'meditation' && memo?.meditation) {
          newItems.push({ ...option });
        } else if (option.id === 'prayer' && memo?.prayer) {
          newItems.push({ ...option });
        } else if (option.id === 'thanksgiving' && memo?.thanks) {
          newItems.push({ ...option });
        } else if (option.id === 'application' && memo?.application && memo.application.length > 0) {
          newItems.push({ ...option });
        }
      }
      
      setItems(newItems);
    }
  }, [isOpen, record, shareOptions]);

  if (!isOpen || !record) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (dragIndex === dropIndex) return;
    
    const newItems = [...items];
    const [draggedItem] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);
    setItems(newItems);
  };

  const toggleCheck = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleShareClick = () => {
    const orderedItems = items.filter(item => item.checked).map(item => item.id);
    onShare(orderedItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full max-w-sm bg-stone-900 border border-stone-700/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4">
          <h3 className="text-xl font-bold text-stone-100">나눔 항목 선택</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200"><X size={24} /></button>
        </div>
        
        <div className="px-6 pb-2 text-sm text-stone-400">
          나눌 항목을 선택하고, 핸들(⋮⋮)을 드래그하여 순서를 변경해 보세요.
        </div>

        <div className="flex flex-col gap-2 p-6 pt-2 overflow-y-auto max-h-[60vh]">
          {items.map((item, index) => (
            <div 
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e)}
              onDrop={(e) => handleDrop(e, index)}
              className="flex items-center justify-between p-4 bg-stone-800 rounded-xl border border-stone-700/50 cursor-grab active:cursor-grabbing hover:bg-stone-750 transition-colors"
            >
              <label className="flex items-center gap-3 cursor-pointer flex-1">
                <input 
                  type="checkbox" 
                  checked={item.checked} 
                  onChange={() => toggleCheck(item.id)} 
                  className="w-5 h-5 accent-sky-500 bg-stone-900 border-stone-600 rounded" 
                />
                <span className="text-stone-200 font-medium">{item.label}</span>
              </label>
              <div className="text-stone-500 hover:text-stone-300">
                <GripVertical size={20} />
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-stone-950/30 border-t border-stone-800">
          <button
            onClick={handleShareClick}
            className="w-full py-3.5 bg-[#FEE500] hover:bg-[#FDD800] text-black font-bold rounded-xl flex items-center justify-center transition-colors"
          >
            카카오톡으로 나누기
          </button>
        </div>
      </div>
    </div>
  );
}
