'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SingerGame } from '@/components/game';
import { getSongById } from '@/data/songs';
import { useGameSession } from '@/hooks/useGameSession';
import { useSyncedAudio } from '@/hooks/useSyncedAudio';

export default function SingerPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const { session } = useGameSession(roomId);
  const [isReady, setIsReady] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);

  // 曲データを取得
  const song = useMemo(() => {
    if (session?.song_id) {
      return getSongById(session.song_id);
    }
    return null;
  }, [session?.song_id]);

  // Audio sync hook
  const audioRef = useSyncedAudio(
    session?.song_started_at || null,
    song?.audio_url || ''
  );

  // ゲーム開始の準備
  useEffect(() => {
    // セッションがplaying状態になったら開始
    if (!session || session.status === 'playing') {
      setIsReady(true);
    }
  }, [session]);

  // ゲーム終了時のコールバック
  const handleGameEnd = useCallback(() => {
    if (gameEnded) return;
    setGameEnded(true);

    console.log('Singer game ended');

    // リザルト画面へ遷移（3秒後）
    setTimeout(() => {
      router.push(`/room/${roomId}`);
    }, 3000);
  }, [roomId, router, gameEnded]);

  if (!isReady || !song) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f] text-white">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">準備中...</div>
          <div className="text-sm text-gray-400">
            {session?.status === 'countdown' && 'カウントダウン中'}
            {session?.status === 'role_select' && '役割選択中'}
          </div>
        </div>
      </div>
    );
  }

  if (gameEnded) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f] text-white">
        <div className="text-center">
          <div className="text-4xl font-bold mb-4">🎤 歌い終わり！</div>
          <div className="text-lg text-gray-400">
            ルームに戻ります...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <audio ref={audioRef} src={song.audio_url} preload="auto" />
      <SingerGame
        song={song}
        songStartedAt={session?.song_started_at ?? new Date().toISOString()}
        onGameEnd={handleGameEnd}
      />
    </>
  );
}
