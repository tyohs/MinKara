'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import KeyboardGame from '@/components/game/KeyboardGame';
import { generateDemoChart, getChartForSong } from '@/data/charts';
import { getSongById } from '@/data/songs';
import { useGameSession } from '@/hooks/useGameSession';
import { useSyncedAudio } from '@/hooks/useSyncedAudio';
import { submitScore, getUserId } from '@/hooks/useSubmitScore';
import { getNotesFromPosition } from '@/lib/noteGenerator';

export default function KeyboardPage() {
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

  // 譜面データを取得
  const chart = useMemo(() => {
    if (session?.song_id) {
      return getChartForSong(session.song_id);
    }
    // デモ用譜面
    return generateDemoChart();
  }, [session?.song_id]);

  // デモモードの場合のduration（約32秒）
  const songDuration = song?.duration ?? 32;

  // 途中参加の場合、経過時間以降のノーツのみを取得
  const activeNotes = useMemo(() => {
    if (!chart) return [];
    
    if (session?.song_started_at) {
      const startTime = new Date(session.song_started_at).getTime();
      const elapsed = Date.now() - startTime;
      return getNotesFromPosition(chart.notes, elapsed);
    }
    
    return chart.notes;
  }, [chart, session?.song_started_at]);

  // Audio sync hook
  const audioRef = useSyncedAudio(
    session?.song_started_at || null, 
    song?.audio_url || ''
  );

  // ゲーム開始の準備
  useEffect(() => {
    // デモモードまたはセッションがplaying状態になったら開始
    if (!session || session.status === 'playing') {
      setIsReady(true);
    }
  }, [session]);

  // ゲーム終了時のコールバック
  const handleGameEnd = useCallback(async (score: number, maxCombo: number) => {
    if (gameEnded) return;
    setGameEnded(true);

    console.log('Game ended:', { score, maxCombo });

    // スコアを送信（セッションがある場合のみ）
    if (session?.id) {
      const userId = getUserId();
      await submitScore({
        roomId,
        sessionId: session.id,
        userId,
        score,
        maxCombo,
      });
    }

    // リザルト画面へ遷移（3秒後）
    setTimeout(() => {
      router.push(`/room/${roomId}`);
    }, 3000);
  }, [session, roomId, router, gameEnded]);

  if (!isReady) {
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
          <div className="text-4xl font-bold mb-4">🎉 演奏完了！</div>
          <div className="text-lg text-gray-400">
            ルームに戻ります...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {song && <audio ref={audioRef} src={song.audio_url} preload="auto" />}
      <KeyboardGame
        notes={activeNotes}
        songStartedAt={session?.song_started_at ?? new Date().toISOString()}
        songDuration={songDuration}
        bpm={song?.bpm ?? 120}
        onGameEnd={handleGameEnd}
      />
    </>
  );
}
