'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { InstrumentType, INSTRUMENT_INFO } from '@/types';
import { SONGS, Song } from '@/data/songs';
import { getChart, Difficulty } from '@/data/charts';
import { useRoomStore } from '@/store/roomStore';
import InstrumentSelect from '@/components/InstrumentSelect';
import BandGame from '@/components/BandGame';

type GamePhase = 'song-select' | 'instrument-select' | 'countdown' | 'playing' | 'finished';

export default function BandPlayPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const { 
    initRoom, 
    gamePhase, 
    currentSongId, 
    startTime,
    activeRequests, 
    activeCalls 
  } = useRoomStore();

  // Derive state from room store
  const selectedSong = SONGS.find(s => s.id === currentSongId) || null;
  const isReady = useRoomStore(s => s.isConnected); // Check connection

  // Local state for instrument selection and temporary waiting state
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [mvUrl, setMvUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const difficulty: Difficulty = 'easy';

  // Join room on mount to receive song updates
  useEffect(() => {
    initRoom(roomId, 'バンドメンバー', 'band');
  }, [roomId, initRoom]);

  // Determine local UI phase based on shared gamePhase and local selection
  const getUiPhase = (): GamePhase => {
    if (gamePhase === 'song-select') return 'song-select';
    if (gamePhase === 'ready') return 'instrument-select'; // Show instrument select when song is ready
    if (gamePhase === 'countdown') return 'countdown';
    if (gamePhase === 'playing') return 'playing';
    if (gamePhase === 'finished') return 'finished';
    return 'song-select';
  };
  
  const uiPhase = getUiPhase();

  const handleMvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setMvUrl(url);
    }
  };

  const handleRemoveMv = () => {
    if (mvUrl) {
      URL.revokeObjectURL(mvUrl);
      setMvUrl(null);
    }
  };

  const handleInstrumentSelect = async (instrument: InstrumentType) => {
    setSelectedInstrument(instrument);
    
    // Update room presence with instrument info
    // Re-initializing room with instrument info. 
    // In a better implementation, we would have a dedicated updatePlayerInfo action.
    useRoomStore.getState().initRoom(roomId, INSTRUMENT_INFO[instrument].label, 'band', instrument);
    
    // We don't advance phase manually, we wait for singer to start (gamePhase -> countdown)
  };

  // Handle countdown sync
  useEffect(() => {
    if (uiPhase === 'countdown' && startTime) {
      const now = Date.now();
      const delay = Math.max(0, startTime - now);
      
      let count = 3;
      setCountdown(count);
        
      const countInterval = setInterval(() => {
        count--;
        if (count > 0) setCountdown(count);
      }, (delay / 3));

      const timer = setTimeout(async () => {
        clearInterval(countInterval);
        
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          try {
            await audioRef.current.play();
          } catch (e) {
            console.error('Audio playback failed:', e);
          }
        }
      }, delay);

      return () => {
        clearTimeout(timer);
        clearInterval(countInterval);
      };
    }
  }, [uiPhase, startTime]);

  const handleScoreUpdate = useCallback((newScore: number) => {
    setScore(newScore);
  }, []);

  const handleGameEnd = useCallback(() => {
    // Phase will be updated by singer broadcasting 'finished' or we just show result locally
    // For now, let's keep local transition to result screen
    setTimeout(() => {
      router.push(`/room/${roomId}/result?score=${score}&instrument=${selectedInstrument}&song=${selectedSong?.title}`);
    }, 2000);
  }, [router, roomId, score, selectedInstrument, selectedSong]);

  const handleBack = () => {
     // No manual back navigation for now as phase is controlled by singer
  };

  const chart = selectedSong && selectedInstrument 
    ? getChart(selectedSong.id, selectedInstrument, difficulty) 
    : null;

  return (
    <main className="h-screen flex flex-col bg-orbs">
      {/* Audio element */}
      {selectedSong && (
        <audio 
          ref={audioRef} 
          src={selectedSong.audioUrl} 
          preload="auto"
          onEnded={handleGameEnd}
        />
      )}

      {/* Hidden file input for MV */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/*"
        onChange={handleMvUpload}
        className="hidden"
      />

      {/* Song Selection */}
      {uiPhase === 'song-select' && (
        <div className="flex-1 flex flex-col p-6 overflow-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">曲を選択</h1>
            <p className="text-white/50 text-sm">演奏したい曲を選んでください</p>
          </div>

          <div className="space-y-4">
             {/* Show message instead of song list */}
             <div className="text-center py-10">
               <div className="text-6xl mb-4">🎤</div>
               <p className="text-white/60">シンガーが選曲中です...</p>
             </div>
          </div>

          <button
            onClick={() => router.push(`/room/${roomId}`)}
            className="mt-auto text-white/40 text-sm text-center py-4"
          >
            ← 戻る
          </button>
        </div>
      )}

      {/* Instrument Selection */}
      {uiPhase === 'instrument-select' && (
        <InstrumentSelect 
          onSelect={handleInstrumentSelect}
          onBack={handleBack}
        />
      )}

      {/* Countdown */}
      {uiPhase === 'countdown' && selectedInstrument && selectedSong && (
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            key={countdown}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="mb-4">
              <span className="text-3xl">{selectedSong.coverEmoji}</span>
              <span className="text-white/60 text-sm ml-2">{selectedSong.title}</span>
            </div>
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6"
              style={{ backgroundColor: `${INSTRUMENT_INFO[selectedInstrument].color}20` }}
            >
              {INSTRUMENT_INFO[selectedInstrument].emoji}
            </div>
            <motion.span
              className="text-8xl font-bold text-white block"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5 }}
            >
              {countdown}
            </motion.span>
            <p className="text-white/50 mt-4">
              {INSTRUMENT_INFO[selectedInstrument].label}で演奏開始
            </p>
            {mvUrl && (
              <p className="text-purple-400/60 text-sm mt-2">🎬 MV付き</p>
            )}
          </motion.div>
        </div>
      )}

      {/* Countdown without instrument - show waiting */}
      {uiPhase === 'countdown' && !selectedInstrument && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🎸</div>
            <h2 className="text-2xl font-bold text-white mb-2">演奏が始まります！</h2>
            <p className="text-white/60">楽器を選んで参加してください</p>
            <div className="mt-6">
              <InstrumentSelect 
                onSelect={handleInstrumentSelect}
                onBack={() => {}}
              />
            </div>
          </div>
        </div>
      )}

      {/* Playing */}
      {uiPhase === 'playing' && selectedInstrument && chart && (
        <div className="relative flex-1">
          <BandGame 
            chart={chart}
            instrument={selectedInstrument}
            audioRef={audioRef}
            mvUrl={mvUrl}
            onScoreUpdate={handleScoreUpdate}
            onGameEnd={handleGameEnd}
          />
          {/* Pause/Rest Button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedInstrument(null)}
            className="absolute top-4 right-4 z-50 bg-black/40 backdrop-blur-md text-white/80 px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 hover:bg-black/60 transition-colors"
          >
            <span>☕</span> 休憩する
          </motion.button>
        </div>
      )}

      {/* Playing without instrument - spectator mode */}
      {uiPhase === 'playing' && (!selectedInstrument || !chart) && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-orbs relative">
          
          {/* Main Spectator UI */}
          <div className="text-center z-10">
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-6xl mb-4"
            >
              🎤
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">演奏中...</h2>
            {selectedSong && (
              <p className="text-white/60 mb-8">
                {selectedSong.coverEmoji} {selectedSong.title}
              </p>
            )}
            
            {/* Join Band Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                // Return to instrument selection or open modal
                // Ideally, we show instrument select directly here or navigate back.
                // Since this is a temporary state during 'playing', we can just show a modal or conditional render.
                // For simplicity, let's just toggle a local 'isJoining' state or set a flag? 
                // Actually, let's just toggle UI phase locally to 'instrument-select' OVERRIDE?
                // No, uiPhase is derived.
                // Easier: render InstrumentSelect right here if they want to join.
              }}
              className="hidden" // Placeholder logic
            />

            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 max-w-sm mx-auto">
               <h3 className="text-white font-bold mb-4">バンドに参加する？</h3>
               <div className="grid grid-cols-2 gap-3">
                 {(Object.keys(INSTRUMENT_INFO) as InstrumentType[]).map((inst) => (
                   <button
                     key={inst}
                     onClick={() => handleInstrumentSelect(inst)}
                     className="flex flex-col items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                   >
                     <span className="text-2xl mb-1">{INSTRUMENT_INFO[inst].emoji}</span>
                     <span className="text-xs text-white/70">{INSTRUMENT_INFO[inst].label}</span>
                   </button>
                 ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Finished */}
      {uiPhase === 'finished' && (
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <span className="text-5xl block mb-6">🎉</span>
            <h1 className="text-3xl font-bold text-white mb-4">演奏完了</h1>
            <p className="text-white/60 text-lg mb-2">
              スコア: <span className="font-bold text-white">{score.toLocaleString()}</span>
            </p>
            <p className="text-white/40 text-sm">結果を確認中...</p>
          </motion.div>
        </div>
      )}
    </main>
  );
}
