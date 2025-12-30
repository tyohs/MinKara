'use client';

import { useRoomStore } from '@/store/roomStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function ReservationList() {
  const { queue, players } = useRoomStore();

  return (
    <div className="glass-card p-5 w-full">
      <h3 className="text-white/60 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
        <span>📋</span> 予約リスト
      </h3>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {queue.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-4 text-white/30 text-sm"
            >
              予約されている曲はありません
            </motion.div>
          ) : (
            queue.map((reservation, index) => (
              <motion.div
                key={reservation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/70">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate text-sm">
                    {reservation.song_title || 'Unknown Song'}
                  </p>
                  <p className="text-white/40 text-xs truncate">
                    予約: {reservation.user_name || 'Unknown User'}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
