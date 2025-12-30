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
  const { 
    initRoom, 
    activeRequests, 
    activeCalls, 
    activeMessages, 
    clearRequest,
    gamePhase,
    currentSongId,
    startTime,
    broadcastGameUpdate,
    fetchReservations,
    currentReservation,
    startGame,
    roomId: storedRoomId
  } = useRoomStore();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Derive state from room store
  // Derive state from room store
  const phase = gamePhase;
  const selectedSong = currentReservation 
    ? SONGS.find(s => s.id === currentReservation.song_id) 
    : (currentSongId ? SONGS.find(s => s.id === currentSongId) : null);

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
    fetchReservations();
  }, [roomId, initRoom, fetchReservations]);

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
    broadcastGameUpdate({
      currentSongId: song.id,
      gamePhase: 'ready'
    });
  };

  const handleStart = async () => {
    // Start 3 seconds from now
    const startAt = Date.now() + 3000;
    
    broadcastGameUpdate({
      gamePhase: 'countdown',
      startTime: startAt
    });
  };

  // Handle auto-start based on synchronized startTime
  useEffect(() => {
    if (phase === 'countdown' && startTime) {
      const now = Date.now();
      const delay = Math.max(0, startTime - now);
      
      // Start countdown animation locally
      let count = 3;
      setCountdown(count);
      
      const countInterval = setInterval(() => {
        count--;
        if (count > 0) setCountdown(count);
      }, (delay / 3));

      const timer = setTimeout(async () => {
        clearInterval(countInterval);
        
        // Only the host (singer) triggers the phase change to playing
        // With new logic, broadcastGameUpdate is handled within startGame mainly,
        // but here we might still need to trigger the play phase if using the old flow.
        // For the new reservation flow, startGame() does this.
        // But for compatibility with the countDown effect here, let's keep it.
        broadcastGameUpdate({
          gamePhase: 'playing'
        });

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
  }, [phase, startTime, broadcastGameUpdate]);

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
      broadcastGameUpdate({
        gamePhase: 'song-select',
        currentSongId: undefined // Set to undefined (which will result in null effectively locally) or handle explicit null on store
      });
      // Store accepts string | null, but json payload might drop null keys. 
      // Let's pass empty string if needed or rely on store partial updates.
      // Actually store signature is Partial<{... currentSongId: string ...}>. 
      // Let's cast to any or fix store to accept null in partial.
      // The store definition is: currentSongId: string | null.
      // So Partial allows currentSongId?: string | null.
      broadcastGameUpdate({
        gamePhase: 'song-select',
        currentSongId: '' // Using empty string to represent no song selected if null is tricky
      });
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
            <h1 className="text-2xl font-bold text-white mb-2">🎤 待機中</h1>
            <p className="text-white/50 text-sm">予約されている曲を歌います</p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            {selectedSong ? (
               <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center w-full max-w-md"
              >
                <div className="w-32 h-32 mx-auto bg-white/10 rounded-full flex items-center justify-center text-6xl mb-6">
                  {selectedSong.coverEmoji}
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">{selectedSong.title}</h2>
                <p className="text-white/60 text-xl mb-8">{selectedSong.artist}</p>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => startGame()}
                  className="w-full btn-primary py-4 text-xl shadow-xl shadow-indigo-500/20"
                >
                  🚀 演奏スタート
                </motion.button>
              </motion.div>
            ) : (
              <div className="text-center text-white/40">
                <p className="mb-4 text-6xl">👂</p>
                <p>現在予約されている曲はありません</p>
                <p className="text-sm mt-2">ロビーで曲を予約してください</p>
              </div>
            )}
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
