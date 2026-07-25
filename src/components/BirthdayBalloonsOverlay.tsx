import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, PartyPopper } from 'lucide-react';

interface BalloonState {
  id: number;
  colorClass: string;
  leftPercent: number; // 5 to 90
  durationSec: number; // 14 to 22
  delaySec: number; // 0 to 12
  sizePx: number; // width in px e.g. 52 - 68
  // Position override when dragged
  isDragged: boolean;
  xPx?: number;
  yPx?: number;
}

interface BirthdayBalloonsOverlayProps {
  isBirthdayMode: boolean;
}

export const BirthdayBalloonsOverlay: React.FC<BirthdayBalloonsOverlayProps> = ({
  isBirthdayMode
}) => {
  const [balloons, setBalloons] = useState<BalloonState[]>([]);
  const draggingIdRef = useRef<number | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0
  });

  // Party Popper FAB Position & Drag State
  const [popperPos, setPopperPos] = useState<{ x: number; y: number } | null>(null);
  const popperDraggingRef = useRef<boolean>(false);
  const popperMovedRef = useRef<boolean>(false);
  const popperDragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      const initX = isMobile ? Math.max(16, window.innerWidth - 80) : Math.max(16, window.innerWidth - 96);
      const initY = isMobile ? 100 : Math.max(100, window.innerHeight - 100);
      setPopperPos({ x: initX, y: initY });
    }
  }, []);

  useEffect(() => {
    if (!isBirthdayMode) {
      setBalloons([]);
      return;
    }

    // Colors matching SyncMate design palette (Purple, Gold, Dark Blue)
    const colorGradients = [
      'bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 border-amber-300/40',
      'bg-gradient-to-tr from-indigo-700 via-purple-600 to-pink-500 border-purple-400/40',
      'bg-gradient-to-tr from-slate-900 via-blue-900 to-indigo-600 border-indigo-400/40',
      'bg-gradient-to-tr from-violet-900 via-purple-700 to-fuchsia-400 border-fuchsia-400/40',
      'bg-gradient-to-tr from-yellow-700 via-amber-500 to-amber-200 border-amber-300/40',
      'bg-gradient-to-tr from-indigo-950 via-slate-800 to-blue-600 border-blue-400/40',
      'bg-gradient-to-tr from-indigo-600 via-purple-500 to-pink-400 border-indigo-300/40',
      'bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-100 border-amber-200/50',
      'bg-gradient-to-tr from-purple-800 via-indigo-600 to-amber-400 border-amber-300/40'
    ];

    // Generate 9 scattered interactive balloons
    const generated: BalloonState[] = [];
    for (let i = 0; i < 9; i++) {
      generated.push({
        id: i,
        colorClass: colorGradients[i % colorGradients.length],
        leftPercent: 6 + (i * 10) + Math.floor(Math.random() * 4), // distributed evenly 6%..90%
        durationSec: 15 + Math.floor(Math.random() * 7), // 15s to 21s
        delaySec: (i * 1.8) % 12, // staggered delay
        sizePx: 56 + Math.floor(Math.random() * 16), // 56px to 72px
        isDragged: false
      });
    }

    setBalloons(generated);

    // Initial festive burst
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (err) {
      console.warn('Confetti error:', err);
    }
  }, [isBirthdayMode]);

  // Handle Confetti Cannon FAB tap
  const firePartyPopper = () => {
    try {
      // Center burst
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.75 }
      });

      // Side cannons
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.75 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.75 }
        });
      }, 150);
    } catch (e) {
      console.warn('Failed to fire confetti:', e);
    }
  };

  if (!isBirthdayMode) return null;

  // Pointer drag start
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, id: number) => {
    e.stopPropagation();
    const balloonEl = e.currentTarget;
    const rect = balloonEl.getBoundingClientRect();

    draggingIdRef.current = id;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: rect.left,
      initY: rect.top
    };

    balloonEl.setPointerCapture(e.pointerId);

    setBalloons((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              isDragged: true,
              xPx: rect.left,
              yPx: rect.top
            }
          : b
      )
    );
  };

  // Pointer drag move
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, id: number) => {
    if (draggingIdRef.current !== id) return;
    e.stopPropagation();

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    const newX = dragStartRef.current.initX + dx;
    const newY = dragStartRef.current.initY + dy;

    setBalloons((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              xPx: newX,
              yPx: newY
            }
          : b
      )
    );
  };

  // Pointer drag end
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>, id: number) => {
    if (draggingIdRef.current === id) {
      e.stopPropagation();
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {
        // pointer capture already released
      }
      draggingIdRef.current = null;
    }
  };

  // Party Popper Pointer Drag Handlers
  const handlePopperPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const currentX = popperPos ? popperPos.x : (window.innerWidth < 768 ? window.innerWidth - 80 : window.innerWidth - 96);
    const currentY = popperPos ? popperPos.y : (window.innerWidth < 768 ? 100 : window.innerHeight - 100);

    popperDraggingRef.current = true;
    popperMovedRef.current = false;
    popperDragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: currentX,
      initY: currentY
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePopperPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!popperDraggingRef.current) return;
    e.stopPropagation();

    const dx = e.clientX - popperDragStartRef.current.startX;
    const dy = e.clientY - popperDragStartRef.current.startY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      popperMovedRef.current = true;
    }

    const newX = popperDragStartRef.current.initX + dx;
    const newY = popperDragStartRef.current.initY + dy;

    setPopperPos({ x: newX, y: newY });
  };

  const handlePopperPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (popperDraggingRef.current) {
      e.stopPropagation();
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {
        // pointer capture released
      }
      popperDraggingRef.current = false;

      // If user tapped without dragging, trigger confetti burst
      if (!popperMovedRef.current) {
        firePartyPopper();
      }
    }
  };

  return (
    <>
      {/* 1. NON-BLOCKING BALLOONS OVERLAY (Z-INDEX 40) */}
      <div className="fixed inset-0 pointer-events-none z-[40] overflow-hidden">
        {balloons.map((balloon) => {
          const heightPx = Math.round(balloon.sizePx * 1.28);

          // Position style: fixed if dragged, floating CSS animation if not
          const style: React.CSSProperties = balloon.isDragged && balloon.xPx !== undefined && balloon.yPx !== undefined
            ? {
                position: 'fixed',
                left: `${balloon.xPx}px`,
                top: `${balloon.yPx}px`,
                width: `${balloon.sizePx}px`,
                height: `${heightPx}px`,
                zIndex: 45,
                animationPlayState: 'paused'
              }
            : {
                position: 'fixed',
                left: `${balloon.leftPercent}%`,
                bottom: '-120px',
                width: `${balloon.sizePx}px`,
                height: `${heightPx}px`,
                animationName: 'balloonFloat',
                animationDuration: `${balloon.durationSec}s`,
                animationDelay: `${balloon.delaySec}s`,
                animationIterationCount: 'infinite',
                animationTimingFunction: 'linear'
              };

          return (
            <div
              key={balloon.id}
              style={style}
              onPointerDown={(e) => handlePointerDown(e, balloon.id)}
              onPointerMove={(e) => handlePointerMove(e, balloon.id)}
              onPointerUp={(e) => handlePointerUp(e, balloon.id)}
              onPointerCancel={(e) => handlePointerUp(e, balloon.id)}
              className={`pointer-events-auto cursor-grab active:cursor-grabbing select-none rounded-[50%_50%_50%_50%/40%_40%_60%_60%] border shadow-xl relative transition-transform hover:scale-110 active:scale-105 ${balloon.colorClass}`}
              title="Drag or bounce me around! 🎈"
            >
              {/* Specular Shiny Highlight */}
              <div className="absolute top-2 left-3 w-3 h-5 bg-white/45 rounded-full -rotate-45 pointer-events-none blur-[0.5px]" />

              {/* Balloon Knot */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2 bg-inherit rounded-b-sm border-t border-black/20 pointer-events-none" />

              {/* Hanging String */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-16 bg-gradient-to-b from-amber-200/60 via-slate-300/40 to-transparent animate-string-wiggle pointer-events-none" />
            </div>
          );
        })}
      </div>

      {/* 2. INTERACTIVE DRAGGABLE PARTY POPPER FAB (CONFETTI CANNON - Z-INDEX 55) */}
      <div 
        style={popperPos ? { position: 'fixed', left: `${popperPos.x}px`, top: `${popperPos.y}px`, touchAction: 'none' } : { touchAction: 'none' }}
        onPointerDown={handlePopperPointerDown}
        onPointerMove={handlePopperPointerMove}
        onPointerUp={handlePopperPointerUp}
        onPointerCancel={handlePopperPointerUp}
        className={`z-[55] pointer-events-auto flex flex-col items-end space-y-2 group cursor-grab active:cursor-grabbing select-none ${!popperPos ? 'fixed bottom-6 right-6 sm:bottom-8 sm:right-8' : ''}`}
      >
        
        {/* Hover Tooltip Pill */}
        <div className="px-3 py-1.5 rounded-2xl bg-slate-900/90 dark:bg-slate-950/90 border border-amber-400/40 text-amber-300 text-[11px] font-extrabold shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-1.5 pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span>Birthday Party Popper! Drag or Tap to Celebrate! 🎉</span>
        </div>

        {/* FAB Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
          }}
          className="relative p-4 rounded-3xl bg-gradient-to-tr from-amber-500 via-purple-600 to-indigo-600 text-white shadow-2xl border-2 border-amber-300 hover:scale-110 active:scale-95 transition-all duration-200 group/btn"
          title="Fire Party Popper Confetti Explosion! 💥"
        >
          {/* Pulsing Outer Glow */}
          <span className="absolute -inset-1 rounded-3xl bg-amber-400/40 blur-md group-hover/btn:bg-amber-400/70 transition-all animate-pulse pointer-events-none" />
          
          <div className="relative flex items-center justify-center space-x-1">
            <span className="text-2xl sm:text-3xl animate-bounce">🎉</span>
          </div>
        </button>

      </div>
    </>
  );
};
