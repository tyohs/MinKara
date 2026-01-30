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
  LANE_COUNT,
  NOTE_CONFIG
} from '@/lib/gameConfig';
import { useScreenLock } from '@/hooks/useScreenLock';
import styles from './GuitarGame.module.css';
import { useFanService } from '@/hooks/useFanService';
import { FanServiceRequest, FAN_SERVICE_CONFIG } from '@/types/fanService';
import { supabase } from '@/lib/supabase';

interface GuitarGameProps {
  notes: NoteData[];
  songStartedAt: string | null;
  songDuration?: number;
  roomId?: string;
  userId?: string;
  bpm?: number;
  onGameEnd?: (score: number, maxCombo: number) => void;
}

// Note travel time from right to judgment line (ms) - Sped up for better rhythmic feel
// Note travel time is no longer fixed, calculated from BPM
// const NOTE_TRAVEL_TIME = 1500;

export default function GuitarGame({ 
  notes: initialNotes, 
  songStartedAt,
  songDuration,
  roomId = '',
  userId = '',
  bpm = 120,
  onGameEnd 
}: GuitarGameProps) {
  const [notes, setNotes] = useState<NoteData[]>(initialNotes);
  const [currentTime, setCurrentTime] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lastJudgment, setLastJudgment] = useState<JudgmentType | null>(null);
  const [judgmentId, setJudgmentId] = useState(0);
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());
  
  const judgmentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameEndedRef = useRef(false);

  // 画面を縦向きでロック（ギターを持つように）
  useScreenLock('portrait');

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
      
      // 送信フィードバック表示
      const config = FAN_SERVICE_CONFIG[request.type];
      setFanServiceSent(`${config.icon} ${config.label}`);
      setTimeout(() => setFanServiceSent(null), 1500);
    } catch (error) {
      console.error('[GuitarGame] Failed to send fan service:', error);
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
    role: 'guitar',
    onSend: handleFanServiceSend,
    enabled: true,
    initialCooldown: 0,
  });

  const visibleDuration = useMemo(() => {
    const msPerBeat = 60000 / bpm;
    // 2D等速スクロールのため、3D表示（手前で加速する）に比べて体感速度が遅くなるのを補正
    // 0.6を掛けることで、より速いスクロール速度（Hi-Speed）を実現
    return msPerBeat * NOTE_CONFIG.beatsVisible * 0.6; 
  }, [bpm]);

  // Calculate lane positions (evenly distributed) - Vertical layout
  const laneWidth = 50;
  const laneGap = 4;
  const totalLanes = LANE_COUNT;
  
  // For vertical layout, get X position for each lane
  const getLaneX = (lane: number) => {
    const trackWidth = totalLanes * laneWidth + (totalLanes - 1) * laneGap;
    const startX = (typeof window !== 'undefined' ? window.innerWidth : 400 - trackWidth) / 2 - trackWidth / 2;
    return startX + lane * (laneWidth + laneGap);
  };


  // Game time update
  useEffect(() => {
    if (!songStartedAt) return;

    const serverStartTime = new Date(songStartedAt).getTime();

    const updateTime = () => {
      const now = Date.now();
      const elapsed = now - serverStartTime;
      setCurrentTime(elapsed);
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

  const handleKeyPress = useCallback((lane: number) => {
    const targetNote = notes.find(note => 
      note.lane === lane && 
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (judgmentTimeoutRef.current) {
        clearTimeout(judgmentTimeoutRef.current);
      }
    };
  }, []);

  // Miss detection
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

  // Game end detection
  useEffect(() => {
    if (!songDuration || gameEndedRef.current) return;
    
    const durationMs = songDuration * 1000;
    if (currentTime >= durationMs) {
      gameEndedRef.current = true;
      onGameEnd?.(score, maxCombo);
    }
  }, [currentTime, songDuration, score, maxCombo, onGameEnd]);

  // Calculate note position (vertical - top to bottom)
  const getNoteY = (noteTime: number) => {
    const timeDiff = noteTime - currentTime;
    const progress = timeDiff / visibleDuration;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
    // Buttons are bottom: 20px, height: 80px.
    // Adjusted judgment line to be slightly higher (near top edge of buttons)
    // based on user feedback to balance "too early" vs "too late" feel.
    const judgmentLineY = screenHeight - 110;
    return judgmentLineY - progress * judgmentLineY;
  };

  return (
    <div 
      className={styles.gameContainer}
      onTouchStart={fanServiceTouchStart}
      onTouchEnd={fanServiceTouchEnd}
    >
      {/* Judgment display (Fixed overlay) */}
      <JudgmentDisplay judgment={lastJudgment} combo={combo} judgmentId={judgmentId} />

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

      {/* Score area */}
      <div className={styles.scoreArea}>
        <ScoreDisplay score={score} combo={combo} />
      </div>

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

      {/* Main game area */}
      <div className={styles.mainArea}>
        {/* Judgment line removed */}

        {/* Note track */}
        <div className={styles.noteTrack}>
          {/* Vertical string lanes */}
          {Array.from({ length: totalLanes }).map((_, lane) => (
            <div 
              key={lane}
              className={styles.stringLane}
              style={{ left: getLaneX(lane) }}
            />
          ))}

          {/* Notes falling from top */}
          {notes.filter(n => !n.hit).map(note => {
            const y = getNoteY(note.time);
            const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
            // Only render notes visible on screen
            if (y < -50 || y > screenHeight + 50) return null;
            
            
            return (
              <div
                key={note.id}
                className={`${styles.note} ${styles[`lane${note.lane}`]} ${note.type === 'special' ? styles.special : ''}`}
                style={{
                  left: getLaneX(note.lane), // Use exact lane center
                  top: y,
                }}
              />
            );
          })}
        </div>



        {/* Touch buttons (bottom, horizontal - like guitar frets) */}
        <div className={styles.stringLabels}>
          {Array.from({ length: totalLanes }).map((_, index) => (
            <div 
              key={index}
              className={`${styles.stringLabel} ${styles[`lane${index}`]} ${activeKeys.has(index) ? styles.active : ''}`}
              style={{ left: getLaneX(index) }} // Position exactly with lane center
              onTouchStart={(e) => {
                e.preventDefault();
                setActiveKeys(prev => new Set(prev).add(index));
                handleKeyPress(index);
              }}
              onTouchEnd={() => {
                setActiveKeys(prev => {
                  const next = new Set(prev);
                  next.delete(index);
                  return next;
                });
              }}
              onTouchCancel={() => {
                setActiveKeys(prev => {
                  const next = new Set(prev);
                  next.delete(index);
                  return next;
                });
              }}
            >
              <span className={styles.stringNumber}>{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
