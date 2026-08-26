import React, { useState, useRef, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { FriendFeedItem } from '@/lib/social';

interface LikeButtonProps {
  item: FriendFeedItem;
  onLike: () => void;
}

export default function LikeButton({ item, onLike }: LikeButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    // Show only on non-touch devices to avoid double trigger with touch
    if (!('ontouchstart' in window)) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    if (!('ontouchstart' in window)) {
      setShowTooltip(false);
    }
  };

  const handleTouchStart = () => {
    isLongPress.current = false;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowTooltip(true);
    }, 500);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    
    if (isLongPress.current) {
      if (e.cancelable) e.preventDefault();
      // Hide tooltip after a few seconds on mobile
      hideTimer.current = setTimeout(() => {
        setShowTooltip(false);
      }, 2500);
    }
  };
  
  const handleTouchMove = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // 일반 클릭시 툴팁 숨기기
    setShowTooltip(false);
    onLike();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isLongPress.current || ('ontouchstart' in window)) {
      e.preventDefault();
    }
  };

  const likers = item.liked_by_users || [];

  // Close tooltip on click outside (useful for mobile if it stays open)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (showTooltip && tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showTooltip]);

  return (
    <div className="relative flex flex-col items-end" ref={tooltipRef}>
      <button 
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onContextMenu={handleContextMenu}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors select-none ${
          item.is_liked_by_me 
            ? "bg-red-50 dark:bg-red-950/30 text-red-500" 
            : "bg-stone-100 dark:bg-stone-800 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700"
        }`}
      >
        <Heart size={16} fill={item.is_liked_by_me ? "currentColor" : "none"} />
        <span className="text-xs font-bold">{item.like_count > 0 ? item.like_count : '좋아요'}</span>
      </button>

      {showTooltip && (
        <div className="absolute bottom-full mb-2 right-0 z-50 w-48 p-3 bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 text-xs rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto origin-bottom-right">
          <div className="font-bold mb-2 opacity-90 border-b border-stone-600 dark:border-stone-300 pb-1.5 flex justify-between items-center">
            <span>좋아요 누른 사람</span>
            <span className="bg-stone-700 dark:bg-stone-200 px-1.5 py-0.5 rounded text-[10px]">{likers.length}</span>
          </div>
          <div className="max-h-32 overflow-y-auto flex flex-wrap gap-1.5 font-medium pr-1">
            {likers.length > 0 ? (
              likers.map(u => (
                <span key={u.id} className="bg-stone-700 dark:bg-stone-200 px-2 py-1 rounded-lg text-[11px] whitespace-nowrap">
                  {u.name}
                </span>
              ))
            ) : (
              <span className="opacity-70 py-1 text-center w-full block">아직 없어요. 첫 좋아요를 눌러주세요!</span>
            )}
          </div>
          {/* Arrow */}
          <div className="absolute top-full right-6 -mt-1.5 w-3 h-3 bg-stone-800 dark:bg-stone-100 transform rotate-45 rounded-sm"></div>
        </div>
      )}
    </div>
  );
}
