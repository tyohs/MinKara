"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Piano,
  Guitar,
  Drum,
  Sparkles,
  Timer,
  Music,
  Mic,
  CheckCircle2,
  type LucideIcon,
  Swords,     // Hardアイコン
  Baby,       // Normalアイコン
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRoomStore, fetchParticipants } from "@/store/useRoomStore";
import { getSongById } from "@/data/songs";
import {
  useGameSession,
  startRoleSelect,
  startPlaying,
} from "@/hooks/useGameSession";
import { useSyncedCountdown } from "@/hooks/useSyncedCountdown";

type Role = "band" | "ojama";
type InstrumentType = "keyboard" | "guitar" | "drums";
type Difficulty = "easy" | "hard"; // 難易度の型定義

const ROLE_SELECT_DURATION = 10; // seconds

const SOUND_EFFECTS = {
  keyboard: "/soundEffect/roleSelect/roleSelect-keyboard.mp3",
  guitar: "/soundEffect/roleSelect/roleSelect-guitar.mp3",
  drums: "/soundEffect/roleSelect/roleSelect-drum.mp3",
  ojama: "/soundEffect/roleSelect/roleSelect-ojama.mp3",
} as const;

// 楽器データの型定義
type InstrumentData = {
  id: InstrumentType;
  name: string;
  Icon: LucideIcon;
  color: string;
  displayColor: string;
  shadow: string;
  border: string;
};

const INSTRUMENTS: InstrumentData[] = [
  {
    id: "keyboard",
    name: "キーボード",
    Icon: Piano,
    color: "from-amber-400 to-yellow-500",
    displayColor: "text-amber-400",
    shadow: "shadow-amber-500/50",
    border: "border-amber-500",
  },
  {
    id: "guitar",
    name: "ギター",
    Icon: Guitar,
    color: "from-orange-500 to-red-500",
    displayColor: "text-red-500",
    shadow: "shadow-red-500/50",
    border: "border-red-500",
  },
  {
    id: "drums",
    name: "ドラム",
    Icon: Drum,
    color: "from-emerald-500 to-green-600",
    displayColor: "text-emerald-500",
    shadow: "shadow-emerald-500/50",
    border: "border-emerald-500",
  },
];

export default function RoleSelectPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const { myUserId, participants, setParticipants } = useRoomStore();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedInstrument, setSelectedInstrument] =
    useState<InstrumentType | null>(null);

  // 難易度ステート (デフォルトは easy = Normal)
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  // 初期化判定用のRef
  const hasStartedRoleSelectRef = useRef(false);

  const [isReady, setIsReady] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback((soundKey: keyof typeof SOUND_EFFECTS) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const audio = new Audio(SOUND_EFFECTS[soundKey]);
    audio.volume = 1;
    audioRef.current = audio;
    audio.play().catch((error) => {
      console.warn("Sound playback failed:", error);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  const { session, refetch } = useGameSession(roomId);

  const { remaining: countdown, isComplete } = useSyncedCountdown(
    session?.role_select_started_at || null,
    ROLE_SELECT_DURATION,
  );

  const isSinger = session?.singer_id === myUserId;
  const song = session ? getSongById(session.song_id) : null;
  const singerParticipant = participants.find(
    (p) => p.user_id === session?.singer_id,
  );

  useEffect(() => {
    fetchParticipants(roomId).then(setParticipants);
  }, [roomId, setParticipants]);

  // ★修正2: useRef を使って判定するように変更
  useEffect(() => {
    if (
      session &&
      session.status === "countdown" &&
      !hasStartedRoleSelectRef.current
    ) {
      hasStartedRoleSelectRef.current = true;
      startRoleSelect(session.id).then(() => {
        refetch();
      });
    }
  }, [session, refetch]);

  useEffect(() => {
    if (isComplete && session && myUserId) {
      const performTransition = async () => {
        if (session.status === "role_select") {
          if (isSinger) {
            await startPlaying(session.id);
          }
        }

        if (isSinger) {
          router.push(`/room/${roomId}/singer`);
        } else if (selectedRole === "ojama") {
          router.push(`/room/${roomId}/obstruct`);
        } else if (selectedRole === "band") {
          const instrument = selectedInstrument || "keyboard";
          if (instrument === "keyboard") {
            router.push(`/room/${roomId}/keyboard`);
          } else {
            // URLパラメータに difficulty を追加して遷移
            router.push(
              `/room/${roomId}/band?instrument=${instrument}&difficulty=${difficulty}`
            );
          }
        } else {
          router.push(`/room/${roomId}/obstruct`);
        }
      };

      performTransition();
    }
  }, [
    isComplete,
    session,
    isSinger,
    selectedRole,
    selectedInstrument,
    difficulty,
    roomId,
    router,
    myUserId,
  ]);

  const handleStart = async () => {
    if (!myUserId || !session) return;

    const role = isSinger ? "singer" : selectedRole || "band";
    const instrument =
      selectedRole === "band" ? selectedInstrument || "keyboard" : null;

    await supabase
      .from("participants")
      .update({
        role: role,
        instrument: instrument,
      })
      .eq("room_id", roomId)
      .eq("user_id", myUserId);

    setIsReady(true);
  };

  const displayCountdown = Math.ceil(countdown);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#0a0a1a] text-white">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-950 via-purple-950 to-black opacity-90" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(76,29,149,0.3),transparent_70%)]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-5xl px-6 flex flex-col h-full justify-center items-center">
        {/* Header */}
        <div className="w-full flex justify-between items-start mb-8 sm:mb-12 max-w-4xl">
          <div className="text-left">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-2 mb-2 text-cyan-400"
            >
              <Music className="w-5 h-5 animate-pulse" />
              <span className="font-mono text-sm tracking-[0.2em] uppercase font-bold">
                Now Playing
              </span>
            </motion.div>
            <motion.h1
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-5xl md:text-6xl font-black italic tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"
            >
              {song?.title || "Loading..."}
            </motion.h1>
            <motion.p
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-gray-400 font-medium text-lg sm:text-xl mt-1 tracking-wider"
            >
              {song?.artist}
            </motion.p>
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <Timer className="w-12 h-12 sm:w-16 sm:h-16 text-cyan-400" />
              <div className="absolute inset-0 animate-ping opacity-30 bg-cyan-400 rounded-full" />
            </div>
            <span className="text-4xl sm:text-5xl font-mono font-bold text-white mt-2 tabular-nums drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
              {displayCountdown}
            </span>
          </motion.div>
        </div>

        {/* Singer Banner */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-4xl bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 flex items-center gap-4 sm:gap-6 mb-10 shadow-lg"
        >
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-linear-to-tr from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30 shrink-0">
            <Mic className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-wider mb-1 font-bold">
              Lead Vocal
            </p>
            <div className="flex items-center gap-3">
              <p className="text-xl sm:text-3xl font-bold text-white tracking-wide">
                {singerParticipant?.name || "Loading..."}
              </p>
              {isSinger && (
                <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded border border-pink-500/30 font-mono font-bold">
                  YOU
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Selection Area */}
        {!isSinger ? (
          <div className="w-full max-w-4xl">
            {!isReady ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 p-2">
                  <RoleCard
                    title="バンドメンバー"
                    subtitle="楽器を演奏して盛り上げる"
                    icon={Piano}
                    isSelected={selectedRole === "band"}
                    onClick={() => setSelectedRole("band")}
                    color="cyan"
                  />
                  <RoleCard
                    title="お邪魔"
                    subtitle="お邪魔アイテムで妨害！？"
                    icon={Sparkles}
                    isSelected={selectedRole === "ojama"}
                    onClick={() => {
                      setSelectedRole("ojama");
                      playSound("ojama");
                    }}
                    color="purple"
                  />
                </div>

                <AnimatePresence mode="wait">
                  {selectedRole === "band" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="w-full"
                    >
                      <p className="text-center text-gray-300 mb-4 text-sm font-bold mt-4 tracking-wider">
                        楽器を選んでください
                      </p>
                      <div className="grid grid-cols-3 gap-3 md:gap-6 p-4">
                        {INSTRUMENTS.map((inst, i) => (
                          <InstrumentCard
                            key={inst.id}
                            instrument={inst}
                            isSelected={selectedInstrument === inst.id}
                            onClick={() => {
                              setSelectedInstrument(inst.id);
                              playSound(inst.id);
                            }}
                            index={i}
                          />
                        ))}
                      </div>

                      {/* ドラム選択時のみ表示される難易度選択UI */}
                      {selectedInstrument === "drums" && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex justify-center gap-4 mt-6"
                        >
                          <button
                            onClick={() => setDifficulty("easy")}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl border transition-all ${
                              difficulty === "easy"
                                ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                            }`}
                          >
                            <Baby className="w-5 h-5" />
                            <div className="text-left">
                              <div className="font-bold text-sm">Normal</div>
                              <div className="text-[10px] opacity-70">
                                ずっと2分音符
                              </div>
                            </div>
                          </button>

                          <button
                            onClick={() => setDifficulty("hard")}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl border transition-all ${
                              difficulty === "hard"
                                ? "bg-red-500/20 border-red-400 text-red-400 shadow-[0_0_15px_rgba(248,113,113,0.3)]"
                                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                            }`}
                          >
                            <Swords className="w-5 h-5" />
                            <div className="text-left">
                              <div className="font-bold text-sm">Hard</div>
                              <div className="text-[10px] opacity-70">
                                ランダム譜面
                              </div>
                            </div>
                          </button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="h-10 md:h-16 w-full" />

                <motion.button
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 0 30px rgba(255,255,255,0.4)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStart}
                  disabled={
                    !selectedRole ||
                    (selectedRole === "band" && !selectedInstrument)
                  }
                  className="w-full py-4 sm:py-5 bg-white text-black font-black text-xl sm:text-2xl rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-30 disabled:shadow-none transition-all tracking-widest"
                >
                  準備完了！
                </motion.button>
              </motion.div>
            ) : (
              // 準備完了画面
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center py-10 sm:py-20 bg-black/20 backdrop-blur-sm rounded-3xl border border-green-500/30"
              >
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(34,197,94,0.6)] animate-pulse">
                  <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black italic text-white mb-2 tracking-wider">
                  準備完了！
                </h2>
                <p className="text-gray-400 text-lg font-mono">
                  他のメンバーを待っています...
                </p>
              </motion.div>
            )}
          </div>
        ) : (
          // ボーカル画面
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 sm:py-20 w-full max-w-2xl bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm shadow-[0_0_50px_rgba(236,72,153,0.1)]"
          >
            <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-linear-to-r from-pink-400 to-purple-400 mb-6 text-center italic tracking-tighter">
              STAGE IS YOURS
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-md text-center leading-relaxed px-4 font-medium">
              あなたはボーカルです。
              <br />
              最高のパフォーマンスを披露してください！
            </p>
            <div className="relative">
              <div className="absolute inset-0 bg-pink-500/30 blur-3xl rounded-full animate-pulse" />
              <Mic className="relative w-20 h-20 sm:w-24 sm:h-24 text-pink-400" />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// サブコンポーネント
interface RoleCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  isSelected: boolean;
  onClick: () => void;
  color: "cyan" | "purple";
}

function RoleCard({
  title,
  subtitle,
  icon: Icon,
  isSelected,
  onClick,
  color,
}: RoleCardProps) {
  const isCyan = color === "cyan";
  const activeBorder = isCyan ? "border-cyan-400" : "border-purple-500";
  const activeBg = isCyan ? "bg-cyan-950/60" : "bg-purple-950/60";
  const activeShadow = isCyan
    ? "shadow-[0_0_30px_rgba(34,211,238,0.2)]"
    : "shadow-[0_0_30px_rgba(168,85,247,0.2)]";
  const activeIconBg = isCyan ? "bg-cyan-500" : "bg-purple-500";

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-6 sm:p-8 rounded-xl text-left transition-all border w-full group ${
        isSelected
          ? `${activeBg} ${activeBorder} ${activeShadow} z-10`
          : "bg-black/40 border-white/10 hover:bg-white/10 hover:border-white/20"
      }`}
    >
      <div
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-4 transition-colors ${
          isSelected
            ? `${activeIconBg} text-white`
            : "bg-white/10 text-gray-400 group-hover:bg-white/20 group-hover:text-white"
        }`}
      >
        <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
      </div>
      <h3
        className={`text-lg sm:text-2xl font-bold mb-1 tracking-wide ${isSelected ? "text-white" : "text-gray-200 group-hover:text-white"}`}
      >
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-gray-400 group-hover:text-gray-300">
        {subtitle}
      </p>

      {isSelected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`absolute inset-0 border-2 rounded-xl pointer-events-none ${
            isCyan ? "border-cyan-400" : "border-purple-500"
          }`}
        />
      )}
    </motion.button>
  );
}

interface InstrumentCardProps {
  instrument: InstrumentData;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

function InstrumentCard({
  instrument,
  isSelected,
  onClick,
  index,
}: InstrumentCardProps) {
  return (
    <motion.button
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative group flex flex-col items-center p-4 sm:p-6 rounded-xl border transition-all ${
        isSelected
          ? `bg-linear-to-br ${instrument.color} border-white/50 shadow-lg ${instrument.shadow} scale-105 z-10`
          : "bg-black/40 border-white/10 hover:bg-white/10 hover:border-white/20"
      }`}
    >
      <instrument.Icon
        className={`w-10 h-10 sm:w-12 sm:h-12 mb-3 transition-colors ${
          isSelected ? "text-white" : "text-gray-400 group-hover:text-white"
        }`}
      />
      <span
        className={`text-xs sm:text-sm font-bold tracking-wider ${
          isSelected ? "text-white" : "text-gray-400 group-hover:text-white"
        }`}
      >
        {instrument.name}
      </span>
      {isSelected && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-white/50 pointer-events-none" />
      )}
    </motion.button>
  );
}