"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-black">
      {/* 背景動画 */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0 brightness-[0.6]"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        role="presentation"
      >
        <source src="/video/background-monochrome.mp4" type="video/mp4" />
      </video>

      {/* メインレイアウト */}
      <div className="relative z-10 w-full h-full flex flex-col px-4 md:px-10">
        {/* ■ 1. ロゴ & キャッチコピー エリア */}
        <div className="flex-1 flex flex-col justify-center items-center min-h-0 py-2 md:py-6">
          {/* ロゴ画像 */}
          <div className="relative w-full flex justify-center items-end h-[55%]">
            <Image
              src="/images/logo.png"
              alt="MinKara"
              width={800}
              height={400}
              priority
              className="w-auto h-full object-contain drop-shadow-2xl"
            />
          </div>

          {/* 隙間 */}
          <div className="h-2 md:h-4 flex-none" />

          {/* キャッチコピー */}
          <div className="relative w-full flex justify-center items-start h-[30%]">
            <Image
              src="/images/catchcopy.png"
              alt="みんなでカラオケをプレイしよう"
              width={800}
              height={300}
              priority
              className="w-auto h-full object-contain opacity-95"
            />
          </div>
        </div>

        {/* ■ 2. ボタン エリア (固定) */}
        {/* ★修正: Tailwindクラス(pb-48など)を使わず、styleで直接高さを指定します */}
        {/* paddingBottom: '20vh' -> 画面の高さの20%（かなり広いです）を強制確保 */}
        <div
          className="flex-none w-full flex justify-center"
          style={{ paddingBottom: "10vh" }}
        >
          <nav className="flex flex-col md:flex-row gap-4 md:gap-8 w-full max-w-sm md:max-w-4xl items-stretch md:items-center">
            {/* ルーム作成ボタン */}
            <button
              onClick={() => router.push("/room/create")}
              className="group relative flex-1 p-5 md:p-6 rounded-2xl md:rounded-3xl border-none shadow-[0_8px_20px_rgba(255,107,107,0.4)] transition-transform active:scale-95 hover:scale-105 flex items-center justify-between overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
              }}
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className="bg-white/20 rounded-xl p-2 md:p-3 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center flex-shrink-0">
                  <Image
                    src="/images/icon-mic.png"
                    alt=""
                    width={40}
                    height={40}
                    className="w-8 h-8 md:w-10 md:h-10 object-contain"
                  />
                </div>
                <div className="text-left text-white min-w-0">
                  <span className="block text-lg md:text-xl font-bold leading-tight whitespace-nowrap">
                    ルームを作成
                  </span>
                  <span className="block text-xs md:text-sm opacity-90 mt-0.5 whitespace-nowrap">
                    新しいパーティを始めよう
                  </span>
                </div>
              </div>
              <span className="text-white text-xl font-bold relative z-10 ml-2">
                ▶
              </span>
            </button>

            {/* ルーム参加ボタン */}
            <button
              onClick={() => router.push("/room/join")}
              className="group relative flex-1 p-5 md:p-6 rounded-2xl md:rounded-3xl border-2 border-white/50 bg-white/90 backdrop-blur-md shadow-lg transition-transform active:scale-95 hover:scale-105 flex items-center justify-between overflow-hidden"
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className="bg-black/5 rounded-xl p-2 md:p-3 w-12 h-12 md:w-14 md:h-14 flex items-center justify-center flex-shrink-0">
                  <Image
                    src="/images/icon-hand.png"
                    alt=""
                    width={40}
                    height={40}
                    className="w-8 h-8 md:w-10 md:h-10 object-contain"
                  />
                </div>
                <div className="text-left text-gray-800 min-w-0">
                  <span className="block text-lg md:text-xl font-bold leading-tight whitespace-nowrap">
                    ルームに参加
                  </span>
                  <span className="block text-xs md:text-sm text-gray-500 mt-0.5 whitespace-nowrap">
                    友達のパーティに入ろう
                  </span>
                </div>
              </div>
              <span className="text-gray-800 text-xl font-bold relative z-10 ml-2">
                ▶
              </span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
