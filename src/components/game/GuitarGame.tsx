"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Flame } from "lucide-react";
import { Zen_Dots, Noto_Sans_JP } from "next/font/google";
import ScoreDisplay from "./ScoreDisplay";
import JudgmentDisplay from "./JudgmentDisplay";
import { NoteData } from "./Note";
import {
  TIMING_WINDOWS,
  SCORE_VALUES,
  VIBRATION_DURATION,
  JUDGMENT_DISPLAY_DURATION,
  GAME_LOOP,
  JudgmentType,
  LANE_COUNT,
  NOTE_CONFIG,
} from "@/lib/gameConfig";
import { useScreenLock } from "@/hooks/useScreenLock";
import { useFanService } from "@/hooks/useFanService";
import { FanServiceRequest, FAN_SERVICE_CONFIG } from "@/types/fanService";
import { supabase } from "@/lib/supabase";

// フォント設定
const zenDots = Zen_Dots({ weight: "400", subsets: ["latin"] });
const notoSansJP = Noto_Sans_JP({ weight: ["700"], subsets: ["latin"] });

// 6弦用のカラー定義 (Rock Band / Guitar Hero 風)
const STRING_COLORS = [
  {
    bg: "bg-green-500",
    border: "border-green-500",
    shadow: "shadow-green-500",
    text: "text-green-500",
  },
  {
    bg: "bg-red-500",
    border: "border-red-500",
    shadow: "shadow-red-500",
    text: "text-red-500",
  },
  {
    bg: "bg-yellow-400",
    border: "border-yellow-400",
    shadow: "shadow-yellow-400",
    text: "text-yellow-400",
  },
  {
    bg: "bg-blue-500",
    border: "border-blue-500",
    shadow: "shadow-blue-500",
    text: "text-blue-500",
  },
  {
    bg: "bg-orange-500",
    border: "border-orange-500",
    shadow: "shadow-orange-500",
    text: "text-orange-500",
  },
  {
    bg: "bg-purple-500",
    border: "border-purple-500",
    shadow: "shadow-purple-500",
    text: "text-purple-500",
  },
];

interface GuitarGameProps {
  notes: NoteData[];
  songStartedAt: string | null;
  songDuration?: number;
  roomId?: string;
  userId?: string;
  bpm?: number;
  onGameEnd?: (score: number, maxCombo: number) => void;
}

export default function GuitarGame({
  notes: initialNotes,
  songStartedAt,
  songDuration,
  roomId = "",
  userId = "",
  bpm = 120,
  onGameEnd,
}: GuitarGameProps) {
  // ===============================================
  // ロジック部分は変更なし
  // ===============================================
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

  useScreenLock("portrait");

  // URLからroomIdを補完
  const [urlRoomId, setUrlRoomId] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined" && !roomId) {
      const match = window.location.pathname.match(/\/room\/([^\/]+)/);
      if (match && match[1]) {
        setUrlRoomId(match[1]);
      }
    }
  }, [roomId]);

  const activeRoomId = roomId || urlRoomId;

  const [fanServiceSent, setFanServiceSent] = useState<string | null>(null);

  const handleFanServiceSend = useCallback(
    async (request: FanServiceRequest) => {
      if (!activeRoomId) return;

      try {
        const channel = supabase.channel(`room:${activeRoomId}`);
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("Subscription timeout")),
            5000,
          );
          channel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              clearTimeout(timeout);
              resolve();
            }
          });
        });

        await channel.send({
          type: "broadcast",
          event: "fan_service",
          payload: request,
        });

        supabase.removeChannel(channel);

        const config = FAN_SERVICE_CONFIG[request.type];
        setFanServiceSent(`${config.icon} ${config.label}`);
        setTimeout(() => setFanServiceSent(null), 1500);
      } catch (error) {
        console.error("[GuitarGame] Failed to send fan service:", error);
      }
    },
    [activeRoomId],
  );

  const {
    canSend: canSendFanService,
    cooldownSeconds,
    handleTouchStart: fanServiceTouchStart,
    handleTouchEnd: fanServiceTouchEnd,
  } = useFanService({
    userId,
    role: "guitar",
    onSend: handleFanServiceSend,
    enabled: true,
    initialCooldown: 0,
  });

  const visibleDuration = useMemo(() => {
    const msPerBeat = 60000 / bpm;
    return msPerBeat * NOTE_CONFIG.beatsVisible * 0.6;
  }, [bpm]);

  // レーン設定
  const laneWidth = 46;
  const laneGap = 8;
  const totalLanes = LANE_COUNT;

  // トラック全体の幅
  const trackWidth = totalLanes * laneWidth + (totalLanes - 1) * laneGap;

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
    setJudgmentId((prev) => prev + 1);
    judgmentTimeoutRef.current = setTimeout(() => {
      setLastJudgment(null);
    }, JUDGMENT_DISPLAY_DURATION);
  }, []);

  const handleKeyPress = useCallback(
    (lane: number) => {
      const targetNote = notes.find(
        (note) =>
          note.lane === lane &&
          !note.hit &&
          Math.abs(note.time - currentTime) <= TIMING_WINDOWS.good,
      );

      if (!targetNote) return;

      const timeDiff = Math.abs(targetNote.time - currentTime);
      let judgment: JudgmentType;

      if (timeDiff <= TIMING_WINDOWS.perfect) {
        judgment = "perfect";
      } else if (timeDiff <= TIMING_WINDOWS.great) {
        judgment = "great";
      } else {
        judgment = "good";
      }

      setNotes((prev) =>
        prev.map((note) =>
          note.id === targetNote.id ? { ...note, hit: true } : note,
        ),
      );

      const baseScore = SCORE_VALUES[judgment];
      const comboBonus = 1 + combo / 100;
      const finalScore = Math.floor(baseScore * comboBonus);

      setScore((prev) => prev + finalScore);
      setCombo((prev) => {
        const newCombo = prev + 1;
        setMaxCombo((current) => Math.max(current, newCombo));
        return newCombo;
      });
      showJudgment(judgment);

      if (navigator.vibrate) {
        navigator.vibrate(VIBRATION_DURATION[judgment]);
      }
    },
    [notes, currentTime, combo, showJudgment],
  );

  useEffect(() => {
    return () => {
      if (judgmentTimeoutRef.current) {
        clearTimeout(judgmentTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const missedNotes = notes.filter(
      (note) => !note.hit && note.time < currentTime - TIMING_WINDOWS.good - 50,
    );

    if (missedNotes.length > 0) {
      setNotes((prev) =>
        prev.map((note) =>
          missedNotes.some((m) => m.id === note.id)
            ? { ...note, hit: true }
            : note,
        ),
      );

      setCombo(0);
      showJudgment("miss");

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

  const getNoteY = (noteTime: number) => {
    const timeDiff = noteTime - currentTime;
    const progress = timeDiff / visibleDuration;
    const screenHeight =
      typeof window !== "undefined" ? window.innerHeight : 600;
    const judgmentLineY = screenHeight - 110;
    return judgmentLineY - progress * judgmentLineY;
  };

  // ===============================================
  // デザイン部分
  // ===============================================
  return (
    <div
      className={`fixed inset-0 bg-[#0a0a0a] overflow-hidden select-none touch-none ${notoSansJP.className}`}
      onTouchStart={fanServiceTouchStart}
      onTouchEnd={fanServiceTouchEnd}
    >
      {/* 背景動画 */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <video
          className="w-full h-full object-cover blur-[2px]"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        >
          <source
            src="/videos/Musical_Instruments_in_Space_Video.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
      </div>

      {/* 判定エフェクト表示 (オーバーレイ) */}
      <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
        <JudgmentDisplay
          judgment={lastJudgment}
          combo={combo}
          judgmentId={judgmentId}
        />
      </div>

      {/* スコア表示エリア */}
      <div className="absolute top-4 left-4 z-40">
        <ScoreDisplay score={score} combo={combo} />
      </div>

      {/* ファンサ送信フィードバック */}
      {fanServiceSent && (
        <div className="absolute top-20 right-4 z-50 bg-pink-500/90 text-white px-4 py-2 rounded-full font-bold shadow-lg animate-bounce">
          {fanServiceSent}
        </div>
      )}

      {/* ファンサ要求UI */}
      {canSendFanService ? (
        <div className="absolute bottom-32 right-4 z-50 flex flex-col items-center gap-2 pointer-events-none opacity-80">
          <div className="bg-white/10 backdrop-blur text-white text-[10px] px-2 py-1 rounded border border-white/20">
            Fansa!
          </div>
          <div className="text-2xl animate-pulse">🎤</div>
        </div>
      ) : (
        <div className="absolute bottom-32 right-4 z-50 bg-gray-800/80 text-gray-400 text-xs px-3 py-1 rounded-full border border-gray-700">
          CT {cooldownSeconds}s
        </div>
      )}

      {/* メインゲームエリア (ギター指板) */}
      <div className="relative w-full h-full flex justify-center">
        {/* 指板 (トラック背景) */}
        <div
          className="relative h-full bg-[#1e1e1e] border-x-4 border-[#333] shadow-2xl"
          style={{ width: trackWidth + 20 }}
        >
          {/* フレット (背景の横線) */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to bottom, #aaa 1px, transparent 1px)",
              backgroundSize: "100% 120px",
            }}
          />

          {/* ★修正: 6本の弦の描画位置修正 */}
          <div className="absolute inset-0 flex justify-center pointer-events-none">
            {Array.from({ length: totalLanes }).map((_, lane) => (
              <div
                key={`string-${lane}`}
                className="absolute h-full bg-[#666] shadow-[0_0_2px_black]"
                style={{
                  width: "2px", // 弦の太さ
                  // 画面中央基準(50%)にしてから、オフセットを調整することで正確に配置
                  left: "50%",
                  marginLeft:
                    lane * (laneWidth + laneGap) -
                    trackWidth / 2 +
                    laneWidth / 2 -
                    1,
                }}
              />
            ))}
          </div>

          {/* 判定ライン (ナット/フレットバー) */}
          <div
            className="absolute w-full h-[6px] bg-gray-400 border-y border-gray-500 shadow-md z-10"
            style={{
              top:
                typeof window !== "undefined" ? window.innerHeight - 110 : 490,
            }}
          />

          {/* 降ってくるノーツ (丸型に変更) */}
          {notes
            .filter((n) => !n.hit)
            .map((note) => {
              const y = getNoteY(note.time);
              const screenHeight =
                typeof window !== "undefined" ? window.innerHeight : 600;

              if (y < -50 || y > screenHeight + 50) return null;

              const color = STRING_COLORS[note.lane % STRING_COLORS.length];

              return (
                <div
                  key={note.id}
                  className={`absolute rounded-full ${color.bg} ${color.shadow} shadow-lg border-2 border-white/60 z-20 flex items-center justify-center`}
                  style={{
                    left: "50%",
                    marginLeft:
                      note.lane * (laneWidth + laneGap) - trackWidth / 2,
                    top: y,
                    width: laneWidth,
                    height: laneWidth,
                    transform: "translateY(-50%)",
                  }}
                >
                  {/* 弦を通す穴 */}
                  <div className="w-3 h-3 bg-[#222] rounded-full shadow-inner" />
                  {/* 立体感を出すハイライト */}
                  <div className="absolute top-1 left-2 w-3 h-2 bg-white/50 rounded-full blur-[1px]" />
                </div>
              );
            })}
        </div>

        {/* 操作ボタンエリア (指板の下部) */}
        <div className="absolute bottom-6 left-0 w-full flex justify-center pointer-events-none z-30">
          <div
            className="relative flex justify-center"
            style={{ width: trackWidth, gap: laneGap }}
          >
            {Array.from({ length: totalLanes }).map((_, index) => {
              const color = STRING_COLORS[index % STRING_COLORS.length];
              const isActive = activeKeys.has(index);

              return (
                <div
                  key={`btn-${index}`}
                  className="relative flex flex-col items-center pointer-events-auto"
                  style={{ width: laneWidth }}
                >
                  {/* 物理ボタン風デザイン */}
                  <div
                    className={`
                      w-full h-20 rounded-b-xl rounded-t-md border-b-4 transition-all duration-75
                      flex items-center justify-center relative overflow-hidden
                      ${
                        isActive
                          ? `bg-gray-800 border-gray-600 translate-y-1 shadow-inner`
                          : `bg-[#2a2a2a] border-black shadow-lg`
                      }
                    `}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setActiveKeys((prev) => new Set(prev).add(index));
                      handleKeyPress(index);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setActiveKeys((prev) => {
                        const next = new Set(prev);
                        next.delete(index);
                        return next;
                      });
                    }}
                    onTouchCancel={() => {
                      setActiveKeys((prev) => {
                        const next = new Set(prev);
                        next.delete(index);
                        return next;
                      });
                    }}
                  >
                    {/* ボタンのカラーインジケーター */}
                    <div
                      className={`w-3/4 h-3/4 rounded-full ${color.bg} opacity-50 shadow-inner ${isActive ? "brightness-150 opacity-100" : ""}`}
                    />

                    {/* 弦の延長線 */}
                    <div className="absolute top-0 bottom-0 w-[2px] bg-[#444] pointer-events-none" />
                  </div>

                  {/* ヒット時のレーザーエフェクト */}
                  {isActive && (
                    <div
                      className={`absolute bottom-[80px] w-full h-[600px] bg-gradient-to-t from-${color.bg.replace("bg-", "")}/30 to-transparent pointer-events-none`}
                    />
                  )}

                  {/* タッチ判定拡張エリア (透明) */}
                  <div
                    className="absolute bottom-[-20px] left-[-10px] right-[-10px] top-[-100px] z-50"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setActiveKeys((prev) => new Set(prev).add(index));
                      handleKeyPress(index);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setActiveKeys((prev) => {
                        const next = new Set(prev);
                        next.delete(index);
                        return next;
                      });
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
