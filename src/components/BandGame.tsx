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

interface NoteState extends NoteData {
  id: number;
  hit: boolean;
  judgment?: Judgment;
}

// コール定義 - スコア消費型
interface CallItem {
  id: string;
  text: string;
  emoji: string;
  cost: number;  // 消費スコア
}

const CALLS: CallItem[] = [
  { id: 'yeah', text: 'イェーイ！', emoji: '🎉', cost: 300 },
  { id: 'fuu', text: 'フゥー！', emoji: '🔥', cost: 500 },
  { id: 'saikou', text: 'サイコー！', emoji: '⭐', cost: 800 },
  { id: 'encore', text: 'アンコール！', emoji: '👏', cost: 1000 },
];

interface BandGameProps {
  chart: InstrumentChart;
  instrument: InstrumentType;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onScoreUpdate: (score: number, combo: number) => void;
  onGameEnd?: () => void;
}

export default function BandGame({ 
  chart, 
  instrument, 
  audioRef,
  onScoreUpdate,
  onGameEnd 
}: BandGameProps) {
  const [notes, setNotes] = useState<NoteState[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0); // 累計スコア（結果表示用）
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lastJudgment, setLastJudgment] = useState<Judgment | null>(null);
  const [showMissEffect, setShowMissEffect] = useState(false);
  const [activeCall, setActiveCall] = useState<CallItem | null>(null);
  const [hitEffect, setHitEffect] = useState<{x: number, y: number} | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const laneRef = useRef<HTMLDivElement>(null);
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
  }, [audioRef, onGameEnd]);

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

  // ノートをタップ（レーン全体で反応）
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
    } else if (diff <= JUDGMENT_WINDOWS.great) {
      judgment = 'great';
    } else {
      judgment = 'good';
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
    
    // ヒットエフェクト
    if (e && laneRef.current) {
      const rect = laneRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setHitEffect({
        x: ((clientX - rect.left) / rect.width) * 100,
        y: ((clientY - rect.top) / rect.height) * 100,
      });
    }
    
    setTimeout(() => {
      setLastJudgment(null);
      setHitEffect(null);
    }, 300);
  }, [notes, currentTime, combo]);

  // コールを使用（スコア消費型）
  const handleCall = useCallback((call: CallItem) => {
    if (score < call.cost) return;
    
    setActiveCall(call);
    setScore(prev => Math.max(0, prev - call.cost));
    
    setTimeout(() => setActiveCall(null), 1200);
  }, [score]);

  const APPROACH_TIME = 2000;

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/50 via-gray-900 to-gray-900" />
      
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

      {/* Active Call Display */}
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
                animate={{ rotate: [0, -10, 10, 0] }}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top UI Bar */}
      <div className="relative z-20 p-3 flex items-center justify-between">
        {/* Score */}
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

        {/* Instrument */}
        <div 
          className="px-4 py-2 rounded-full flex items-center gap-2"
          style={{ backgroundColor: `${info.color}30` }}
        >
          <span className="text-xl">{info.emoji}</span>
          <span className="text-white text-sm font-medium">{info.label}</span>
        </div>

        {/* Combo */}
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

      {/* Main Lane Area - タップ可能 */}
      <div 
        ref={laneRef}
        className="flex-1 relative cursor-pointer select-none"
        onClick={handleTap}
        onTouchStart={handleTap}
        style={{
          perspective: '800px',
          perspectiveOrigin: '50% 0%',
        }}
      >
        {/* Lane background with perspective */}
        <div 
          className="absolute inset-x-0 top-0 bottom-0 mx-auto"
          style={{
            width: '80%',
            background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.1) 0%, rgba(59, 130, 246, 0.2) 100%)',
            transform: 'rotateX(60deg)',
            transformOrigin: 'center bottom',
            borderLeft: '2px solid rgba(255,255,255,0.1)',
            borderRight: '2px solid rgba(255,255,255,0.1)',
          }}
        />

        {/* Hit effect */}
        <AnimatePresence>
          {hitEffect && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 3, opacity: 0 }}
              exit={{ opacity: 0 }}
              className="absolute w-20 h-20 rounded-full pointer-events-none"
              style={{
                left: `${hitEffect.x}%`,
                top: `${hitEffect.y}%`,
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, ${info.color} 0%, transparent 70%)`,
              }}
            />
          )}
        </AnimatePresence>

        {/* Notes */}
        {notes.map(note => {
          if (note.hit) return null;
          
          const timeUntilHit = note.time - currentTime;
          if (timeUntilHit > APPROACH_TIME || timeUntilHit < -200) return null;

          const progress = 1 - (timeUntilHit / APPROACH_TIME);
          // 奥から手前への動き
          const y = 10 + progress * 75; // 10% -> 85%
          const scale = 0.3 + progress * 0.7; // 遠くは小さく
          const size = (note.type === 'special' ? 70 : 55) * scale;

          return (
            <motion.div
              key={note.id}
              className="absolute left-1/2 rounded-lg flex items-center justify-center"
              style={{
                top: `${y}%`,
                width: size,
                height: size * 0.4,
                transform: 'translateX(-50%)',
                background: note.type === 'special' 
                  ? 'linear-gradient(90deg, #a855f7, #ec4899, #f97316)'
                  : `linear-gradient(90deg, ${info.color}, ${info.color}CC)`,
                boxShadow: `0 0 ${20 * scale}px ${info.color}80`,
                opacity: 0.3 + progress * 0.7,
              }}
            >
              {note.type === 'special' && (
                <span className="text-white text-sm">★</span>
              )}
            </motion.div>
          );
        })}

        {/* Judgment Line */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
          style={{
            top: '85%',
            width: '85%',
            height: '40px',
            background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent)',
            borderTop: '3px solid rgba(168, 85, 247, 0.8)',
            boxShadow: '0 0 30px rgba(168, 85, 247, 0.5)',
          }}
        >
          <AnimatePresence>
            {lastJudgment && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.5 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30 }}
                className="absolute -top-12 font-bold text-2xl"
                style={{
                  color: lastJudgment === 'perfect' ? '#fbbf24' :
                         lastJudgment === 'great' ? '#a855f7' : '#22c55e',
                  textShadow: '0 0 20px currentColor',
                }}
              >
                {lastJudgment.toUpperCase()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tap hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-sm">
          画面をタップ
        </div>
      </div>

      {/* Call Buttons - 画面下部に横並び */}
      <div className="relative z-20 p-3 bg-black/50 backdrop-blur-md">
        <div className="flex gap-2 justify-center">
          {CALLS.map(call => {
            const canUse = score >= call.cost;
            
            return (
              <motion.button
                key={call.id}
                whileTap={canUse ? { scale: 0.95 } : {}}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCall(call);
                }}
                disabled={!canUse}
                className={`
                  px-4 py-3 rounded-xl flex flex-col items-center gap-1 min-w-[70px]
                  transition-all
                  ${canUse 
                    ? 'bg-purple-600/80 border border-purple-400/50' 
                    : 'bg-white/5 border border-white/10 opacity-50'
                  }
                `}
              >
                <span className="text-xl">{call.emoji}</span>
                <span className="text-white text-xs font-medium">{call.cost}</span>
              </motion.button>
            );
          })}
        </div>
        
        {/* Usable score indicator */}
        <div className="text-center mt-2">
          <span className="text-white/40 text-xs">使用可能: </span>
          <span className="text-purple-400 text-sm font-bold">{score.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
