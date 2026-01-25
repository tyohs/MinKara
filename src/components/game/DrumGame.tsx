'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ScoreDisplay from './ScoreDisplay';
import JudgmentDisplay from './JudgmentDisplay';
import { NoteData } from './Note';
import {
  TIMING_WINDOWS,
  SCORE_VALUES,
  VIBRATION_DURATION,
  JUDGMENT_DISPLAY_DURATION,
  GAME_LOOP,
  JudgmentType,
} from '@/lib/gameConfig';
import { useScreenLock } from '@/hooks/useScreenLock';
import styles from './DrumGame.module.css';

interface DrumGameProps {
  notes: NoteData[];
  songStartedAt: string | null;
  songDuration?: number;
  onGameEnd?: (score: number, maxCombo: number) => void;
}

const NOTE_TRAVEL_TIME = 2200;
const HIT_LINE_POSITION = 0.18;

const DRUM_COLORS = [
  { base: '#06b6d4', active: '#22d3ee' }, // Cyan
  { base: '#d946ef', active: '#f0abfc' }, // Magenta
  { base: '#facc15', active: '#fef08a' }, // Yellow
] as const;

const DRUM_GROUP_COUNT = DRUM_COLORS.length;

const DRUM_PADS = [
  { label: 'CRASH L', group: 0, x: 25, y: 25, size: 'md' },
  { label: 'TOM 1', group: 1, x: 40, y: 35, size: 'md' },
  { label: 'TOM 2', group: 1, x: 60, y: 35, size: 'md' },
  { label: 'CRASH R', group: 0, x: 75, y: 25, size: 'md' },
  
  { label: 'HI-HAT', group: 0, x: 20, y: 55, size: 'md' },
  { label: 'SNARE', group: 1, x: 38, y: 65, size: 'lg' },
  { label: 'FLOOR', group: 1, x: 62, y: 65, size: 'lg' },
  { label: 'RIDE', group: 0, x: 80, y: 55, size: 'md' },
  
  { label: 'KICK', group: 2, x: 50, y: 85, size: 'xl' },
] as const;

const getNoteGroup = (lane: number) => lane % DRUM_GROUP_COUNT;

export default function DrumGame({
  notes: initialNotes,
  songStartedAt,
  songDuration,
  onGameEnd,
}: DrumGameProps) {
  const [notes, setNotes] = useState<NoteData[]>(initialNotes);
  const [currentTime, setCurrentTime] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lastJudgment, setLastJudgment] = useState<JudgmentType | null>(null);
  const [judgmentId, setJudgmentId] = useState(0);
  const [activePads, setActivePads] = useState<Set<number>>(new Set());
  const [isLandscape, setIsLandscape] = useState(true);

  const judgmentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameEndedRef = useRef(false);
  const visibleNotes = useMemo(() => notes.filter(note => !note.hit), [notes]);

  useScreenLock('landscape');

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  useEffect(() => {
    if (!songStartedAt) return;

    const serverStartTime = new Date(songStartedAt).getTime();
    const updateTime = () => {
      setCurrentTime(Date.now() - serverStartTime);
    };

    updateTime();
    const interval = setInterval(updateTime, GAME_LOOP.frameInterval);
    return () => clearInterval(interval);
  }, [songStartedAt]);

  const showJudgment = useCallback((judgment: JudgmentType) => {
    if (judgmentTimeoutRef.current) {
      clearTimeout(judgmentTimeoutRef.current);
    }
    setLastJudgment(judgment);
    setJudgmentId(prev => prev + 1);
    judgmentTimeoutRef.current = setTimeout(() => {
      setLastJudgment(null);
    }, JUDGMENT_DISPLAY_DURATION);
  }, []);

  const handleKeyPress = useCallback((group: number) => {
    const targetNote = notes.find(note =>
      getNoteGroup(note.lane) === group &&
      !note.hit &&
      Math.abs(note.time - currentTime) <= TIMING_WINDOWS.good
    );

    if (!targetNote) return;

    const timeDiff = Math.abs(targetNote.time - currentTime);
    let judgment: JudgmentType;

    if (timeDiff <= TIMING_WINDOWS.perfect) {
      judgment = 'perfect';
    } else if (timeDiff <= TIMING_WINDOWS.great) {
      judgment = 'great';
    } else {
      judgment = 'good';
    }

    setNotes(prev => prev.map(note =>
      note.id === targetNote.id ? { ...note, hit: true } : note
    ));

    const baseScore = SCORE_VALUES[judgment];
    const comboBonus = 1 + combo / 100;
    const finalScore = Math.floor(baseScore * comboBonus);

    setScore(prev => prev + finalScore);
    setCombo(prev => {
      const newCombo = prev + 1;
      setMaxCombo(current => Math.max(current, newCombo));
      return newCombo;
    });
    showJudgment(judgment);

    if (navigator.vibrate) {
      navigator.vibrate(VIBRATION_DURATION[judgment]);
    }
  }, [notes, currentTime, combo, showJudgment]);

  useEffect(() => {
    return () => {
      if (judgmentTimeoutRef.current) {
        clearTimeout(judgmentTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const missedNotes = notes.filter(note =>
      !note.hit &&
      note.time < currentTime - TIMING_WINDOWS.good - 50
    );

    if (missedNotes.length > 0) {
      setNotes(prev => prev.map(note =>
        missedNotes.some(m => m.id === note.id)
          ? { ...note, hit: true }
          : note
      ));

      setCombo(0);
      showJudgment('miss');

      if (navigator.vibrate) {
        navigator.vibrate(VIBRATION_DURATION.miss);
      }
    }
  }, [currentTime, notes, showJudgment]);

  useEffect(() => {
    if (!songDuration || gameEndedRef.current) return;

    const durationMs = songDuration * 1000;
    if (currentTime >= durationMs) {
      gameEndedRef.current = true;
      onGameEnd?.(score, maxCombo);
    }
  }, [currentTime, songDuration, score, maxCombo, onGameEnd]);

  const handlePadDown = useCallback((index: number, group: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setActivePads(prev => new Set(prev).add(index));
    handleKeyPress(group);
  }, [handleKeyPress]);

  const handlePadUp = useCallback((index: number) => () => {
    setActivePads(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  if (!isLandscape) {
    return (
      <div className={styles.rotateOverlay}>
        <div className={styles.rotateTitle}>横向きにしてプレイしてください</div>
        <div className={styles.rotateHint}>端末を横向きにするとドラムが表示されます</div>
      </div>
    );
  }

  return (
    <div className={styles.gameContainer}>
        {/* Background video matching GuitarGame */}
        <video 
          className={styles.backgroundVideo}
          autoPlay 
          loop 
          muted 
          playsInline
          aria-hidden="true"
        >
          <source src="/videos/Musical_Instruments_in_Space_Video.mp4" type="video/mp4" />
        </video>

      <JudgmentDisplay judgment={lastJudgment} combo={combo} judgmentId={judgmentId} />

      <div className={styles.noteRailArea}>
        <div className={styles.scoreWrapper}>
            <ScoreDisplay score={score} combo={combo} />
        </div>

        <div className={styles.noteRail}>
          <div className={styles.noteLine} />
          <div className={styles.hitMarker} />
          {visibleNotes.map(note => {
            const timeDiff = note.time - currentTime;
            const progress = timeDiff / NOTE_TRAVEL_TIME;
            const left = HIT_LINE_POSITION + progress * (1 - HIT_LINE_POSITION);
            if (left < -0.1 || left > 1.1) return null;

            const group = getNoteGroup(note.lane);
            const color = DRUM_COLORS[group] ?? DRUM_COLORS[0];

            return (
              <div
                key={note.id}
                className={`${styles.note} ${note.type === 'special' ? styles.special : ''}`}
                style={{
                  left: `${left * 100}%`,
                  color: color.base, // Used for box-shadow currentColor
                  backgroundColor: color.base,
                } as React.CSSProperties}
              />
            );
          })}
        </div>
      </div>

      <div className={styles.drumStage}>
        <div className={styles.drumKit}>
          {DRUM_PADS.map((pad, index) => {
            const color = DRUM_COLORS[pad.group] ?? DRUM_COLORS[0];
            const isActive = activePads.has(index);
            
            return (
              <button
                key={`${pad.label}-${index}`}
                className={`${styles.pad} ${styles[`size-${pad.size}`]} ${styles[pad.type]} ${isActive ? styles.active : ''}`}
                style={{
                  '--pad-color': color.base,
                  '--pad-color-dark': `${color.base}60`,
                  '--pad-glow': color.active,
                  left: `${pad.x}%`,
                  top: `${pad.y}%`,
                } as React.CSSProperties}
                onPointerDown={handlePadDown(index, pad.group)}
                onPointerUp={handlePadUp(index)}
                onPointerCancel={handlePadUp(index)}
                onPointerLeave={handlePadUp(index)}
                aria-label={pad.label}
              >
                <span className={styles.padLabel}>{pad.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
