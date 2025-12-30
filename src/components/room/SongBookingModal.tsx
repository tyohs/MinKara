'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SONGS } from '@/data/songs';
import { useRoomStore } from '@/store/roomStore';

interface SongBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SongBookingModal({ isOpen, onClose }: SongBookingModalProps) {
  const { addReservation } = useRoomStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSongs = SONGS.filter(song => 
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBook = async (songId: string) => {
    await addReservation(songId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-x-0 bottom-0 top-[10vh] bg-[#1a1b2e] rounded-t-3xl z-50 overflow-hidden flex flex-col border-t border-white/10"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">曲を予約する</h2>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-white/60"
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="p-4">
              <input
                type="text"
                placeholder="曲名、アーティスト名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Song List */}
            <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-3 pb-24">
              {filteredSongs.map(song => (
                <button
                  key={song.id}
                  onClick={() => handleBook(song.id)}
                  className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/5 p-4 rounded-xl transition-all flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center text-xl">
                    {song.coverEmoji || '🎵'}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold group-hover:text-indigo-400 transition-colors">
                      {song.title}
                    </h3>
                    <p className="text-white/50 text-sm">
                      {song.artist}
                    </p>
                  </div>
                  <div className="bg-white/10 px-3 py-1 rounded-full text-xs text-white/70 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    予約
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
