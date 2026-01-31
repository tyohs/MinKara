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
  NOTE_CONFIG
} from '@/lib/gameConfig';
import { useScreenLock } from '@/hooks/useScreenLock';
import styles from './DrumGame.module.css';
import { useFanService } from '@/hooks/useFanService';
import { FanServiceRequest, FAN_SERVICE_CONFIG } from '@/types/fanService';
import { supabase } from '@/lib/supabase';

interface DrumGameProps {
  notes: NoteData[];
  songStartedAt: string | null;
  songDuration?: number;
  roomId?: string;
  userId?: string;
  bpm?: number;
  onGameEnd?: (score: number, maxCombo: number) => void;
}

const HIT_LINE_POSITION = 0.18;

const DRUM_COLORS = [
  { base: '#06b6d4', active: '#22d3ee' }, // Cyan
  { base: '#d946ef', active: '#f0abfc' }, // Magenta
  { base: '#facc15', active: '#fef08a' }, // Yellow
] as const;

const DRUM_GROUP_COUNT = DRUM_COLORS.length;

const DRUM_PADS = [
  { label: 'CRASH L', group: 0, x: 15, y: 22, size: 'md', type: 'cymbal' },
  { label: 'CRASH R', group: 0, x: 90, y: 25, size: 'md', type: 'cymbal' },
  
  { label: 'SNARE', group: 1, x: 24, y: 58, size: 'md', type: 'drum' },
  { label: 'SNARE', group: 1, x: 80, y: 58, size: 'md', type: 'drum' },
  
  { label: 'KICK', group: 2, x: 10, y: 68, size: 'md', type: 'kick' },
  { label: 'KICK', group: 2, x: 95, y: 68, size: 'md', type: 'kick' },
] as const;

const getNoteGroup = (lane: number) => lane % DRUM_GROUP_COUNT;

export default function DrumGame({
  notes: initialNotes,
  songStartedAt,
  songDuration,
  roomId = '',
  userId = '',
  bpm = 120,
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

  // びりびり状態のstate
  const [isShocked, setIsShocked] = useState(false);

  const judgmentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameEndedRef = useRef(false);
  const visibleNotes = useMemo(() => notes.filter(note => !note.hit), [notes]);

  // リアルタイムの時間参照用Ref
  const currentTimeRef = useRef(0);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // URLからroomIdを補完
  const [urlRoomId, setUrlRoomId] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined' && !roomId) {
      const match = window.location.pathname.match(/\/room\/([^\/]+)/);
      if (match && match[1]) {
        setUrlRoomId(match[1]);
      }
    }
  }, [roomId]);

  const activeRoomId = roomId || urlRoomId;

  const [fanServiceSent, setFanServiceSent] = useState<string | null>(null);

  // ファンサ送信コールバック
  const handleFanServiceSend = useCallback(async (request: FanServiceRequest) => {
    if (!activeRoomId) return;
    
    try {
      const channel = supabase.channel(`room:${activeRoomId}`);
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Subscription timeout')), 5000);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve();
          }
        });
      });
      
      await channel.send({
        type: 'broadcast',
        event: 'fan_service',
        payload: request,
      });
      
      supabase.removeChannel(channel);
      
      const config = FAN_SERVICE_CONFIG[request.type];
      setFanServiceSent(`${config.icon} ${config.label}`);
      setTimeout(() => setFanServiceSent(null), 1500);
    } catch (error) {
      console.error('[DrumGame] Failed to send fan service:', error);
    }
  }, [activeRoomId]);

  // ファンサフック
  const {
    canSend: canSendFanService,
    cooldownSeconds,
    handleTouchStart: fanServiceTouchStart,
    handleTouchEnd: fanServiceTouchEnd,
  } = useFanService({
    userId,
    role: 'drum',
    onSend: handleFanServiceSend,
    enabled: true,
    initialCooldown: 0,
  });

  const visibleDuration = useMemo(() => {
    const msPerBeat = 60000 / bpm;
    // 2D等速スクロールのため、3D表示（手前で加速する）に比べて体感速度が遅くなるのを補正
    return msPerBeat * NOTE_CONFIG.beatsVisible * 0.6; 
  }, [bpm]);

  // びりびりエフェクトを発生させる関数
  const triggerShockEffect = () => {
    setIsShocked(true);
    setTimeout(() => setIsShocked(false), 500);
  };

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

  // お邪魔イベント受信
  useEffect(() => {
    if (!activeRoomId) return;

    const channel = supabase.channel(`room:${activeRoomId}`);
    
    channel
      .on('broadcast', { event: 'obstruct' }, (payload) => {
        if (payload.payload.action === 'add_note') {
          const newNote: NoteData = {
            id: `obstruct-${Date.now()}`,
            lane: Math.floor(Math.random() * 3), // 0-2のランダムなレーン
            time: currentTimeRef.current + 2000, // 2秒後に降ってくる
            type: 'normal',
            hit: false,
            isObstruction: true, // お邪魔フラグ
          };
          setNotes(prev => [...prev, newNote]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoomId]);

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

    // お邪魔ノーツを叩いた場合はエフェクト発動！
    if (targetNote.isObstruction) {
      triggerShockEffect();
    }

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
    <div 
      className={`${styles.gameContainer} ${isShocked ? styles.shockedContainer : ''}`}
      onTouchStart={fanServiceTouchStart}
      onTouchEnd={fanServiceTouchEnd}
    >
        {/* Background video */}
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

      {/* ファンサ送信フィードバック */}
      {fanServiceSent && (
        <div className={styles.fanServiceSent}>
          {fanServiceSent}
        </div>
      )}

      {/* ファンサ要求UI */}
      {canSendFanService ? (
        <div className={styles.fanServicePopup}>
          <div className={styles.fanServicePopupIcon}>🎤</div>
          <div className={styles.fanServicePopupText}>
            スワイプでファンサ要求！
          </div>
          <div className={styles.fanServicePopupDirections}>
            ↑👋 ↓💕 ←😉 →✌️
          </div>
        </div>
      ) : (
        <div className={styles.fanServiceCooldown}>
          ファンサ {cooldownSeconds}秒
        </div>
      )}

      <div className={styles.noteRailArea}>
        <div className={styles.scoreWrapper}>
            <ScoreDisplay score={score} combo={combo} />
        </div>

        <div className={styles.noteRail}>
          <div className={styles.noteLine} />
          <div className={styles.hitMarker} />
          {visibleNotes.map(note => {
            const timeDiff = note.time - currentTime;
            const progress = timeDiff / visibleDuration;
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
                  backgroundColor: note.isObstruction ? 'transparent' : color.base,
                  color: note.isObstruction ? undefined : color.base, 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: note.isObstruction ? '2rem' : undefined,
                  boxShadow: note.isObstruction ? 'none' : undefined,
                } as React.CSSProperties}
              >
                {/* お邪魔ノーツなら👿を表示 */}
                {note.isObstruction ? '👿' : null}
              </div>
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