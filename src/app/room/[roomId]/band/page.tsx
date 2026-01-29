'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { KeyboardGame, GuitarGame, DrumGame } from '@/components/game';
import { generateDemoChart, getChartForSong } from '@/data/charts';
import { getSongById } from '@/data/songs';
import { useGameSession } from '@/hooks/useGameSession';
import { submitScore, getUserId } from '@/hooks/useSubmitScore';
import { getNotesFromPosition } from '@/lib/noteGenerator';

type Instrument = 'keyboard' | 'guitar' | 'drums';

export default function BandPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  

  
  // 楽器をクエリパラメータから取得（デフォルト: keyboard）
  const instrument = (searchParams.get('instrument') as Instrument) || 'keyboard';
  
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


  // デモモードの場合のduration（6分間）
  const songDuration = song?.duration ?? 360;

  // 途中参加の場合、経過時間以降のノーツのみを取得
  const activeNotes = useMemo(() => {
    if (!chart) return [];
    
    if (session?.song_started_at) {
      const startTime = new Date(session.song_started_at).getTime();
      const elapsed = Date.now() - startTime;
      const filtered = getNotesFromPosition(chart.notes, elapsed);
      return filtered;
    }
    
    return chart.notes;
  }, [chart, session?.song_started_at, session?.song_id]);



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

  // 楽器に応じてゲームコンポーネントを切り替え
  const gameProps = {
    notes: activeNotes,
    songStartedAt: session?.song_started_at ?? new Date().toISOString(),
    songDuration: songDuration,
    onGameEnd: handleGameEnd,
    roomId: roomId,
    userId: getUserId(),
  };

  const renderGame = () => {
    switch (instrument) {
      case 'guitar':
        return <GuitarGame {...gameProps} />;
      case 'drums':
        return <DrumGame {...gameProps} />;
      case 'keyboard':
      default:
        return <KeyboardGame {...gameProps} />;
    }
  };

  return (
    <>


      {renderGame()}
    </>
  );
}
