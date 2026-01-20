'use client';

import { useState, useCallback } from 'react';
import { KEY_COLORS, LANE_COUNT } from '@/lib/gameConfig';
import styles from './PianoKeys.module.css';

interface PianoKeysProps {
  onKeyPress: (lane: number) => void;
  onKeyRelease?: (lane: number) => void;
}

export default function PianoKeys({ onKeyPress, onKeyRelease }: PianoKeysProps) {
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());

  const handleTouchStart = useCallback((lane: number) => (e: React.TouchEvent) => {
    e.preventDefault();
    setActiveKeys(prev => new Set(prev).add(lane));
    onKeyPress(lane);
    
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }, [onKeyPress]);

  const handleTouchEnd = useCallback((lane: number) => (e: React.TouchEvent) => {
    e.preventDefault();
    setActiveKeys(prev => {
      const next = new Set(prev);
      next.delete(lane);
      return next;
    });
    onKeyRelease?.(lane);
  }, [onKeyRelease]);

  const handleMouseDown = useCallback((lane: number) => () => {
    setActiveKeys(prev => new Set(prev).add(lane));
    onKeyPress(lane);
  }, [onKeyPress]);

  const handleMouseUp = useCallback((lane: number) => () => {
    setActiveKeys(prev => {
      const next = new Set(prev);
      next.delete(lane);
      return next;
    });
    onKeyRelease?.(lane);
  }, [onKeyRelease]);

  return (
    <div className={styles.pianoContainer}>
      {KEY_COLORS.slice(0, LANE_COUNT).map((color, lane) => (
        <button
          key={lane}
          className={`${styles.key} ${activeKeys.has(lane) ? styles.active : ''}`}
          style={{
            '--key-color': color.base,
            '--key-active-color': color.active,
          } as React.CSSProperties}
          onTouchStart={handleTouchStart(lane)}
          onTouchEnd={handleTouchEnd(lane)}
          onMouseDown={handleMouseDown(lane)}
          onMouseUp={handleMouseUp(lane)}
          onMouseLeave={handleMouseUp(lane)}
          aria-label={`Key ${lane + 1}`}
        />
      ))}
    </div>
  );
}
