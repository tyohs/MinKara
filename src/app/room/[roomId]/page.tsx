'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { useRoomStore } from '@/store/roomStore';
import ReservationList from '@/components/room/ReservationList';
import SongBookingModal from '@/components/room/SongBookingModal';
import { SONGS } from '@/data/songs';

export default function RoomLobbyPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { initRoom, players, currentReservation, gamePhase } = useRoomStore();
  const [isBookingModalOpen, setBookingModalOpen] = useState(false);

  // Initialize room connection on mount
  useEffect(() => {
    // Default role 'audience' for lobby visitors until they choose otherwise
    const name = localStorage.getItem('minKaraName') || 'Guest-' + Math.floor(Math.random() * 1000);
    initRoom(roomId, name, 'audience');
  }, [roomId, initRoom]);

  // Find current song details if playing
  const currentSong = currentReservation 
    ? SONGS.find(s => s.id === currentReservation.song_id) 
    : null;

  return (
    <main className="min-h-screen flex flex-col p-6 bg-orbs pb-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <p className="text-white/40 text-xs uppercase tracking-wider">ROOM</p>
          <h1 className="text-2xl font-bold text-white tracking-widest">{roomId}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-white/60 text-xs">{players.length} Online</span>
        </div>
      </motion.div>

      {/* Current Status Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-8"
      >
        {currentReservation && currentSong ? (
          <div className="glass-card p-6 border-l-4 border-indigo-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl transform translate-x-10 -translate-y-10">
              🎤
            </div>
            <div className="relative z-10">
              <span className="inline-block px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs font-bold mb-3">
                NOW PLAYING
              </span>
              <h2 className="text-3xl font-bold text-white mb-1 leading-tight">
                {currentSong.title}
              </h2>
              <p className="text-white/60 text-lg mb-4">{currentSong.artist}</p>
              
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <span>🎤 Singer:</span>
                <span className="text-white font-medium">{currentReservation.user_name}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card p-8 text-center flex flex-col items-center justify-center min-h-[160px]">
            <div className="text-4xl mb-4 opacity-50">🎵</div>
            <h2 className="text-xl font-bold text-white mb-2">演奏待機中</h2>
            <p className="text-white/40 text-sm">
              曲を予約してカラオケを始めよう！
            </p>
          </div>
        )}
      </motion.div>

      {/* Reservation Queue */}
      <div className="mb-20">
         <ReservationList />
      </div>

      {/* Floating Action Button for Booking */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setBookingModalOpen(true)}
        className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center text-3xl z-40 border border-white/20"
      >
        🎤
      </motion.button>

      {/* Booking Modal */}
      <SongBookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => setBookingModalOpen(false)} 
      />
    </main>
  );
}
