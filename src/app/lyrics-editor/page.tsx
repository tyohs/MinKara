'use client';

import { useState, useRef, useEffect, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { SONGS } from '@/data/songs';
import styles from './page.module.css';

interface LyricLine {
  time: number | null;
  text: string;
}

export default function LyricsEditorPage() {
  const [selectedSongId, setSelectedSongId] = useState<string>('');
  const [lyricsText, setLyricsText] = useState('');
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const selectedSong = SONGS.find(s => s.id === selectedSongId);

  // 歌詞テキストをパース
  const parseLyrics = useCallback(() => {
    const lines = lyricsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    setLyrics(lines.map(text => ({ time: null, text })));
    setCurrentLineIndex(0);
  }, [lyricsText]);

  // オーディオ時間の更新
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setIsRecording(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [selectedSongId]);

  // 再生/停止トグル
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  // 録音開始
  const startRecording = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || lyrics.length === 0) return;

    audio.currentTime = 0;
    setCurrentLineIndex(0);
    setIsRecording(true);
    audio.play();
    setIsPlaying(true);
  }, [lyrics.length]);

  // 録音停止
  const stopRecording = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    setIsPlaying(false);
    setIsRecording(false);
  }, []);

  const recordTiming = useCallback(() => {
    if (!isRecording || currentLineIndex >= lyrics.length) return;
    setLyrics(prev => prev.map((line, idx) => 
      idx === currentLineIndex 
        ? { ...line, time: Math.round(currentTime * 10) / 10 }
        : line
    ));
    setCurrentLineIndex(prev => Math.min(prev + 1, lyrics.length));
  }, [currentLineIndex, currentTime, isRecording, lyrics.length]);

  const undoTiming = useCallback(() => {
    if (currentLineIndex <= 0) return;
    setCurrentLineIndex(prev => prev - 1);
    setLyrics(prev => prev.map((line, idx) => 
      idx === currentLineIndex - 1 ? { ...line, time: null } : line
    ));
  }, [currentLineIndex]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // テキストエリアにフォーカスがある場合は無視
      if (e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          recordTiming();
          break;
        case 'Backspace':
          e.preventDefault();
          undoTiming();
          break;
        case 'p':
          e.preventDefault();
          togglePlay();
          break;
        case 'r':
          e.preventDefault();
          startRecording();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordTiming, undoTiming, togglePlay, startRecording]);

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
    }
  };

  const updateTimeFromPointer = (clientX: number, target: HTMLDivElement) => {
    if (!selectedSong) return;
    const rect = target.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const next = Math.max(0, Math.min(selectedSong.duration, ratio * selectedSong.duration));
    seekTo(next);
  };

  const handleProgressMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    updateTimeFromPointer(e.clientX, e.currentTarget);
    setIsScrubbing(true);
  };

  useEffect(() => {
    if (!isScrubbing) return;

    const handleMove = (e: MouseEvent) => {
      const bar = progressBarRef.current;
      if (!bar) return;
      updateTimeFromPointer(e.clientX, bar);
    };

    const handleUp = () => {
      setIsScrubbing(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isScrubbing, selectedSong?.duration]);

  // TypeScript出力を生成
  const generateOutput = () => {
    const lines = lyrics
      .filter(l => l.time !== null)
      .map(l => `    { time: ${l.time}, text: '${l.text.replace(/'/g, "\\'")}' },`)
      .join('\n');
    
    return `lines: [\n${lines}\n  ],`;
  };

  const copyToClipboard = async () => {
    const output = generateOutput();
    await navigator.clipboard.writeText(output);
    alert('コピーしました！');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>🎵 歌詞タイミングエディタ</h1>
        <p>曲を再生しながらEnter/Spaceで歌詞のタイミングを記録</p>
      </header>

      <div className={styles.mainContent}>
        {/* 左側：設定パネル */}
        <div className={styles.settingsPanel}>
          <div className={styles.section}>
            <h3>1. 曲を選択</h3>
            <select
              value={selectedSongId}
              onChange={(e) => setSelectedSongId(e.target.value)}
              className={styles.select}
            >
              <option value="">曲を選んでください</option>
              {SONGS.map(song => (
                <option key={song.id} value={song.id}>
                  {song.title} - {song.artist}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.section}>
            <h3>2. 歌詞を入力（1行1フレーズ）</h3>
            <textarea
              value={lyricsText}
              onChange={(e) => setLyricsText(e.target.value)}
              placeholder="ここに歌詞を貼り付け&#10;1行に1フレーズ&#10;..."
              className={styles.textarea}
              rows={10}
            />
            <button onClick={parseLyrics} className={styles.button}>
              歌詞をパース
            </button>
          </div>

          <div className={styles.section}>
            <h3>3. ショートカット</h3>
            <ul className={styles.shortcuts}>
              <li><kbd>R</kbd> 録音開始（最初から）</li>
              <li><kbd>Space</kbd> / <kbd>Enter</kbd> タイミング記録</li>
              <li><kbd>Backspace</kbd> 1つ戻る</li>
              <li><kbd>P</kbd> 再生/停止</li>
            </ul>
          </div>
        </div>

        {/* 右側：歌詞表示 */}
        <div className={styles.lyricsPanel} ref={containerRef}>
          {selectedSong && (
            <audio ref={audioRef} src={selectedSong.audio_url} preload="auto" />
          )}

          <div className={styles.playerControls}>
            <span className={styles.time}>{formatTime(currentTime)}</span>
            <div
              className={styles.progressBar}
              onMouseDown={handleProgressMouseDown}
              role="slider"
              aria-label="再生位置"
              aria-valuemin={0}
              aria-valuemax={selectedSong?.duration ?? 0}
              aria-valuenow={currentTime}
              ref={progressBarRef}
            >
              <div 
                className={styles.progress}
                style={{ width: `${selectedSong ? (currentTime / selectedSong.duration) * 100 : 0}%` }}
              />
            </div>
            <button onClick={togglePlay} className={styles.controlButton}>
              {isPlaying ? '⏸' : '▶️'}
            </button>
            <button 
              onClick={isRecording ? stopRecording : startRecording} 
              className={`${styles.controlButton} ${isRecording ? styles.recording : ''}`}
            >
              {isRecording ? '⏹ 停止' : '⏺ 録音'}
            </button>
          </div>

          <div className={styles.actionControls}>
            <button
              onClick={recordTiming}
              className={styles.actionButton}
              disabled={!isRecording || currentLineIndex >= lyrics.length}
            >
              ⏱ Space/Enter 記録
            </button>
            <button
              onClick={undoTiming}
              className={styles.actionButton}
              disabled={currentLineIndex <= 0}
            >
              ↩ Backspace 1つ戻る
            </button>
          </div>

          <div className={styles.lyricsList}>
            {lyrics.map((line, idx) => (
              <div
                key={idx}
                className={`${styles.lyricLine} ${
                  idx === currentLineIndex ? styles.current : ''
                } ${line.time !== null ? styles.recorded : ''}`}
                onClick={() => line.time !== null && seekTo(line.time)}
              >
                <span className={styles.lineTime}>
                  {line.time !== null ? formatTime(line.time) : '--:--.-'}
                </span>
                <span className={styles.lineText}>{line.text}</span>
              </div>
            ))}
          </div>

          {lyrics.some(l => l.time !== null) && (
            <div className={styles.outputSection}>
              <h3>出力（TypeScript形式）</h3>
              <pre className={styles.output}>{generateOutput()}</pre>
              <button onClick={copyToClipboard} className={styles.button}>
                📋 コピー
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
