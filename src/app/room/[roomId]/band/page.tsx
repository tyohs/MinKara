'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { KeyboardGame } from '@/components/game';
import { generateDemoChart, getChartForSong } from '@/data/charts';
import { useGameSession } from '@/hooks/useGameSession';
import { getNotesFromPosition } from '@/lib/noteGenerator';

export default function BandPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  
  const { session } = useGameSession(roomId);
  const [isReady, setIsReady] = useState(false);

  // 譜面データを取得
  const chart = useMemo(() => {
    if (session?.song_id) {
      return getChartForSong(session.song_id);
    }
    // デモ用譜面
    return generateDemoChart();
  }, [session?.song_id]);

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

  // ゲーム開始の準備
  useEffect(() => {
    // デモモードまたはセッションがplaying状態になったら開始
    if (!session || session.status === 'playing') {
      setIsReady(true);
    }
  }, [session]);

  // ゲーム終了時のコールバック
  const handleGameEnd = (score: number, maxCombo: number) => {
    console.log('Game ended:', { score, maxCombo });
    // TODO: スコアをサーバーに送信
  };

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

  return (
    <KeyboardGame
      notes={activeNotes}
      songStartedAt={session?.song_started_at ?? new Date().toISOString()}
      onGameEnd={handleGameEnd}
    />
  );
}
