'use client';

import { useRef, useEffect, useState } from 'react';
import Note, { NoteData } from './Note';
import { KEY_COLORS, LANE_COUNT, NOTE_CONFIG } from '@/lib/gameConfig';
import styles from './NoteTrack.module.css';

interface NoteTrackProps {
  notes: NoteData[];
  currentTime: number;
  noteSpeed?: number;
}

export default function NoteTrack({ 
  notes, 
  currentTime, 
  noteSpeed = NOTE_CONFIG.defaultSpeed 
}: NoteTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackHeight, setTrackHeight] = useState(400);

  useEffect(() => {
    const updateHeight = () => {
      if (trackRef.current) {
        setTrackHeight(trackRef.current.clientHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const visibleNotes = notes.filter(note => {
    const timeUntilHit = note.time - currentTime;
    return timeUntilHit > NOTE_CONFIG.visibleRangePast && timeUntilHit < NOTE_CONFIG.visibleRangeFuture;
  });

  return (
    <div className={styles.trackWrapper} ref={trackRef}>
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
            noteSpeed={noteSpeed}
            trackHeight={trackHeight}
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
