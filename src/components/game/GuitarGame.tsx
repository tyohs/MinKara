"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Noto_Sans_JP } from "next/font/google";
import { motion } from "framer-motion";
import ScoreDisplay from "./ScoreDisplay";
import JudgmentDisplay from "./JudgmentDisplay";
import { NoteData } from "./Note";
import {
  TIMING_WINDOWS,
  SCORE_VALUES,
  VIBRATION_DURATION,
  JUDGMENT_DISPLAY_DURATION,
  JudgmentType,
  LANE_COUNT,
  NOTE_CONFIG,
} from "@/lib/gameConfig";
import { useScreenLock } from "@/hooks/useScreenLock";
import { useFanService } from "@/hooks/useFanService";
import { FanServiceRequest, FAN_SERVICE_CONFIG } from "@/types/fanService";
import { supabase } from "@/lib/supabase";
import FanServiceDisplay from "./FanServiceDisplay";
import fanServiceStyles from "./FanService.module.css"; // スタイルを追加

// フォント設定
const notoSansJP = Noto_Sans_JP({ weight: ["700"], subsets: ["latin"] });

// 6弦用のカラー定義
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

// お邪魔IDの定義
const OBSTRUCT_IDS = {
  BLIND: 1, // 歌詞隠し -> レーン隠し
  SHAKE: 2, // 別の音 -> 画面揺れ
  FAKE: 3, // ノーツ追加 -> ニセノーツ
  STEALTH: 4, // ノーツ隠し -> ステルス
  CONFETTI: 5, // 紙吹雪
} as const;

// お邪魔の効果時間 (ms)
const OBSTRUCT_DURATION = 5000;

interface GuitarGameProps {
  notes: NoteData[];
  songStartedAt: string | null;
  songDuration?: number;
  roomId?: string;
  userId?: string;
  bpm?: number;
  onGameEnd?: (score: number, maxCombo: number) => void;
}

// ニセノーツ用型定義
interface FakeNote extends NoteData {
  isFake: true;
}

// 紙吹雪の初期データ生成
const CONFETTI_PARTICLES = Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  x: Math.random() * 100, // 0-100vw
  duration: 2 + Math.random() * 2,
  color: ["#ff0000", "#00ff00", "#0000ff", "#ffff00"][
    Math.floor(Math.random() * 4)
  ],
}));

export default function GuitarGame({
  notes: initialNotes,
  songStartedAt,
  songDuration,
  roomId = "",
  userId = "",
  bpm = 120,
  onGameEnd,
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
  
  // currentTimeをRefで保持
  const currentTimeRef = useRef(0);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

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

  // --- ファンサ要求管理用のState ---
  const [fanServiceRequest, setFanServiceRequest] = useState<FanServiceRequest | null>(null);

  // --- お邪魔機能ロジック ---
  const [activeObstructs, setActiveObstructs] = useState<Set<number>>(
    new Set(),
  );
  const [fakeNotes, setFakeNotes] = useState<FakeNote[]>([]);

  const triggerObstruct = useCallback((id: number) => {
    console.log("[GuitarGame] Triggering obstruct ID:", id);
    setActiveObstructs((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    // 一定時間後に解除
    setTimeout(() => {
      setActiveObstructs((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, OBSTRUCT_DURATION);
  }, []);

  // イベント受信 (お邪魔 & ファンサ)
  useEffect(() => {
    if (!activeRoomId) return;

    console.log("[GuitarGame] Subscribing to room:", activeRoomId);

    const channel = supabase.channel(`room:${activeRoomId}`);
    channel
      // ファンサ要求の受信
      .on('broadcast', { event: 'fan_service' }, (payload) => {
        console.log('[GuitarGame] Received fan_service event:', payload);
        const request = payload.payload as FanServiceRequest;
        setFanServiceRequest(request);
      })
      // お邪魔イベントの受信
      .on("broadcast", { event: "obstruct" }, (payload) => {
        const data = payload.payload as { id: number; target?: string };
        console.log("[GuitarGame] Received obstruct event:", data);
        const { id, target } = data;

        // ターゲット判定: "singer"宛ての攻撃は無視する
        if (target === "singer") return;

        triggerObstruct(id);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[GuitarGame] Ready to receive events");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoomId, triggerObstruct]);

  // ファンサ表示完了コールバック
  const handleFanServiceDismiss = useCallback(() => {
    setFanServiceRequest(null);
  }, []);

  // ニセノーツ生成ロジック (ID 3)
  useEffect(() => {
    if (!activeObstructs.has(OBSTRUCT_IDS.FAKE)) {
      setFakeNotes([]);
      return;
    }

    const interval = setInterval(() => {
      const newFakeNote: FakeNote = {
        id: `fake-${Date.now()}-${Math.random()}`,
        lane: Math.floor(Math.random() * LANE_COUNT),
        time: currentTimeRef.current + 2000,
        hit: false,
        isFake: true,
        type: "normal",
      };
      setFakeNotes((prev) => [...prev, newFakeNote]);
    }, 200);

    return () => clearInterval(interval);
  }, [activeObstructs]);

  // 古いニセノーツの掃除
  useEffect(() => {
    if (fakeNotes.length > 0) {
      setFakeNotes((prev) => prev.filter((n) => n.time > currentTime - 200));
    }
  }, [currentTime, fakeNotes.length]);

  // --- ファンサ送信機能 ---
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
  const trackWidth = totalLanes * laneWidth + (totalLanes - 1) * laneGap;

  // startTimestampをメモ化
  const startTimestamp = useMemo(() => 
    songStartedAt ? new Date(songStartedAt).getTime() : null, 
    [songStartedAt]
  );

  // ゲームループ
  useEffect(() => {
    if (startTimestamp === null) return;
    
    let animationFrameId: number;

    const loop = () => {
      const now = Date.now();
      const elapsed = now - startTimestamp;
      setCurrentTime(elapsed);
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [startTimestamp]);

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

  // デザイン部分
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
        <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
      </div>

      {/* ファンサ表示（全画面オーバーレイ） */}
      {fanServiceRequest && (
        <FanServiceDisplay 
          request={fanServiceRequest} 
          onDismiss={handleFanServiceDismiss} 
        />
      )}

      {/* お邪魔エフェクト：紙吹雪 (ID 5) */}
      {activeObstructs.has(OBSTRUCT_IDS.CONFETTI) && (
        <div className="absolute inset-0 z-60 pointer-events-none overflow-hidden">
          {CONFETTI_PARTICLES.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-4 h-4 bg-white rounded-full opacity-70"
              initial={{
                x: `${particle.x}vw`,
                y: -20,
                rotate: 0,
              }}
              animate={{
                y: "110vh",
                rotate: 360,
                x: `${(particle.x + 20) % 100}vw`,
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                backgroundColor: particle.color,
              }}
            />
          ))}
        </div>
      )}

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
        <div className={fanServiceStyles.fanServiceSent}>
          {fanServiceSent}
        </div>
      )}

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

      {/* メインゲームエリア (ギター指板) */}
      <motion.div
        className="relative w-full h-full flex justify-center"
        // お邪魔エフェクト：揺れ (ID 2)
        animate={
          activeObstructs.has(OBSTRUCT_IDS.SHAKE)
            ? {
                x: [0, -5, 5, -5, 5, 0],
                transition: { repeat: Infinity, duration: 0.2 },
              }
            : {}
        }
      >
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

          {/* 6本の弦の描画位置 */}
          <div className="absolute inset-0 flex justify-center pointer-events-none">
            {Array.from({ length: totalLanes }).map((_, lane) => (
              <div
                key={`string-${lane}`}
                className="absolute h-full bg-[#666] shadow-[0_0_2px_black]"
                style={{
                  width: "2px",
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
            className="absolute w-full h-1.5 bg-gray-400 border-y border-gray-500 shadow-md z-10"
            style={{
              top:
                typeof window !== "undefined" ? window.innerHeight - 110 : 490,
            }}
          />

          {/* ノーツ描画 (通常ノーツ + ニセノーツ) */}
          {[...notes.filter((n) => !n.hit), ...fakeNotes].map((note) => {
            const isFake = (note as FakeNote).isFake;

            const y = getNoteY(note.time);
            const screenHeight =
              typeof window !== "undefined" ? window.innerHeight : 600;
            if (y < -50 || y > screenHeight + 50) return null;
            const color = STRING_COLORS[note.lane % STRING_COLORS.length];

            // お邪魔エフェクト：ステルス (ID 4)
            const isStealth =
              activeObstructs.has(OBSTRUCT_IDS.STEALTH) &&
              y > screenHeight * 0.5;

            return (
              <motion.div
                key={note.id}
                initial={false}
                animate={{ opacity: isStealth ? 0 : isFake ? 0.7 : 1 }}
                className={`absolute rounded-full ${color.bg} ${color.shadow} shadow-lg border-2 border-white/60 z-20 flex items-center justify-center`}
                style={{
                  left: "50%",
                  marginLeft:
                    note.lane * (laneWidth + laneGap) - trackWidth / 2,
                  top: y,
                  width: laneWidth,
                  height: laneWidth,
                  transform: "translateY(-50%)",
                  borderStyle: isFake ? "dashed" : "solid",
                }}
              >
                <div className="w-3 h-3 bg-[#222] rounded-full shadow-inner" />
                <div className="absolute top-1 left-2 w-3 h-2 bg-white/50 rounded-full blur-[1px]" />
                {isFake && (
                  <div
                    className="absolute text-2xl select-none"
                    style={{
                      filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))",
                    }}
                  >
                    👿
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* お邪魔エフェクト：ブラインド (ID 1) */}
          {activeObstructs.has(OBSTRUCT_IDS.BLIND) && (
            <div className="absolute top-0 left-0 w-full h-[60%] bg-linear-to-b from-black via-black/90 to-transparent z-30 flex items-center justify-center">
              <span className="text-red-500 font-bold text-2xl tracking-widest animate-pulse">
                BLIND
              </span>
            </div>
          )}
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
                    <div
                      className={`w-3/4 h-3/4 rounded-full ${color.bg} opacity-50 shadow-inner ${isActive ? "brightness-150 opacity-100" : ""}`}
                    />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-[#444] pointer-events-none" />
                  </div>
                  {isActive && (
                    <div
                      className={`absolute bottom-20 w-full h-150 bg-linear-to-t from-${color.bg.replace("bg-", "")}/30 to-transparent pointer-events-none`}
                    />
                  )}
                  <div
                    className="absolute -bottom-5 -left-2.5 -right-2.5 -top-25 z-50"
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
      </motion.div>
    </div>
  );
}
