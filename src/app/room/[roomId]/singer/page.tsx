'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SingerGame } from '@/components/game';
import { getSongById } from '@/data/songs';
import { useGameSession } from '@/hooks/useGameSession';
import { useSyncedAudio } from '@/hooks/useSyncedAudio';
import styles from '@/components/game/SingerGame.module.css';

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
    let timer: NodeJS.Timeout | undefined;
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
    return () => {
      if (timer) clearTimeout(timer);
    };
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
        <div className={styles.playOverlay}>
          <div className={styles.playIcon}>🎵</div>
          <div className={styles.playMessage}>音楽の再生が必要です</div>
          <button 
            onClick={handleManualPlay}
            className={styles.playButton}
          >
            再生する
          </button>
          
          {error && (
            <div className={styles.errorMessage}>
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
