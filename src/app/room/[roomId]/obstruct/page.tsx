"use client";

import { useReducer, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Ghost, 
  EyeOff, 
  PartyPopper, 
  Zap, 
  Target,
  Home 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

// --- 型定義 ---
type ActionItem = {
  id: number;
  name: string;
  description: string;
  icon: React.ElementType;
  maxCoolDown: number;
  remaining: number;
  color: string;
};

type State = {
  points: number;
  actions: ActionItem[];
};

type Action = 
  | { type: "TICK" } 
  | { type: "TRIGGER"; id: number };

// --- 設定値 ---
const MAX_POINTS = 10;
const ACTION_COST = 4;

const initialList: ActionItem[] = [
  { 
    id: 1, 
    name: "歌詞隠し", 
    description: "シンガーの歌詞をブラックアウト",
    icon: EyeOff, 
    maxCoolDown: 10,
    remaining: 0,
    color: "from-purple-500 to-indigo-600"
  },
  { 
    id: 3, 
    name: "ノーツ追加", 
    description: "演奏隊にニセノーツを降らせる",
    icon: Ghost, 
    maxCoolDown: 10,
    remaining: 0,
    color: "from-red-500 to-pink-600"
  },
  { 
    id: 5, 
    name: "紙吹雪", 
    description: "画面全体をパーティクルで覆う",
    icon: PartyPopper, 
    maxCoolDown: 2,
    remaining: 0,
    color: "from-yellow-400 to-orange-500"
  },
];

const initialState: State = {
  points: 0,
  actions: initialList,
};

// --- Reducer ---
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "TICK":
      return {
        ...state,
        points: state.points < MAX_POINTS ? state.points + 1 : state.points,
        actions: state.actions.map((item) => ({
          ...item,
          remaining: item.remaining > 0 ? item.remaining - 1 : 0,
        })),
      };

    case "TRIGGER": {
      const targetIndex = state.actions.findIndex((a) => a.id === action.id);
      if (targetIndex === -1) return state;

      const targetItem = state.actions[targetIndex];

      if (targetItem.remaining > 0 || state.points < ACTION_COST) {
        return state;
      }

      const newActions = [...state.actions];
      newActions[targetIndex] = {
        ...targetItem,
        remaining: targetItem.maxCoolDown,
      };

      return {
        ...state,
        points: state.points - ACTION_COST,
        actions: newActions,
      };
    }

    default:
      return state;
  }
}

export default function ObstructPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const channelRef = useRef<RealtimeChannel | null>(null);

  // タイマー処理
  useEffect(() => {
    const timerId = setInterval(() => {
      dispatch({ type: "TICK" });
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  // Supabaseチャンネル接続 (マウント時に1回だけ実行)
  useEffect(() => {
    if (!roomId) return;

    // チャンネルを作成して購読
    const channel = supabase.channel(`room:${roomId}`);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("Obstruct Mode: Connected to room", roomId);
      }
    });

    channelRef.current = channel;

    // アンマウント時に切断
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId]);

  const handleActionClick = async (id: number) => {
    const action = state.actions.find((a) => a.id === id);

    if (action && action.remaining === 0 && state.points >= ACTION_COST) {
      // ターゲットの自動決定
      let target = "all";
      if (id === 1) target = "singer"; // 歌詞隠し -> Singer
      if (id === 3) target = "band";   // ノーツ追加 -> Band

      // 送信処理 (接続済みのチャンネルを使用)
      if (channelRef.current) {
        await channelRef.current.send({
          type: "broadcast",
          event: "obstruct",
          payload: { 
            id: id,
            action: id === 3 ? "add_note" : "other", 
            target: target 
          },
        });
        console.log("Sent obstruct:", { id, target });
      } else {
        console.error("Channel not connected");
      }

      dispatch({ type: "TRIGGER", id });
      
      if (navigator.vibrate) navigator.vibrate(50);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a1a] text-white overflow-hidden relative font-sans flex items-center justify-center">
      {/* 背景エフェクト */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-linear-to-b from-purple-900/20 to-black" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(120,50,255,0.2),transparent_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col p-4 max-h-100dvh">
        
        {/* ヘッダー */}
        <header className="flex items-center justify-between mb-6 pt-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
              <Ghost className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-black italic tracking-wider text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-pink-400">
                OBSTRUCT MODE
              </h1>
              <p className="text-[10px] text-purple-300/70 font-mono tracking-widest">
                SYSTEM.HACKING...
              </p>
            </div>
          </div>

          {/* ホームに戻るボタン */}
          <button
            onClick={() => router.push(`/room/${roomId}`)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/20 text-purple-300 hover:text-white border border-white/5 transition-all shadow-lg active:scale-95"
            aria-label="Back to Room"
          >
            <Home className="w-5 h-5" />
          </button>
        </header>

        {/* ポイントゲージ */}
        <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-5 mb-6 shadow-[0_0_20px_rgba(168,85,247,0.15)] shrink-0">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-bold text-gray-400 flex items-center gap-1">
              <Zap className="w-4 h-4 text-yellow-400" />
              ENERGY
            </span>
            <div className="text-right">
              <span className={`text-3xl font-black tabular-nums ${state.points >= ACTION_COST ? 'text-white' : 'text-red-400'}`}>
                {state.points}
              </span>
              <span className="text-gray-500 text-sm font-mono">/{MAX_POINTS}</span>
            </div>
          </div>
          
          {/* プログレスバー */}
          <div className="h-4 bg-gray-800 rounded-full overflow-hidden relative border border-white/5">
            <div className="absolute inset-0 flex">
              {Array.from({ length: MAX_POINTS }).map((_, i) => (
                <div key={i} className="flex-1 border-r border-black/30 last:border-0" />
              ))}
            </div>
            <motion.div 
              className="h-full bg-linear-to-r from-purple-600 via-pink-500 to-yellow-400 shadow-[0_0_15px_rgba(236,72,153,0.6)]"
              initial={{ width: 0 }}
              animate={{ width: `${(state.points / MAX_POINTS) * 100}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
          </div>
          <div className="mt-2 text-[10px] text-right text-gray-500">
            Next charge in 1s...
          </div>
        </div>

        {/* アクションリスト */}
        <div className="flex-1 space-y-3 overflow-y-auto pb-4 custom-scrollbar min-h-0">
          <label className="text-xs font-bold text-gray-500 mb-2 block pl-1 tracking-wider">
            ACTIONS <span className="text-xs font-normal text-gray-600 ml-2">(Cost: {ACTION_COST})</span>
          </label>
          
          <AnimatePresence>
            {state.actions.map((action) => {
              const isCoolDown = action.remaining > 0;
              const notEnoughPoints = state.points < ACTION_COST;
              const isDisabled = isCoolDown || notEnoughPoints;

              return (
                <motion.button
                  key={action.id}
                  layout
                  onClick={() => handleActionClick(action.id)}
                  whileTap={!isDisabled ? { scale: 0.98 } : {}}
                  className={`w-full relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 group
                    ${isDisabled 
                      ? "border-white/5 bg-black/20 opacity-70 cursor-not-allowed" 
                      : `border-white/20 bg-linear-to-r ${action.color} bg-opacity-10 hover:border-white/40 shadow-lg cursor-pointer`
                    }`}
                >
                  {!isDisabled && (
                    <div className={`absolute inset-0 opacity-10 bg-linear-to-r ${action.color}`} />
                  )}

                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${
                        isDisabled 
                          ? "bg-gray-800 text-gray-500" 
                          : "bg-black/30 text-white shadow-inner"
                      }`}>
                        <action.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className={`font-bold text-lg ${isDisabled ? "text-gray-500" : "text-white"}`}>
                          {action.name}
                        </div>
                        <div className="text-xs text-gray-400 font-medium">
                          {action.description}
                        </div>
                      </div>
                    </div>

                    <div className="text-right min-w-80px">
                      {isCoolDown ? (
                        <div className="flex flex-col items-end text-gray-500">
                          <span className="text-xl font-mono font-bold">{action.remaining}</span>
                          <span className="text-[10px]">COOLDOWN</span>
                        </div>
                      ) : notEnoughPoints ? (
                        <div className="text-red-400 text-xs font-bold border border-red-900/50 bg-red-900/20 px-2 py-1 rounded">
                          NO ENERGY
                        </div>
                      ) : (
                        <div className="flex flex-col items-center animate-pulse">
                          <Target className="w-6 h-6 text-white mb-1" />
                          <span className="text-[10px] font-bold text-white tracking-widest">READY</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isCoolDown && (
                    <motion.div 
                      className="absolute bottom-0 left-0 h-1 bg-white/30"
                      initial={{ width: "100%" }}
                      animate={{ width: 0 }}
                      transition={{ duration: action.remaining, ease: "linear" }}
                    />
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}