'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';

export default function Home() {
  const router = useRouter();
  const { createRoom, joinRoom } = useGameStore();
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    const roomId = createRoom(name);
    router.push(`/room/${roomId}`);
  };

  const handleJoin = () => {
    if (!name.trim() || !roomCode.trim()) return;
    joinRoom(roomCode.toUpperCase(), name);
    router.push(`/room/${roomCode.toUpperCase()}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-orbs">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <motion.h1 
          className="text-5xl font-bold text-white mb-3"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 3 }}
        >
          🎤 みんカラ
        </motion.h1>
        <p className="text-white/50 text-sm tracking-wider">みんなで作る、みんなのカラオケ</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm"
      >
        {mode === 'home' && (
          <div className="flex flex-col gap-4">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode('create')}
              className="btn-primary text-center"
            >
              ルームを作成
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode('join')}
              className="btn-secondary text-center"
            >
              ルームに参加
            </motion.button>
          </div>
        )}

        {mode === 'create' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-6 text-center">ルームを作成</h2>
            <input
              type="text"
              placeholder="あなたの名前"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input mb-6"
              maxLength={20}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setMode('home')}
                className="btn-secondary flex-1"
              >
                戻る
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="btn-primary flex-1 disabled:opacity-40"
              >
                作成
              </button>
            </div>
          </motion.div>
        )}

        {mode === 'join' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-6 text-center">ルームに参加</h2>
            <input
              type="text"
              placeholder="あなたの名前"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input mb-4"
              maxLength={20}
            />
            <input
              type="text"
              placeholder="ルームコード"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="input mb-6 uppercase tracking-widest text-center text-xl"
              maxLength={6}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setMode('home')}
                className="btn-secondary flex-1"
              >
                戻る
              </button>
              <button
                onClick={handleJoin}
                disabled={!name.trim() || !roomCode.trim()}
                className="btn-primary flex-1 disabled:opacity-40"
              >
                参加
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Feature indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-20 flex gap-12 text-center"
      >
        {[
          { emoji: '🥁', label: 'ドラム' },
          { emoji: '🎸', label: 'ギター' },
          { emoji: '🎹', label: 'キーボード' },
        ].map((item, i) => (
          <motion.div 
            key={item.label}
            className="text-white/40"
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
          >
            <span className="text-2xl block mb-2">{item.emoji}</span>
            <span className="text-xs">{item.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </main>
  );
}
