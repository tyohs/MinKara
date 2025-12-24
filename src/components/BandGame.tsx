'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InstrumentType, INSTRUMENT_INFO } from '@/types';
import { 
  NoteData, 
  InstrumentChart, 
  Judgment, 
  JUDGMENT_WINDOWS, 
  JUDGMENT_MULTIPLIERS,
  BASE_POINTS,
  getComboMultiplier,
} from '@/data/charts';
import { useRoomStore } from '@/store/roomStore';

interface NoteState extends NoteData {
  id: number;
  hit: boolean;
  judgment?: Judgment;
}

// 通常コール
interface CallItem {
  id: string;
  text: string;
  emoji: string;
  cost: number;
}

// 歌手へのリクエスト（高コスト）
interface RequestItem {
  id: string;
  text: string;
  emoji: string;
  cost: number;
  cooldown: number; // クールダウン（ms）
}

// 4方向スワイプ用コール
const SWIPE_CALLS: Record<'up' | 'down' | 'left' | 'right', CallItem> = {
  up: { id: 'yeah', text: 'イェーイ！', emoji: '🎉', cost: 200 },
  down: { id: 'fuu', text: 'フゥー！', emoji: '🔥', cost: 300 },
  left: { id: 'kawaii', text: 'かわいい！', emoji: '💖', cost: 300 },
  right: { id: 'saikou', text: 'サイコー！', emoji: '⭐', cost: 500 },
};

const CALLS: CallItem[] = [
  SWIPE_CALLS.up,
  SWIPE_CALLS.down,
  SWIPE_CALLS.left,
  SWIPE_CALLS.right,
];

const REQUESTS: RequestItem[] = [
  { id: 'wave', text: '手を振って！', emoji: '👋', cost: 1500, cooldown: 30000 },
  { id: 'peace', text: 'ピース！', emoji: '✌️', cost: 2000, cooldown: 30000 },
  { id: 'heart', text: 'ハート作って！', emoji: '🫶', cost: 2500, cooldown: 30000 },
  { id: 'wink', text: 'ウィンクして！', emoji: '😘', cost: 3000, cooldown: 30000 },
];

// 振動フィードバック
function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

interface BandGameProps {
  chart: InstrumentChart;
  instrument: InstrumentType;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  mvUrl?: string | null;
  onScoreUpdate: (score: number, combo: number) => void;
  onGameEnd?: () => void;
}

export default function BandGame({ 
  chart, 
  instrument, 
  audioRef,
  mvUrl,
  onScoreUpdate,
  onGameEnd 
}: BandGameProps) {
  const [notes, setNotes] = useState<NoteState[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lastJudgment, setLastJudgment] = useState<Judgment | null>(null);
  const [showMissEffect, setShowMissEffect] = useState(false);
  const [activeCall, setActiveCall] = useState<CallItem | RequestItem | null>(null);
  const [hitEffect, setHitEffect] = useState<{x: number, y: number, isSpecial: boolean} | null>(null);
  const [selectedCallIndex, setSelectedCallIndex] = useState(0);
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down' | 'left' | 'right' | null>(null);
  const [requestCooldowns, setRequestCooldowns] = useState<Record<string, number>>({});
  const [customMessage, setCustomMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const laneRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const info = INSTRUMENT_INFO[instrument];

  useEffect(() => {
    const initialNotes: NoteState[] = chart.notes.map((note, index) => ({
      ...note,
      id: index,
      hit: false,
    }));
    setNotes(initialNotes);
    setScore(0);
    setTotalScore(0);
    setCombo(0);
    setMaxCombo(0);
  }, [chart]);

  useEffect(() => {
    const gameLoop = () => {
      if (audioRef.current) {
        const time = audioRef.current.currentTime * 1000;
        setCurrentTime(time);

        // Sync video with audio
        if (videoRef.current && mvUrl) {
          const diff = Math.abs(videoRef.current.currentTime - audioRef.current.currentTime);
          if (diff > 0.1) {
            videoRef.current.currentTime = audioRef.current.currentTime;
          }
        }

        if (audioRef.current.ended) {
          onGameEnd?.();
          return;
        }
      }
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioRef, onGameEnd, mvUrl]);

  // クールダウン更新
  useEffect(() => {
    const interval = setInterval(() => {
      setRequestCooldowns(prev => {
        const now = Date.now();
        const updated: Record<string, number> = {};
        for (const [id, endTime] of Object.entries(prev)) {
          if (endTime > now) {
            updated[id] = endTime;
          }
        }
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setNotes(prevNotes => {
      let missCount = 0;
      const updated = prevNotes.map(note => {
        if (!note.hit && note.time + JUDGMENT_WINDOWS.good < currentTime) {
          missCount++;
          return { ...note, hit: true, judgment: 'miss' as Judgment };
        }
        return note;
      });

      if (missCount > 0) {
        setCombo(0);
        setShowMissEffect(true);
        vibrate(100);
        setTimeout(() => setShowMissEffect(false), 200);
      }

      return updated;
    });
  }, [currentTime]);

  useEffect(() => {
    onScoreUpdate(totalScore, combo);
  }, [totalScore, combo, onScoreUpdate]);

  useEffect(() => {
    if (combo > maxCombo) {
      setMaxCombo(combo);
    }
  }, [combo, maxCombo]);

  // ノートをタップ
  const handleTap = useCallback((e?: React.TouchEvent | React.MouseEvent) => {
    const targetNote = notes
      .filter(n => !n.hit)
      .reduce<NoteState | null>((closest, note) => {
        const diff = Math.abs(note.time - currentTime);
        if (diff > JUDGMENT_WINDOWS.good) return closest;
        if (!closest) return note;
        return diff < Math.abs(closest.time - currentTime) ? note : closest;
      }, null);

    if (!targetNote) return;

    const diff = Math.abs(targetNote.time - currentTime);
    let judgment: Judgment;

    if (diff <= JUDGMENT_WINDOWS.perfect) {
      judgment = 'perfect';
      vibrate(targetNote.type === 'special' ? [50, 30, 50, 30, 50] : 30);
    } else if (diff <= JUDGMENT_WINDOWS.great) {
      judgment = 'great';
      vibrate(targetNote.type === 'special' ? [40, 20, 40] : 20);
    } else {
      judgment = 'good';
      vibrate(10);
    }

    const basePoints = BASE_POINTS[targetNote.type];
    const multiplier = JUDGMENT_MULTIPLIERS[judgment];
    const newCombo = combo + 1;
    const comboMultiplier = getComboMultiplier(newCombo);
    const points = Math.floor(basePoints * multiplier * comboMultiplier);

    setNotes(prev => prev.map(n => 
      n.id === targetNote.id ? { ...n, hit: true, judgment } : n
    ));
    setScore(prev => prev + points);
    setTotalScore(prev => prev + points);
    setCombo(newCombo);
    setLastJudgment(judgment);
    
    if (e && laneRef.current) {
      const rect = laneRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setHitEffect({
        x: ((clientX - rect.left) / rect.width) * 100,
        y: ((clientY - rect.top) / rect.height) * 100,
        isSpecial: targetNote.type === 'special',
      });
    }
    
    setTimeout(() => {
      setLastJudgment(null);
      setHitEffect(null);
    }, targetNote.type === 'special' ? 600 : 300);
  }, [notes, currentTime, combo]);

  // コール発動
  const handleCall = useCallback((call: CallItem) => {
    if (score < call.cost) return;
    
    setActiveCall(call);
    setScore(prev => Math.max(0, prev - call.cost));
    vibrate([50, 30, 50]);
    
    // Broadcast to other players
    useRoomStore.getState().broadcastCall(call.text, call.emoji);
    
    setTimeout(() => setActiveCall(null), 1200);
  }, [score]);

  // スワイプ開始位置記録
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setSwipeStartY(e.touches[0].clientY);
    setSwipeStartX(e.touches[0].clientX);
    handleTap(e);
  }, [handleTap]);

  // 4方向スワイプでコール発動
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (swipeStartY === null || swipeStartX === null) {
      setSwipeStartY(null);
      setSwipeStartX(null);
      return;
    }
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - swipeStartX;
    const deltaY = swipeStartY - endY; // 上が正
    
    const minSwipe = 50;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    // スワイプ方向を判定
    if (absX > minSwipe || absY > minSwipe) {
      let direction: 'up' | 'down' | 'left' | 'right';
      
      if (absY > absX) {
        // 縦方向
        direction = deltaY > 0 ? 'up' : 'down';
      } else {
        // 横方向
        direction = deltaX > 0 ? 'right' : 'left';
      }
      
      const call = SWIPE_CALLS[direction];
      if (score >= call.cost) {
        handleCall(call);
        setSwipeDirection(direction);
        setTimeout(() => setSwipeDirection(null), 500);
      }
    }
    
    setSwipeStartY(null);
    setSwipeStartX(null);
  }, [swipeStartY, swipeStartX, score, handleCall]);

  const handleRequest = useCallback((request: RequestItem) => {
    if (score < request.cost) return;
    if (requestCooldowns[request.id]) return;
    
    setActiveCall(request);
    setScore(prev => Math.max(0, prev - request.cost));
    setRequestCooldowns(prev => ({
      ...prev,
      [request.id]: Date.now() + request.cooldown,
    }));
    vibrate([100, 50, 100, 50, 100]);
    
    // Broadcast request to singer
    useRoomStore.getState().broadcastRequest(request.text, request.emoji);
    
    setTimeout(() => setActiveCall(null), 2000);
  }, [score, requestCooldowns]);

  const selectCall = useCallback((index: number) => {
    setSelectedCallIndex(index);
  }, []);

  const APPROACH_TIME = 2000;
  const selectedCall = CALLS[selectedCallIndex];
  const canUseSelectedCall = score >= selectedCall.cost;

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Video Background Layer */}
      {mvUrl && (
        <video
          ref={videoRef}
          src={mvUrl}
          className="absolute inset-0 w-full h-full object-cover z-0"
          muted
          playsInline
          autoPlay
          style={{ opacity: 0.5 }}
        />
      )}
      
      {/* Dark overlay for video */}
      {mvUrl && (
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-gray-900/40 z-[1]" />
      )}
      
      {/* Default background (when no video) */}
      {!mvUrl && (
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/50 via-gray-900 to-gray-900" />
      )}
      
      {/* Miss effect */}
      <AnimatePresence>
        {showMissEffect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-500/30 pointer-events-none z-50"
          />
        )}
      </AnimatePresence>

      {/* Special hit effect - full screen */}
      <AnimatePresence>
        {hitEffect?.isSpecial && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0] }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 pointer-events-none z-40"
              style={{
                background: 'radial-gradient(circle at center, rgba(255,200,0,0.5) 0%, transparent 70%)',
              }}
            />
            {/* Particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: '50%', 
                  y: '85%',
                  scale: 0,
                  opacity: 1,
                }}
                animate={{ 
                  x: `${50 + (Math.random() - 0.5) * 80}%`,
                  y: `${85 - Math.random() * 60}%`,
                  scale: [0, 1.5, 0],
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="absolute w-4 h-4 pointer-events-none z-50"
                style={{
                  background: ['#fbbf24', '#f97316', '#ec4899', '#a855f7'][i % 4],
                  borderRadius: i % 2 === 0 ? '50%' : '0',
                  transform: `rotate(${i * 30}deg)`,
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Active Call/Request Display */}
      <AnimatePresence>
        {activeCall && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="text-center">
              <motion.span 
                className="text-8xl block mb-2"
                animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.3 }}
              >
                {activeCall.emoji}
              </motion.span>
              <span 
                className="text-3xl font-bold text-white"
                style={{ textShadow: '0 0 30px rgba(168, 85, 247, 0.8)' }}
              >
                {activeCall.text}
              </span>
              {'cooldown' in activeCall && (
                <div className="mt-2 text-yellow-400 text-sm">→ 歌手にリクエスト送信！</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top UI Bar */}
      <div className="relative z-20 p-3 flex items-center justify-between">
        <div>
          <div className="text-white/50 text-xs">SCORE</div>
          <motion.div 
            key={totalScore}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-2xl font-bold text-white"
          >
            {totalScore.toLocaleString()}
          </motion.div>
        </div>

        <div className="flex items-center gap-3">
          <div 
            className="px-4 py-2 rounded-full flex items-center gap-2"
            style={{ backgroundColor: `${info.color}30` }}
          >
            <span className="text-xl">{info.emoji}</span>
            <span className="text-white text-sm font-medium">{info.label}</span>
          </div>
          
          {/* Stop Button */}
          <button
            onClick={() => onGameEnd?.()}
            className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors"
            title="ゲームを終了"
          >
            ⏹
          </button>
        </div>

        <div className="text-right">
          <div className="text-white/50 text-xs">COMBO</div>
          <motion.div 
            key={combo}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-3xl font-bold"
            style={{ 
              color: combo >= 50 ? '#fbbf24' : combo >= 20 ? '#a855f7' : 'white' 
            }}
          >
            {combo}
          </motion.div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex relative">
        {/* Left - Calls */}
        <div className="w-20 flex flex-col justify-center gap-3 p-2 z-20">
          <div className="text-white/50 text-xs text-center mb-1">コール</div>
          {CALLS.map((call, index) => {
            const isSelected = selectedCallIndex === index;
            const canUse = score >= call.cost;
            return (
              <motion.button
                key={call.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  selectCall(index);
                  if (canUse) handleCall(call);
                }}
                className={`
                  aspect-square rounded-xl flex flex-col items-center justify-center
                  transition-all min-h-[56px]
                  ${isSelected ? 'ring-2 ring-white' : ''}
                  ${canUse ? 'opacity-100' : 'opacity-40'}
                `}
                style={{
                  background: isSelected ? `${info.color}50` : 'rgba(255,255,255,0.1)',
                }}
              >
                <span className="text-2xl">{call.emoji}</span>
                <span className="text-white/60 text-xs">{call.cost}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Center Lane */}
        <div 
          ref={laneRef}
          className="flex-1 relative cursor-pointer select-none"
          onClick={handleTap}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className="absolute inset-x-4 top-0 bottom-0 rounded-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.1) 0%, rgba(59, 130, 246, 0.2) 100%)',
              border: '2px solid rgba(255,255,255,0.1)',
            }}
          />

          {/* Normal Hit effect */}
          <AnimatePresence>
            {hitEffect && !hitEffect.isSpecial && (
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 2.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                className="absolute w-16 h-16 rounded-full pointer-events-none"
                style={{
                  left: `${hitEffect.x}%`,
                  top: `${hitEffect.y}%`,
                  transform: 'translate(-50%, -50%)',
                  background: `radial-gradient(circle, ${info.color} 0%, transparent 70%)`,
                }}
              />
            )}
          </AnimatePresence>

          {/* Notes - 幅を1/4に縮小 */}
          {notes.map(note => {
            if (note.hit) return null;
            
            const timeUntilHit = note.time - currentTime;
            if (timeUntilHit > APPROACH_TIME || timeUntilHit < -200) return null;

            const progress = 1 - (timeUntilHit / APPROACH_TIME);
            const y = 5 + progress * 80;
            const scale = 0.4 + progress * 0.6;
            // 幅を大幅に縮小（約20%幅）
            const width = (note.type === 'special' ? 22 : 18) * scale;
            const height = (note.type === 'special' ? 22 : 16) * scale;

            return (
              <motion.div
                key={note.id}
                className="absolute left-1/2 rounded-lg flex items-center justify-center"
                style={{
                  top: `${y}%`,
                  width: `${width}%`,
                  height: height,
                  transform: 'translateX(-50%)',
                  background: note.type === 'special' 
                    ? 'linear-gradient(135deg, #fbbf24, #f97316, #ec4899)'
                    : `${info.color}`,
                  boxShadow: note.type === 'special'
                    ? `0 0 ${25 * scale}px rgba(251, 191, 36, 0.8)`
                    : `0 0 ${15 * scale}px ${info.color}60`,
                  opacity: 0.5 + progress * 0.5,
                  border: note.type === 'special' ? '2px solid rgba(255,255,255,0.5)' : 'none',
                }}
                animate={note.type === 'special' ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.5 }}
              >
                {note.type === 'special' && (
                  <span className="text-white text-xs font-bold">★</span>
                )}
              </motion.div>
            );
          })}

          {/* Judgment Line */}
          <div 
            className="absolute left-4 right-4 flex items-center justify-center rounded-xl"
            style={{
              top: '85%',
              height: '40px',
              background: 'linear-gradient(90deg, transparent 5%, rgba(168, 85, 247, 0.4) 50%, transparent 95%)',
              borderTop: '3px solid rgba(168, 85, 247, 0.8)',
              boxShadow: '0 0 30px rgba(168, 85, 247, 0.5)',
            }}
          >
            <AnimatePresence>
              {lastJudgment && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: hitEffect?.isSpecial ? 1.5 : 1.2 }}
                  exit={{ opacity: 0, y: -30 }}
                  className="absolute -top-14 font-bold text-3xl"
                  style={{
                    color: lastJudgment === 'perfect' ? '#fbbf24' :
                           lastJudgment === 'great' ? '#a855f7' : '#22c55e',
                    textShadow: hitEffect?.isSpecial 
                      ? '0 0 30px currentColor, 0 0 60px currentColor'
                      : '0 0 20px currentColor',
                  }}
                >
                  {lastJudgment.toUpperCase()}
                  {hitEffect?.isSpecial && ' ✨'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/30 text-xs">
            ↑ 上スワイプでコール
          </div>
        </div>

        {/* Right - Requests */}
        <div className="w-20 flex flex-col justify-center gap-3 p-2 z-20">
          <div className="text-yellow-400/70 text-xs text-center mb-1">リクエスト</div>
          {REQUESTS.map(request => {
            const canUse = score >= request.cost;
            const onCooldown = !!requestCooldowns[request.id];
            const cooldownRemaining = onCooldown 
              ? Math.ceil((requestCooldowns[request.id] - Date.now()) / 1000)
              : 0;
            
            return (
              <motion.button
                key={request.id}
                whileTap={canUse && !onCooldown ? { scale: 0.9 } : {}}
                onClick={() => handleRequest(request)}
                disabled={!canUse || onCooldown}
                className={`
                  aspect-square rounded-xl flex flex-col items-center justify-center relative
                  transition-all min-h-[56px]
                  ${canUse && !onCooldown ? 'opacity-100' : 'opacity-40'}
                `}
                style={{
                  background: onCooldown 
                    ? 'rgba(100,100,100,0.3)' 
                    : canUse 
                      ? 'rgba(251,191,36,0.3)' 
                      : 'rgba(255,255,255,0.1)',
                  border: canUse && !onCooldown ? '2px solid rgba(251,191,36,0.5)' : 'none',
                }}
              >
                <span className="text-2xl">{request.emoji}</span>
                {onCooldown ? (
                  <span className="text-white/80 text-sm font-bold">{cooldownRemaining}s</span>
                ) : (
                  <span className="text-yellow-400/80 text-xs">{request.cost}</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-20 p-2 bg-black/50 backdrop-blur-md">
        {showMessageInput ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="メッセージを入力..."
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/40 focus:outline-none focus:border-purple-400"
              maxLength={50}
              autoFocus
            />
            <button
              onClick={() => {
                if (customMessage.trim()) {
                  useRoomStore.getState().broadcastMessage(customMessage.trim());
                  setCustomMessage('');
                }
                setShowMessageInput(false);
              }}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
            >
              送信
            </button>
            <button
              onClick={() => setShowMessageInput(false)}
              className="text-white/40 px-2"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <span className="text-lg">{selectedCall.emoji}</span>
              <span className="text-white/60 text-xs">{selectedCall.text}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMessageInput(true)}
                className="text-white/60 text-xs bg-white/10 px-3 py-1 rounded-full hover:bg-white/20"
              >
                ✉️ メッセージ
              </button>
              <div>
                <span className="text-white/40 text-xs">PT: </span>
                <span className={`font-bold ${canUseSelectedCall ? 'text-purple-400' : 'text-white/40'}`}>
                  {score.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
