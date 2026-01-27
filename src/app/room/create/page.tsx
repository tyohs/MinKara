"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  useRoomStore,
  createRoom,
  generateUserId,
  joinRoom,
} from "@/store/useRoomStore";

export default function CreateRoomPage() {
  const router = useRouter();
  const { setRoomId, setMyUserId, setMyName, myUserId } = useRoomStore();

  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!myUserId) {
      const userId = generateUserId();
      setMyUserId(userId);
    }
  }, [myUserId, setMyUserId]);

  const handleCreate = async () => {
    if (!myUserId) return;
    setIsCreating(true);
    setError(null);

    const newRoomId = await createRoom(myUserId);
    if (newRoomId) {
      setRoomId(newRoomId);
      const displayName = name.trim() || "ゲスト";
      setMyName(displayName);
      const success = await joinRoom(newRoomId, myUserId, displayName);
      if (success) {
        router.push(`/room/${newRoomId}`);
      } else {
        setError("ルームへの参加に失敗しました");
        setIsCreating(false);
      }
    } else {
      setError("ルームの作成に失敗しました");
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative">
      {/* 背景動画 */}
      <video
        className="video-bg fixed inset-0 w-full h-full object-cover pointer-events-none z-0"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        role="presentation"
      >
        <source src="/video/background-monochrome.mp4" type="video/mp4" />
      </video>

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl"
          style={{
            paddingLeft: "40px",
            paddingRight: "40px",
            paddingTop: "40px",
            paddingBottom: "40px",
          }}
        >
          {/* Header */}
          <div className="grid grid-cols-[48px_1fr_48px] items-center mb-8">
            <button
              onClick={() => router.push("/")}
              className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
              aria-label="戻る"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 text-center whitespace-nowrap">
              ルームを作成
            </h1>
            <div aria-hidden="true" />
          </div>

          <p className="text-gray-500 text-center text-sm mb-10 leading-relaxed">
            新しいルームを作成して
            <br />
            みんなで楽しもう
          </p>

          <div className="space-y-8">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-3 ml-1">
                あなたの名前（任意）
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="名前を入力..."
                maxLength={20}
                className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-lg">
                {error}
              </p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreate}
              disabled={isCreating}
              className="w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none transition-all"
              style={{
                background: "linear-gradient(135deg, #FF7E5F 0%, #FF6B8A 100%)",
                boxShadow: "0 4px 14px rgba(255, 107, 138, 0.4)",
              }}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  作成中...
                </>
              ) : (
                "ルームを作成"
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
