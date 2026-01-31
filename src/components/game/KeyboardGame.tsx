'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import NoteTrack from './NoteTrack';
import PianoKeys from './PianoKeys';
import ScoreDisplay from './ScoreDisplay';
import JudgmentDisplay from './JudgmentDisplay';
import { NoteData } from './Note';
import { 
  TIMING_WINDOWS, 
  SCORE_VALUES, 
  VIBRATION_DURATION,
  JUDGMENT_DISPLAY_DURATION,
  GAME_LOOP,
  JudgmentType
} from '@/lib/gameConfig';
import { useScreenLock } from '@/hooks/useScreenLock';
import { useFanService } from '@/hooks/useFanService';
import { useRoomIdFromUrl } from '@/hooks/useRoomIdFromUrl';
import { useFanServiceSender } from '@/hooks/useFanServiceSender';
import styles from './KeyboardGame.module.css';
import fanServiceStyles from './FanService.module.css';

interface KeyboardGameProps {
  notes: NoteData[];
  songStartedAt: string | null;
  songDuration?: number; // Duration in seconds
  bpm?: number;
  roomId?: string;
  userId?: string;
  onGameEnd?: (score: number, maxCombo: number) => void;
}

export default function KeyboardGame({ 
  notes: initialNotes, 
  songStartedAt,
  songDuration,
  bpm = 120,
  roomId = '',
  userId = '',
  onGameEnd 
}: KeyboardGameProps) {
  const [notes, setNotes] = useState<NoteData[]>(initialNotes);
  const [currentTime, setCurrentTime] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lastJudgment, setLastJudgment] = useState<JudgmentType | null>(null);
  const [judgmentId, setJudgmentId] = useState(0);
  const [isLandscape, setIsLandscape] = useState(true);
  
  // URLからroomIdを補完（Propsが空の場合）
  const activeRoomId = useRoomIdFromUrl(roomId);
  const { sendFanService: handleFanServiceSend, feedbackMessage: fanServiceSent } = useFanServiceSender(activeRoomId);

  const judgmentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameEndedRef = useRef(false);


  // propsが変更されたらstateを更新
  // propsが変更されたらstateを更新
  useEffect(() => {
    if (initialNotes.length > 0 && initialNotes.length !== notes.length) {
      setNotes(initialNotes);
    }
  }, [initialNotes]);



  // ファンサフック
  const {
    canSend: canSendFanService,
    cooldownSeconds,
    handleTouchStart: fanServiceTouchStart,
    handleTouchEnd: fanServiceTouchEnd,
  } = useFanService({
    userId,
    role: 'keyboard',
    onSend: handleFanServiceSend,
    enabled: true,
    initialCooldown: 0, // 最初から使用可能
  });



  // 画面を横向きでロック
  useScreenLock('landscape');

  // 画面の向きを検出
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

  // ゲーム時間の更新
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

  // ミス判定
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

  // ゲーム終了判定
  useEffect(() => {
    if (!songDuration || gameEndedRef.current) return;
    
    const durationMs = songDuration * 1000;
    if (currentTime >= durationMs) {
      gameEndedRef.current = true;
      onGameEnd?.(score, maxCombo);
    }
  }, [currentTime, songDuration, score, maxCombo, onGameEnd]);

  // 縦向きの場合は回転を促すオーバーレイを表示
  if (!isLandscape) {
    return (
      <div className={styles.rotateOverlay}>
        <div className={styles.rotateIcon}>📱</div>
        <div className={styles.rotateText}>
          横向きにしてプレイしてください
        </div>
        <div className={styles.rotateHint}>
          Rotate your device to landscape mode
        </div>
      </div>
    );
  }

  return (
    <div 
      className={styles.gameContainer}
      onTouchStart={fanServiceTouchStart}
      onTouchEnd={fanServiceTouchEnd}
    >
      {/* 判定表示（最上位に配置） */}
      <JudgmentDisplay judgment={lastJudgment} combo={combo} judgmentId={judgmentId} />



      {/* ファンサ送信フィードバック */}
      {fanServiceSent && (
        <div className={fanServiceStyles.fanServiceSent}>
          {fanServiceSent}
        </div>
      )}

      {/* 上部：スコア表示 */}
      <div className={styles.scoreArea}>
        <ScoreDisplay score={score} combo={combo} />
      </div>

      {/* ファンサ要求UI */}
      {canSendFanService ? (
        <div className={fanServiceStyles.fanServicePopup}>
          <div className={fanServiceStyles.fanServicePopupIcon}>🎤</div>
          <div className={fanServiceStyles.fanServicePopupText}>
            スワイプでファンサ要求！
          </div>
          <div className={fanServiceStyles.fanServicePopupDirections}>
            ↑👋 ↓💕 ←😉 →✌️
          </div>
        </div>
      ) : (
        <div className={fanServiceStyles.fanServiceCooldown}>
          ファンサ {cooldownSeconds}秒
        </div>
      )}

      {/* メインエリア（ノーツ落下） */}
      <div className={styles.mainArea}>
        <NoteTrack 
          notes={notes.filter(n => !n.hit)} 
          currentTime={currentTime} 
          bpm={bpm}
        />
      </div>

      {/* 下部：ピアノ鍵盤（横並び） */}
      <PianoKeys onKeyPress={handleKeyPress} />
    </div>
  );
}
