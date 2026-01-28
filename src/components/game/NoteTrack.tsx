'use client';

import { useMemo } from 'react';
import Note, { NoteData } from './Note';
import { KEY_COLORS, LANE_COUNT, NOTE_CONFIG } from '@/lib/gameConfig';
import styles from './NoteTrack.module.css';

interface NoteTrackProps {
  notes: NoteData[];
  currentTime: number;
  bpm?: number;
}

export default function NoteTrack({ 
  notes, 
  currentTime, 
  bpm = 120 
}: NoteTrackProps) {
  const visibleDuration = useMemo(() => {
    const msPerBeat = 60000 / bpm;
    return msPerBeat * NOTE_CONFIG.BEATS_VISIBLE_ON_SCREEN;
  }, [bpm]);
  const visibleNotes = notes.filter(note => {
    const timeUntilHit = note.time - currentTime;
    return timeUntilHit > NOTE_CONFIG.visibleRangePast && timeUntilHit < NOTE_CONFIG.visibleRangeFuture;
  });

  return (
    <div className={styles.trackWrapper}>
      {/* 3Dパースペクティブトラック */}
      <div className={styles.perspectiveTrack}>
        {/* レーン */}
        <div className={styles.lanes}>
          {KEY_COLORS.slice(0, LANE_COUNT).map((color, i) => (
            <div
              key={i}
              className={styles.lane}
              style={{ '--lane-color': color.base } as React.CSSProperties}
            />
          ))}
        </div>

        {/* レーン区切り線 */}
        <div className={styles.laneLines}>
          {Array.from({ length: LANE_COUNT + 1 }, (_, i) => (
            <div 
              key={i} 
              className={styles.laneLine}
              style={{ left: `${(i / LANE_COUNT) * 100}%` }}
            />
          ))}
        </div>

        {/* ノーツ */}
        {visibleNotes.map(note => (
          <Note
            key={note.id}
            note={note}
            currentTime={currentTime}
            visibleDuration={visibleDuration}
          />
        ))}
      </div>

      {/* 判定ゾーン */}
      <div className={styles.hitLineContainer}>
        {KEY_COLORS.slice(0, LANE_COUNT).map((color, i) => (
          <div
            key={i}
            className={styles.hitZone}
            style={{ '--zone-color': color.base } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
