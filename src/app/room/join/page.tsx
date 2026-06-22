"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRoomStore, joinRoom } from "@/store/useRoomStore";
import { getClientUserId } from "@/lib/clientIdentity";

export default function JoinRoomPage() {
  const router = useRouter();
  const { setRoomId, setIsHost, setMyUserId, setMyName, myUserId } =
    useRoomStore();

  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!myUserId) {
      const userId = getClientUserId();
      setMyUserId(userId);
    }
  }, [myUserId, setMyUserId]);

  // 全角→半角、不要文字削除
  const sanitizeRoomCode = (input: string) => {
    return input
      .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)) // 全角数字 → 半角
      .replace(/[Ａ-Ｚａ-ｚ]/g, (s) =>
        String.fromCharCode(s.charCodeAt(0) - 0xfee0),
      ) // 全角英字 → 半角
      .replace(/[^a-zA-Z0-9]/g, "") // 英数字以外（空白、記号）を削除
      .toUpperCase(); // 大文字化
  };

  const handleJoin = async () => {
    const cleanCode = sanitizeRoomCode(roomCode);

    if (!myUserId || !cleanCode) {
      setError("ルームコードを入力してください");
      return;
    }

    if (cleanCode.length !== 6) {
      setError("ルームコードは6桁です");
      return;
    }

    setIsJoining(true);
    setError(null);

    const displayName = name.trim() || "ゲスト";

    const success = await joinRoom(cleanCode, myUserId, displayName);

    if (success) {
      setRoomId(cleanCode);
      setIsHost(false);
      setMyName(displayName);
      router.push(`/room/${cleanCode}`);
    } else {
      setError("ルームが見つかりません");
      setIsJoining(false); // 失敗時のみローディング解除
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative">
      {/* 背景動画 */}
      <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <video
          className="w-full h-full object-cover brightness-[0.6] scale-110"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
          role="presentation"
        >
          <source src="/video/background-monochrome.mp4" type="video/mp4" />
        </video>
      </div>

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
              ルームに参加
            </h1>
            <div aria-hidden="true" />
          </div>

          <p className="text-gray-500 text-center text-sm mb-10 leading-relaxed">
            ルームコードを入力して
            <br />
            パーティに参加しよう
          </p>

          <div className="space-y-8">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-3 ml-1">
                ルームコード
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="000000"
                maxLength={6}
                className="w-full px-5 py-5 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 text-center text-3xl font-mono font-bold tracking-[0.5em] placeholder:text-gray-300 placeholder:tracking-normal focus:outline-none focus:border-pink-400 focus:bg-white transition-all uppercase"
              />
            </div>

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
              onClick={handleJoin}
              disabled={isJoining || roomCode.length < 6}
              className="w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none transition-all"
              style={{
                background: "linear-gradient(135deg, #FF7E5F 0%, #FF6B8A 100%)",
                boxShadow: "0 4px 14px rgba(255, 107, 138, 0.4)",
              }}
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  参加中...
                </>
              ) : (
                "ルームに参加"
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
