'use client';

import { useMemo } from 'react';
import { KEY_COLORS, LANE_COUNT, NOTE_CONFIG } from '@/lib/gameConfig';
import styles from './Note.module.css';

export interface NoteData {
  id: string;
  lane: number;
  time: number;
  type: 'normal' | 'special';
  hit?: boolean;
}

interface NoteProps {
  note: NoteData;
  currentTime: number;
  noteSpeed: number;
  trackHeight: number;
}

export default function Note({ 
  note, 
  currentTime, 
  noteSpeed, 
  trackHeight,
}: NoteProps) {
  // ノーツの位置（0%=上端、100%=下端/判定ライン）
  const progress = useMemo(() => {
    const timeUntilHit = note.time - currentTime;
    const totalTravelTime = trackHeight / noteSpeed;
    return timeUntilHit / totalTravelTime;
  }, [note.time, currentTime, trackHeight, noteSpeed]);

  // 画面外は描画しない
  if (progress < -0.1 || progress > 1.1) {
    return null;
  }

  const color = KEY_COLORS[note.lane] || KEY_COLORS[0];
  const isSpecial = note.type === 'special';

  // レーンの中央位置
  const laneWidth = 100 / LANE_COUNT;
  const leftPosition = note.lane * laneWidth + laneWidth / 2;

  // 3D空間内での位置
  const topPercent = (1 - progress) * 100;

  // スケール（遠いほど小さく）
  const scale = NOTE_CONFIG.minScale + (1 - progress) * (NOTE_CONFIG.maxScale - NOTE_CONFIG.minScale);

  return (
    <div
      className={`${styles.note} ${isSpecial ? styles.special : ''}`}
      style={{
        '--note-color': color.base,
        '--note-glow': color.active,
        top: `${topPercent}%`,
        left: `${leftPosition}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        width: `${laneWidth * NOTE_CONFIG.widthRatio}%`,
      } as React.CSSProperties}
    />
  );
}
