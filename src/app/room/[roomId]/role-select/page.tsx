'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Piano, Guitar, Drum, Sparkles, Timer, Music, Mic } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRoomStore, fetchParticipants } from '@/store/useRoomStore';
import { getSongById } from '@/data/songs';
import { useGameSession, startRoleSelect, startPlaying } from '@/hooks/useGameSession';
import { useSyncedCountdown } from '@/hooks/useSyncedCountdown';

type Role = 'band' | 'ojama';
type Instrument = 'keyboard' | 'guitar' | 'drums';

const ROLE_SELECT_DURATION = 10; // seconds

const INSTRUMENTS = [
  { id: 'keyboard' as Instrument, name: 'キーボード', Icon: Piano, color: 'from-amber-400 to-yellow-500' },
  { id: 'guitar' as Instrument, name: 'ギター', Icon: Guitar, color: 'from-orange-500 to-red-500' },
  { id: 'drums' as Instrument, name: 'ドラム', Icon: Drum, color: 'from-emerald-500 to-green-600' },
];

export default function RoleSelectPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;
  
  const { myUserId, participants, setParticipants } = useRoomStore();
  
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [hasStartedRoleSelect, setHasStartedRoleSelect] = useState(false);

  // Game session with realtime sync
  const { session } = useGameSession(roomId);
  
  // Synced countdown based on role_select_started_at
  const { remaining: countdown, isComplete } = useSyncedCountdown(
    session?.role_select_started_at || null,
    ROLE_SELECT_DURATION
  );

  const isSinger = session?.singer_id === myUserId;
  const song = session ? getSongById(session.song_id) : null;
  const singerParticipant = participants.find(p => p.user_id === session?.singer_id);

  // Load participants
  useEffect(() => {
    fetchParticipants(roomId).then(setParticipants);
  }, [roomId, setParticipants]);

  // When session arrives and is in countdown status, transition to role_select
  useEffect(() => {
    if (session && session.status === 'countdown' && !hasStartedRoleSelect) {
      setHasStartedRoleSelect(true);
      startRoleSelect(session.id);
    }
  }, [session, hasStartedRoleSelect]);

  // Navigate to game when countdown completes
  useEffect(() => {
    if (isComplete && session) {
      handleStart();
    }
  }, [isComplete, session]);

  const handleStart = async () => {
    if (!myUserId || !session) return;

    // Update participant role in database
    const role = isSinger ? 'singer' : (selectedRole || 'band');
    const instrument = selectedRole === 'band' ? (selectedInstrument || 'keyboard') : null;

    await supabase
      .from('participants')
      .update({ 
        role: role, 
        instrument: instrument 
      })
      .eq('room_id', roomId)
      .eq('user_id', myUserId);

    // Start playing phase (first person to finish triggers this)
    if (session.status === 'role_select') {
      await startPlaying(session.id);
    }

    // Navigate to appropriate screen
    if (isSinger) {
      router.push(`/room/${roomId}/singer`);
    } else if (selectedRole === 'ojama') {
      router.push(`/room/${roomId}/ojama`);
    } else {
      router.push(`/room/${roomId}/band`);
    }
  };

  const displayCountdown = Math.ceil(countdown);

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Warm background */}
      <div className="bg-warm" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        {/* Timer - synchronized */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full shadow-lg"
        >
          <Timer className="w-5 h-5 text-[var(--primary)]" />
          <span className="text-2xl font-mono font-bold text-[var(--text-primary)]">
            {displayCountdown}
          </span>
        </motion.div>

        {/* Song Info */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Music className="w-5 h-5 text-[var(--primary)]" />
            <span className="text-[var(--text-muted)]">Now Playing</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">
            {song?.title || 'Loading...'}
          </h1>
          <p className="text-[var(--text-secondary)]">{song?.artist}</p>
        </motion.div>

        {/* Singer banner */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-2xl text-white mb-8 shadow-lg"
        >
          <Mic className="w-6 h-6" />
          <span className="font-bold text-lg">シンガー: {singerParticipant?.name || 'Loading...'}</span>
          {isSinger && <span className="text-sm opacity-80">(あなた)</span>}
        </motion.div>

        {/* Role Selection (only for non-singers) */}
        {!isSinger ? (
          <div className="w-full max-w-2xl">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-bold text-[var(--text-primary)] text-center mb-6"
            >
              あなたの役割を選んでください
            </motion.h2>

            {/* Role buttons */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <motion.button
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedRole('band')}
                className={`p-6 rounded-2xl text-left transition-all ${
                  selectedRole === 'band'
                    ? 'bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white shadow-lg scale-105'
                    : 'card-warm hover:shadow-lg'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedRole === 'band' ? 'bg-white/20' : 'bg-[var(--primary)]/10'
                  }`}>
                    <Piano className={`w-6 h-6 ${selectedRole === 'band' ? 'text-white' : 'text-[var(--primary)]'}`} />
                  </div>
                  <span className="text-xl font-bold">バンド</span>
                </div>
                <p className={`text-sm ${selectedRole === 'band' ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                  リズムゲームで演奏に参加
                </p>
              </motion.button>

              <motion.button
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedRole('ojama')}
                className={`p-6 rounded-2xl text-left transition-all ${
                  selectedRole === 'ojama'
                    ? 'bg-gradient-to-br from-[var(--coral)] to-[var(--peach)] text-white shadow-lg scale-105'
                    : 'card-warm hover:shadow-lg'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedRole === 'ojama' ? 'bg-white/20' : 'bg-[var(--coral)]/10'
                  }`}>
                    <Sparkles className={`w-6 h-6 ${selectedRole === 'ojama' ? 'text-white' : 'text-[var(--coral)]'}`} />
                  </div>
                  <span className="text-xl font-bold">お邪魔</span>
                </div>
                <p className={`text-sm ${selectedRole === 'ojama' ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                  エフェクトで盛り上げよう
                </p>
              </motion.button>
            </div>

            {/* Instrument selection (when band is selected) */}
            <AnimatePresence>
              {selectedRole === 'band' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <h3 className="text-lg font-bold text-[var(--text-primary)] text-center mb-4">
                    楽器を選択
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {INSTRUMENTS.map((instrument, index) => (
                      <motion.button
                        key={instrument.id}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedInstrument(instrument.id)}
                        className={`p-4 rounded-xl text-center transition-all ${
                          selectedInstrument === instrument.id
                            ? `bg-gradient-to-br ${instrument.color} text-white shadow-lg`
                            : 'card hover:shadow-md'
                        }`}
                      >
                        <instrument.Icon className={`w-8 h-8 mx-auto mb-2 ${
                          selectedInstrument === instrument.id ? 'text-white' : 'text-[var(--text-secondary)]'
                        }`} />
                        <span className={`text-sm font-medium ${
                          selectedInstrument === instrument.id ? 'text-white' : 'text-[var(--text-primary)]'
                        }`}>
                          {instrument.name}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Start button */}
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStart}
              disabled={!selectedRole || (selectedRole === 'band' && !selectedInstrument)}
              className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              準備完了！
            </motion.button>
          </div>
        ) : (
          /* Singer view */
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shadow-2xl">
              <Mic className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              あなたがシンガーです！
            </h2>
            <p className="text-[var(--text-muted)] mb-6">
              他のメンバーが準備完了するまでお待ちください
            </p>
            <div className="text-lg text-[var(--text-secondary)]">
              <span className="font-mono font-bold text-[var(--primary)]">{displayCountdown}</span>秒後に開始
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
