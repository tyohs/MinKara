'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore, SyncEvent } from '@/store/roomStore';
import ExcitementGauge from '@/components/ExcitementGauge';
import LyricsDisplay from '@/components/LyricsDisplay';
import { FansaRequestDisplay } from '@/components/FansaButton';
import { FansaType } from '@/types';
import { SONGS, Song } from '@/data/songs';

interface FansaRequestState {
  type: FansaType;
  fromName: string;
  completed: boolean;
  id: string;
  emoji?: string;
  text?: string;
}

type GamePhase = 'song-select' | 'ready' | 'countdown' | 'playing';

export default function SingerPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;
  
  const { room, updateExcitement, endGame: endGameStore } = useGameStore();
  const { initRoom, activeRequests, activeCalls, activeMessages, clearRequest } = useRoomStore();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [phase, setPhase] = useState<GamePhase>('song-select');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [currentTime, setCurrentTime] = useState(0);
  const [fansaRequests, setFansaRequests] = useState<FansaRequestState[]>([]);
  const [audienceCount] = useState(3 + Math.floor(Math.random() * 3));
  const [completedCount, setCompletedCount] = useState(0);
  const [showCallEffect, setShowCallEffect] = useState<SyncEvent | null>(null);
  const [displayedMessages, setDisplayedMessages] = useState<SyncEvent[]>([]);

  // Initialize room connection
  useEffect(() => {
    initRoom(roomId, 'シンガー', 'singer');
  }, [roomId, initRoom]);

  // Handle incoming requests from band members
  useEffect(() => {
    activeRequests.forEach(request => {
      const existingIds = fansaRequests.map(r => r.id);
      const newId = `sync-${request.timestamp}`;
      
      if (!existingIds.includes(newId)) {
        setFansaRequests(prev => [...prev, {
          type: 'wave' as FansaType,
          fromName: request.playerName,
          completed: false,
          id: newId,
          emoji: request.data.emoji as string,
          text: request.data.text as string,
        }]);
        updateExcitement(15);
      }
    });
  }, [activeRequests, fansaRequests, updateExcitement]);

  // Handle incoming calls - show effect
  useEffect(() => {
    if (activeCalls.length > 0) {
      const latestCall = activeCalls[activeCalls.length - 1];
      setShowCallEffect(latestCall);
      updateExcitement(5);
      
      setTimeout(() => setShowCallEffect(null), 2000);
    }
  }, [activeCalls, updateExcitement]);

  // Handle incoming messages
  useEffect(() => {
    activeMessages.forEach(msg => {
      const existingIds = displayedMessages.map(m => m.timestamp);
      if (!existingIds.includes(msg.timestamp)) {
        setDisplayedMessages(prev => [...prev, msg]);
        updateExcitement(3);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
          setDisplayedMessages(prev => prev.filter(m => m.timestamp !== msg.timestamp));
        }, 5000);
      }
    });
  }, [activeMessages, displayedMessages, updateExcitement]);

  const handleSongSelect = (song: Song) => {
    setSelectedSong(song);
    setPhase('ready');
  };

  const handleStart = async () => {
    setPhase('countdown');
    
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setPhase('playing');
    
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      try {
        await audioRef.current.play();
      } catch (e) {
        console.error('Audio playback failed:', e);
      }
    }
  };

  useEffect(() => {
    if (phase !== 'playing') return;

    const interval = setInterval(() => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;

    const interval = setInterval(() => {
      updateExcitement(2);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [phase, updateExcitement]);

  const handleCompleteFansa = (id: string) => {
    setFansaRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, completed: true } : req))
    );
    setCompletedCount((prev) => prev + 1);
    updateExcitement(10);
    
    // Clear from room store if it's a synced request
    if (id.startsWith('sync-')) {
      const timestamp = parseInt(id.replace('sync-', ''));
      clearRequest(timestamp);
    }
  };

  const handleFinish = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    endGameStore();
    router.push(`/room/${roomId}/result`);
  };

  const handleBack = () => {
    if (phase === 'ready') {
      setPhase('song-select');
    } else {
      router.push(`/room/${roomId}`);
    }
  };

  const excitement = room?.excitementGauge || 0;
  const pendingRequests = fansaRequests.filter((r) => !r.completed);

  return (
    <main className="min-h-screen flex flex-col relative">
      {/* Audio element */}
      {selectedSong && (
        <audio 
          ref={audioRef} 
          src={selectedSong.audioUrl} 
          preload="auto"
          onEnded={handleFinish}
        />
      )}

      {/* Call Effect Overlay */}
      <AnimatePresence>
        {showCallEffect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="text-center bg-purple-600/80 backdrop-blur-md px-8 py-4 rounded-2xl"
            >
              <span className="text-5xl block mb-2">{showCallEffect.data.emoji as string}</span>
              <span className="text-2xl font-bold text-white block">{showCallEffect.data.text as string}</span>
              <span className="text-white/60 text-sm">from {showCallEffect.playerName}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flowing Messages */}
      <div className="absolute top-20 left-0 right-0 z-40 pointer-events-none overflow-hidden h-32">
        <AnimatePresence>
          {displayedMessages.map((msg, index) => (
            <motion.div
              key={msg.timestamp}
              initial={{ opacity: 0, x: -100 }}
              animate={{ 
                opacity: 1, 
                x: '100vw',
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 5, ease: 'linear' }}
              className="absolute whitespace-nowrap"
              style={{ 
                top: `${(index % 3) * 36}px`,
              }}
            >
              <span className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm">
                💬 {msg.data.text as string}
                <span className="text-white/60 ml-2 text-xs">- {msg.playerName}</span>
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Song Selection */}
      {phase === 'song-select' && (
        <div className="flex-1 flex flex-col p-6 bg-orbs">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">🎤 曲を選択</h1>
            <p className="text-white/50 text-sm">歌いたい曲を選んでください</p>
          </div>

          <div className="space-y-4">
            {SONGS.map((song, index) => (
              <motion.button
                key={song.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSongSelect(song)}
                className="w-full p-5 rounded-2xl backdrop-blur-md bg-white/8 border border-white/15 hover:bg-white/15 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{song.coverEmoji}</span>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg">{song.title}</h3>
                    <p className="text-white/50 text-sm">{song.artist}</p>
                    <div className="flex gap-3 mt-1 text-xs text-white/40">
                      <span>BPM {song.bpm}</span>
                      <span>•</span>
                      <span>{song.genre}</span>
                    </div>
                  </div>
                  <div className="text-white/30 text-2xl">→</div>
                </div>
              </motion.button>
            ))}
          </div>

          <button
            onClick={() => router.push(`/room/${roomId}`)}
            className="mt-auto text-white/40 text-sm text-center py-4"
          >
            ← 戻る
          </button>
        </div>
      )}

      {/* Ready Phase */}
      {phase === 'ready' && selectedSong && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-orbs">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <span className="text-8xl block mb-4">{selectedSong.coverEmoji}</span>
            <h1 className="text-3xl font-bold text-white mb-2">{selectedSong.title}</h1>
            <p className="text-white/60 mb-8">{selectedSong.artist}</p>
            
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleStart}
              className="btn-primary px-8 py-4 text-xl"
            >
              🎤 歌い始める
            </motion.button>
            
            <button
              onClick={handleBack}
              className="block text-white/40 text-sm mt-4 mx-auto"
            >
              ← 曲選択に戻る
            </button>
          </motion.div>
        </div>
      )}

      {/* Countdown Phase */}
      {phase === 'countdown' && selectedSong && (
        <div className="flex-1 flex items-center justify-center bg-orbs">
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
            <motion.span
              className="text-9xl font-bold gradient-text"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
            >
              {countdown}
            </motion.span>
            <p className="text-white/60 text-xl mt-4">歌う準備はいい？</p>
          </motion.div>
        </div>
      )}

      {/* Playing Phase */}
      {phase === 'playing' && selectedSong && (
        <div className="flex-1 flex flex-col p-4 bg-orbs">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-white/60 text-xs">ROOM</span>
              <span className="text-white font-bold ml-2">{roomId}</span>
            </div>
            <button
              onClick={handleFinish}
              className="text-white/60 text-sm px-3 py-1 rounded-full bg-white/10"
            >
              終了する
            </button>
          </div>

          {/* Excitement Gauge */}
          <div className="mb-4">
            <ExcitementGauge value={excitement} />
          </div>

          {/* Song Title */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-4"
          >
            <span className="text-3xl mr-2">{selectedSong.coverEmoji}</span>
            <span className="text-white font-bold text-xl">{selectedSong.title}</span>
          </motion.div>

          {/* Lyrics Display */}
          <div className="mb-6">
            <LyricsDisplay 
              lyrics={selectedSong.lyrics} 
              currentTime={currentTime}
            />
          </div>

          {/* Audience Status */}
          <div className="glass-card p-4 mb-4">
            <h3 className="text-white font-bold mb-3">🔦 観客の様子</h3>
            <div className="flex items-center justify-center gap-2 mb-2">
              {Array.from({ length: audienceCount }).map((_, i) => (
                <motion.span
                  key={i}
                  animate={{
                    y: [0, -5, 0],
                    rotate: [-10, 10, -10],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.5,
                    delay: i * 0.1,
                  }}
                  className="text-2xl"
                >
                  🔦
                </motion.span>
              ))}
            </div>
            <p className="text-center text-white/60 text-sm">
              {audienceCount}人が盛り上がっています！
            </p>
          </div>

          {/* Fansa Requests - Now includes synced requests */}
          <div className="flex-1">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              💕 ファンサーリクエスト
              {pendingRequests.length > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full"
                >
                  {pendingRequests.length}
                </motion.span>
              )}
            </h3>

            <AnimatePresence>
              {fansaRequests.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-white/40 py-4"
                >
                  <p>リクエストを待っています...</p>
                  <p className="text-xs mt-1">バンドメンバーからのリクエストがここに表示されます</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {fansaRequests.slice(-5).map((request) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      {request.emoji ? (
                        // Custom request from band
                        <div 
                          className={`p-4 rounded-xl border ${
                            request.completed 
                              ? 'bg-green-500/20 border-green-500/30' 
                              : 'bg-yellow-500/20 border-yellow-500/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{request.emoji}</span>
                              <div>
                                <span className="text-white font-bold">{request.text}</span>
                                <p className="text-white/60 text-sm">from {request.fromName}</p>
                              </div>
                            </div>
                            {!request.completed && (
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleCompleteFansa(request.id)}
                                className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold"
                              >
                                OK！
                              </motion.button>
                            )}
                            {request.completed && (
                              <span className="text-green-400 text-2xl">✓</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        // Standard fansa request
                        <FansaRequestDisplay
                          type={request.type}
                          fromName={request.fromName}
                          completed={request.completed}
                          onComplete={() => handleCompleteFansa(request.id)}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Stats */}
          <div className="glass-card p-4 mt-4">
            <div className="flex justify-around text-center">
              <div>
                <span className="text-2xl font-bold text-white">{completedCount}</span>
                <p className="text-white/60 text-xs">ファンサ達成</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-white">{fansaRequests.length}</span>
                <p className="text-white/60 text-xs">リクエスト</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
