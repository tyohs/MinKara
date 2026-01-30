"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Mic, Users, ChevronRight, type LucideIcon } from "lucide-react";
import { Noto_Sans_JP } from "next/font/google";

// 日本語フォント
const notoSansJP = Noto_Sans_JP({
  weight: ["500", "700"],
  subsets: ["latin"],
  display: "swap",
});

export default function HomePage() {
  const router = useRouter();

  return (
    <div
      className={`relative h-dvh w-screen overflow-hidden bg-[#050505] text-white ${notoSansJP.className}`}
    >
      {/* 背景動画 & オーバーレイ */}
      <div className="absolute inset-0 z-0">
        <video
          className="absolute inset-0 w-full h-full object-cover brightness-[0.5] scale-105 blur-xs"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        >
          <source src="/video/background-monochrome.mp4" type="video/mp4" />
        </video>
        {/* グラデーションオーバーレイ */}
        <div className="absolute inset-0 bg-linear-to-t from-[#050505] via-transparent to-black/40" />
      </div>

      {/* メインレイアウト */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-between px-6 py-4">
        {/* ロゴエリア */}
        <div className="flex-1 flex flex-col justify-center items-center w-full max-w-5xl">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative w-full flex flex-col items-center gap-6"
          >
            {/* ロゴ画像 */}
            <div className="relative w-full max-w-162.5 aspect-[2.5/1]">
              <Image
                src="/images/logo.png"
                alt="MinKara"
                fill
                priority
                className="object-contain drop-shadow-2xl"
              />
            </div>

            {/* キャッチコピー */}
            <div className="relative w-full max-w-112.5 aspect-5/1">
              <Image
                src="/images/catchcopy.png"
                alt="みんなでカラオケをプレイしよう"
                fill
                priority
                className="object-contain opacity-90"
              />
            </div>
          </motion.div>
        </div>

        {/* ボタンエリア */}
        <div className="w-full max-w-4xl flex flex-col md:flex-row gap-5 items-center justify-center mt-auto">
          {/* CREATE ROOM BUTTON */}
          <ModernButton
            onClick={() => router.push("/room/create")}
            type="primary"
            icon={Mic}
            label="ルームを作成"
            subLabel="新しいパーティを始める"
            delay={0.2}
          />

          {/* JOIN ROOM BUTTON */}
          <ModernButton
            onClick={() => router.push("/room/join")}
            type="secondary"
            icon={Users}
            label="ルームに参加"
            subLabel="友達の部屋に入る"
            delay={0.3}
          />
        </div>

        {/* 空白 */}
        <div className="h-20 md:h-32 w-full flex-none" />
      </div>
    </div>
  );
}

// ボタンコンポーネントのProps型定義
interface ModernButtonProps {
  onClick: () => void;
  type: "primary" | "secondary";
  icon: LucideIcon;
  label: string;
  subLabel: string;
  delay: number;
}

// ボタンコンポーネント
function ModernButton({
  onClick,
  type,
  icon: Icon,
  label,
  subLabel,
  delay,
}: ModernButtonProps) {
  const isPrimary = type === "primary";

  return (
    <motion.button
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative w-full md:w-[48%] h-24 rounded-2xl overflow-hidden transition-all duration-300"
    >
      {/* 背景 */}
      <div
        className={`absolute inset-0 transition-all duration-300 ${
          isPrimary
            ? "bg-[#FF8E53]"
            : "bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/15"
        }`}
      />

      {/* コンテンツ */}
      <div className="absolute inset-0 flex items-center justify-between px-6 md:px-8">
        <div className="flex items-center gap-5">
          {/* アイコンサークル */}
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
              isPrimary ? "bg-white/20 text-white" : "bg-white text-black"
            }`}
          >
            <Icon className="w-6 h-6" />
          </div>

          <div className="text-left">
            <span className="block text-xl md:text-2xl font-bold tracking-wide text-white">
              {label}
            </span>
            <span
              className={`block text-xs md:text-sm font-medium transition-colors duration-300 ${
                isPrimary
                  ? "text-white/90"
                  : "text-gray-400 group-hover:text-gray-200"
              }`}
            >
              {subLabel}
            </span>
          </div>
        </div>

        {/* 矢印アイコン */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 ${
            isPrimary ? "text-white" : "text-gray-500 group-hover:text-white"
          }`}
        >
          <ChevronRight className="w-6 h-6" strokeWidth={3} />
        </div>
      </div>
    </motion.button>
  );
}
