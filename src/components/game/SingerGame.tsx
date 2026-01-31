'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getLyricsForSong } from '@/data/lyrics';
import FanServiceDisplay from './FanServiceDisplay';
import type { Song } from '@/types';
import { FanServiceRequest } from '@/types/fanService';
import { supabase } from '@/lib/supabase';
import styles from './SingerGame.module.css';

// --- お邪魔定数 ---
const OBSTRUCT_IDS = {
  BLIND: 1, // 歌詞隠し
} as const;

// 変更: 5000 -> 10000 (10秒)
const OBSTRUCT_DURATION = 10000;
// ----------------------

interface SingerGameProps {
  song: Song;
  songStartedAt: string | null;
  roomId?: string;
  onGameEnd?: () => void;
}

export default function SingerGame({
  song,
  songStartedAt,
  roomId = '',
  onGameEnd,
}: SingerGameProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const gameEndedRef = useRef(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [fanServiceRequest, setFanServiceRequest] = useState<FanServiceRequest | null>(null);

  // モザイク（歌詞隠し）状態
  const [isMosaicActive, setIsMosaicActive] = useState(false);

  // イベント受信設定
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`room:${roomId}`);
    
    channel
      .on('broadcast', { event: 'fan_service' }, (payload) => {
        console.log('[SingerGame] Received fan_service event:', payload);
        const request = payload.payload as FanServiceRequest;
        setFanServiceRequest(request);
      })
      // お邪魔イベント受信
      .on('broadcast', { event: 'obstruct' }, (payload) => {
        const { id, action, target } = payload.payload;

        // ターゲット判定: バンド宛てなら無視
        if (target === 'band') return;

        // 歌詞隠し (ID 1) -> モザイク発動
        if (id === OBSTRUCT_IDS.BLIND || action === 'hide_lyrics') {
          setIsMosaicActive(true);
          
          setTimeout(() => {
            setIsMosaicActive(false);
          }, OBSTRUCT_DURATION);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // ファンサ表示完了コールバック
  const handleFanServiceDismiss = useCallback(() => {
    setFanServiceRequest(null);
  }, []);

  // 歌詞データを取得
  const lyrics = useMemo(() => getLyricsForSong(song.id), [song.id]);

  // ゲーム時間の更新
  useEffect(() => {
    if (!songStartedAt) return;

    const serverStartTime = new Date(songStartedAt).getTime();

    const updateTime = () => {
      const now = Date.now();
      const elapsed = (now - serverStartTime) / 1000;
      setCurrentTime(elapsed);
    };

    updateTime();
    const interval = setInterval(updateTime, 50);

    return () => clearInterval(interval);
  }, [songStartedAt]);

  // 現在の歌詞インデックスを計算
  const currentLyricIndex = useMemo(() => {
    if (!lyrics) return -1;
    for (let i = lyrics.lines.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics.lines[i].time) {
        return i;
      }
    }
    return -1;
  }, [lyrics, currentTime]);

  // ユーザースクロール検出
  const handleScroll = () => {
    isUserScrolling.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    // 3秒間操作がなければ自動スクロールを再開
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 3000);
  };

  // 歌詞が変わったら自動スクロール（ユーザーがスクロール中でなければ）
  useEffect(() => {
    if (currentLyricIndex >= 0 && lyricsContainerRef.current && !isUserScrolling.current) {
      const lyricElements = lyricsContainerRef.current.querySelectorAll('[data-lyric-index]');
      const currentElement = lyricElements[currentLyricIndex] as HTMLElement;
      if (currentElement) {
        currentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [currentLyricIndex]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // ゲーム終了判定
  useEffect(() => {
    if (!song.duration || gameEndedRef.current) return;

    if (currentTime >= song.duration) {
      gameEndedRef.current = true;
      onGameEnd?.();
    }
  }, [currentTime, song.duration, onGameEnd]);

  // 進捗バーの計算
  const progress = song.duration ? Math.min((currentTime / song.duration) * 100, 100) : 0;

  // 時間のフォーマット
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className={styles.container}>

      {/* ファンサ表示（全画面オーバーレイ） */}
      {fanServiceRequest && (
        <FanServiceDisplay 
          request={fanServiceRequest} 
          onDismiss={handleFanServiceDismiss} 
        />
      )}

      {/* 背景動画 */}
      <video
        className={styles.backgroundVideo}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      >
        <source src="/video/Ambient_Light_Orb_Loop.mp4" type="video/mp4" />
      </video>
      <div className={styles.videoOverlay} />

      {/* ヘッダー：役割と曲情報 */}
      <header className={styles.header}>
        <div className={styles.roleIndicator}>
          <span className={styles.micIcon}>🎤</span>
          <span className={styles.roleText}>あなたがシンガーです</span>
        </div>
        <h1 className={styles.songTitle}>{song.title}</h1>
        <p className={styles.artistName}>{song.artist}</p>
      </header>

      {/* メイン：歌詞表示エリア（スクロール可能） */}
      <main
        className={styles.lyricsArea}
        ref={lyricsContainerRef}
        onScroll={handleScroll}
        onTouchStart={handleScroll}
        // モザイク（ぼかし）スタイルの適用
        style={{
          filter: isMosaicActive ? 'blur(12px)' : 'none',
          transition: 'filter 0.3s ease',
          pointerEvents: isMosaicActive ? 'none' : 'auto',
        }}
      >
        {lyrics && lyrics.lines.length > 0 ? (
          <div className={styles.lyricsContainer}>
            {/* 上部スペーサー */}
            <div className={styles.lyricsSpacer} />
            
            {lyrics.lines.map((line, index) => {
              const isCurrent = index === currentLyricIndex;
              const isPast = index < currentLyricIndex;
              
              return (
                <div
                  key={index}
                  data-lyric-index={index}
                  className={`${styles.lyricLine} ${
                    isCurrent
                      ? styles.currentLyric
                      : isPast
                      ? styles.pastLyric
                      : styles.futureLyric
                  }`}
                >
                  {line.text}
                </div>
              );
            })}
            
            {/* 下部スペーサー */}
            <div className={styles.lyricsSpacer} />
          </div>
        ) : (
          <div className={styles.noLyrics}>
            <span className={styles.musicNote}>♪</span>
            <p>歌詞データがありません</p>
            <p className={styles.noLyricsHint}>音楽に合わせて歌いましょう！</p>
          </div>
        )}
      </main>

      {/* フッター：進捗バー */}
      <footer className={styles.footer}>
        <div className={styles.progressContainer}>
          <span className={styles.timeDisplay}>{formatTime(currentTime)}</span>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={styles.timeDisplay}>{formatTime(song.duration)}</span>
        </div>
      </footer>
    </div>
  );
}