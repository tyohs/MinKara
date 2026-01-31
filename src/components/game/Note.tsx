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
  isObstruction?: boolean; // 追加: お邪魔ノーツかどうかのフラグ
  isFake?: boolean; // 追加: ニセノーツフラグ
}

interface NoteProps {
  note: NoteData;
  currentTime: number;
  visibleDuration: number; // Duration in ms that the note is visible on screen
}

export default function Note({ 
  note, 
  currentTime, 
  visibleDuration,
}: NoteProps) {
  // ノーツの位置（0%=上端、100%=下端/判定ライン）
  const progress = useMemo(() => {
    const timeUntilHit = note.time - currentTime;
    // progress = 1 - (timeUntilHit / visibleDuration)
    // if timeUntilHit == visibleDuration, progress = 0 (top)
    // if timeUntilHit == 0, progress = 1 (bottom/hit line)
    return 1 - (timeUntilHit / visibleDuration);
  }, [note.time, currentTime, visibleDuration]);

  // 画面外は描画しない
  if (progress < -0.1 || progress > 1.1) {
    return null;
  }

  const color = KEY_COLORS[note.lane] || KEY_COLORS[0];
  const isSpecial = note.type === 'special';
  const isFake = note.isFake;

  // レーンの中央位置
  const laneWidth = 100 / LANE_COUNT;
  const leftPosition = note.lane * laneWidth + laneWidth / 2;

  // 3D空間内での位置（progress=0で上端、progress=1で下端/判定ライン）
  const topPercent = progress * 100;

  // スケール（上端=遠いほど小さく、下端=近いほど大きく）
  const scale = NOTE_CONFIG.minScale + progress * (NOTE_CONFIG.maxScale - NOTE_CONFIG.minScale);

  return (
    <div
      className={`${styles.note} ${isSpecial ? styles.special : ''} ${isFake ? styles.fake : ''}`}
      style={{
        '--note-color': color.base,
        '--note-glow': color.active,
        top: `${topPercent}%`,
        left: `${leftPosition}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        width: `${laneWidth * NOTE_CONFIG.widthRatio}%`,
      } as React.CSSProperties}
    >
      {isFake && (
        <div className={styles.fakeIcon}>👿</div>
      )}
    </div>
  );
}
