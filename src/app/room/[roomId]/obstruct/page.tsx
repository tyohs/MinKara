"use client";

// クールタイム待って連打するだけだとつまらないからポイント消費システムを追加。
// お邪魔側も何かミニゲームさせといてもいい気はする。すごく質素。

import { useReducer, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

// --- 型定義 ---
type ActionItem = {
  id: number;
  name: string;
  maxCoolDown: number;
  remaining: number;
};

type State = {
  points: number;
  actions: ActionItem[];
};

type Action = { type: "TICK" } | { type: "TRIGGER"; id: number };

// --- 設定値 ---
const MAX_POINTS = 10;
const ACTION_COST = 4;

const initialList: ActionItem[] = [
  { id: 1, name: "歌詞隠し", maxCoolDown: 15, remaining: 0 },
  { id: 2, name: "別の音", maxCoolDown: 20, remaining: 0 },
  { id: 3, name: "ノーツ追加", maxCoolDown: 15, remaining: 0 },
  { id: 4, name: "ノーツ隠し", maxCoolDown: 12, remaining: 0 },
  { id: 5, name: "紙吹雪", maxCoolDown: 10, remaining: 0 },
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
        points: state.points - ACTION_COST,
        actions: newActions,
      };
    }

    default:
      return state;
  }
}

export default function Obstruct() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const params = useParams(); // ルームIDを取得
  const roomId = params.roomId as string;

  useEffect(() => {
    const timerId = setInterval(() => {
      dispatch({ type: "TICK" });
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  // ハンドラーを非同期に修正
  const handleActionClick = async (id: number) => {
    const action = state.actions.find((a) => a.id === id);

    // 発動可能な条件（クールダウン終了かつポイント十分）を満たしているか確認
    if (action && action.remaining === 0 && state.points >= ACTION_COST) {
      
      // ID: 3 (ノーツ追加) の場合、Broadcastを送信
      if (id === 3) {
        const channel = supabase.channel(`room:${roomId}`);
        await channel.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.send({
              type: "broadcast",
              event: "obstruct",
              payload: { action: "add_note" },
            });
            supabase.removeChannel(channel);
          }
        });
      }

      dispatch({ type: "TRIGGER", id });
    }
  };

  return (
    // 外枠コンテナ
    <div className="flex h-screen w-full select-none items-center justify-center bg-[#0f1219] font-mono text-white">
      {/* お邪魔パネル本体 */}
      <div className="relative w-full max-w-420px border-2 border-white bg-[#0f1219] p-5 shadow-[0_0_15px_rgba(0,0,0,0.7)]">
        {/* ヘッダー */}
        <div className="mb-4 border-b border-white pb-2 text-center text-xl font-bold">
          【お邪魔画面】
        </div>

        {/* ポイント表示 */}
        <div className="my-2.5 border border-dashed border-[#444] bg-black/30 p-1 text-center text-2xl">
          <span className="mr-2">👿</span>
          <span className="mr-1 font-bold text-[#ff3333]">{state.points}</span>
          <span className="text-base text-gray-500">/ {MAX_POINTS}</span>
        </div>

        {/* 対象選択 (見た目のみ) */}
        <div className="my-6">
          <div className="mb-3 text-lg">対象選択：</div>
          <div className="flex gap-5 pl-2">
            <label className="flex cursor-pointer items-center gap-1 hover:underline">
              <span>[ ]</span> シンガー
            </label>
            <label className="flex cursor-pointer items-center gap-1 hover:underline">
              <span>[ ]</span> バンド全員
            </label>
          </div>
        </div>

        {/* 区切り線 */}
        <div className="-mx-5 my-4 border-b border-white"></div>

        {/* アクション一覧 */}
        <div className="my-6">
          <div className="mb-3 text-lg">アクション (消費: {ACTION_COST})：</div>
          <ul className="m-0 list-none p-0">
            {state.actions.map((action) => {
              const isCoolDownFinished = action.remaining === 0;
              const hasEnoughPoints = state.points >= ACTION_COST;
              const isReady = isCoolDownFinished && hasEnoughPoints;

              return (
                <li
                  key={action.id}
                  onClick={() => handleActionClick(action.id)}
                  // 条件付きスタイル: Readyならホバー効果、不可ならグレーアウト
                  className={`flex items-center justify-between mb-3 rounded px-2.5 py-2 transition-colors duration-100 
                    ${
                      isReady
                        ? "cursor-pointer hover:bg-white/20 active:translate-y-2px"
                        : "cursor-not-allowed text-[#666]"
                    }`}
                >
                  {/* 左側：ボタン名 */}
                  <span
                    className={`font-bold ${isReady ? "text-[#aaddff]" : "text-[#666]"}`}
                  >
                    [{action.name}]
                  </span>

                  {/* 右側：状態表示 */}
                  <span className="text-right">
                    {!isCoolDownFinished ? (
                      // クールダウン中
                      <span className="text-[#666]">
                        ({action.remaining}秒)
                      </span>
                    ) : !hasEnoughPoints ? (
                      // コスト不足
                      <span className="text-sm text-[#ff3333]">コスト不足</span>
                    ) : (
                      // 発動可能 (Tailwindのanimate-pulseで点滅表現)
                      <span className="font-bold text-[#ffff00] animate-pulse">
                        ← READY
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}