'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 曲データを取得
  const song = useMemo(() => {
    if (session?.song_id) {
      return getSongById(session.song_id);
    }
    return null;
  }, [session?.song_id]);

  // Audio sync hook
  const { audioRef, isPlaying, error } = useSyncedAudio(
    session?.song_started_at || null,
    song?.audio_url || ''
  );

  // 手動再生ハンドラ
  const handleManualPlay = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  };

  const [showPlayButton, setShowPlayButton] = useState(false);

  // 再生ボタンの表示制御
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isPlaying && !showPlayButton) {
      // エラーがある場合は即時表示、そうでなければ3秒待つ
      const delay = error ? 0 : 3000;
      timer = setTimeout(() => {
        // まだ再生されていなければボタンを表示
        // (audioRef.current?.paused もチェックするとより確実だが、isPlayingで代用)
        setShowPlayButton(true);
      }, delay);
    } else if (isPlaying) {
      setShowPlayButton(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, error, showPlayButton]);

  // ゲーム開始の準備（status変更に追従）
  useEffect(() => {
    setIsReady(session?.status === 'playing');
  }, [session?.status]);

  // ゲーム終了時のコールバック
  const handleGameEnd = useCallback(() => {
    if (gameEnded) return;
    setGameEnded(true);

    // リザルト画面へ遷移（3秒後）
    timeoutRef.current = setTimeout(() => {
      router.push(`/room/${roomId}`);
    }, 3000);
  }, [roomId, router, gameEnded]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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

  // ローディング中または準備中
  const isLoadingOrWaiting = !isReady || !song;

  return (
    <>
      {/* 音声要素は常にレンダリングしておく（自動再生の可能性を高めるため） */}
      {song && (
        <audio 
          ref={audioRef} 
          src={song.audio_url} 
          preload="auto" 
          autoPlay 
          // iOS等での自動再生制限緩和のため
          playsInline 
        />
      )}
      
      {/* 自動再生ブロック対策：再生されていない場合にボタンを表示（3秒待っても始まらない場合のみ） */}
      {showPlayButton && !isPlaying && song && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10000,
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '24px',
          borderRadius: '16px',
          textAlign: 'center',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>🎵</div>
          <div style={{ marginBottom: '24px', color: 'white', fontWeight: 'bold' }}>音楽の再生が必要です</div>
          <button 
            onClick={handleManualPlay}
            style={{
              padding: '12px 32px',
              fontSize: '18px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #8a2be2, #ff69b4)',
              border: 'none',
              borderRadius: '30px',
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(255, 105, 180, 0.4)'
            }}
          >
            再生する
          </button>
          
          {error && (
            <div style={{ marginTop: '12px', color: '#ff6b6b', fontSize: '12px' }}>
              Error: {error.message}
            </div>
          )}
        </div>
      )}

      {isLoadingOrWaiting ? (
        <div className="flex items-center justify-center h-screen bg-[#0a0a0f] text-white">
          <div className="text-center">
            <div className="text-2xl font-bold mb-4">準備中...</div>
            <div className="text-sm text-gray-400">
              {session?.status === 'countdown' && 'カウントダウン中'}
              {session?.status === 'role_select' && '役割選択中'}
            </div>
          </div>
        </div>
      ) : (
        <SingerGame
          song={song}
          songStartedAt={session?.song_started_at ?? null}
          roomId={roomId}
          onGameEnd={handleGameEnd}
        />
      )}
    </>
  );
}
