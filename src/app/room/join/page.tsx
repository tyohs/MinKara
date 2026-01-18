'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRoomStore, joinRoom, generateUserId } from '@/store/useRoomStore';

export default function JoinRoomPage() {
  const router = useRouter();
  const { setRoomId, setIsHost, setMyUserId, setMyName, myUserId } = useRoomStore();
  
  const [roomCode, setRoomCode] = useState('');
  const [name, setName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate user ID on mount
  useEffect(() => {
    if (!myUserId) {
      const userId = generateUserId();
      setMyUserId(userId);
    }
  }, [myUserId, setMyUserId]);

  const handleJoin = async () => {
    if (!myUserId || !roomCode.trim()) {
      setError('ルームコードを入力してください');
      return;
    }
    
    setIsJoining(true);
    setError(null);

    const displayName = name.trim() || 'ゲスト';
    const normalizedCode = roomCode.trim().toUpperCase();
    
    const success = await joinRoom(normalizedCode, myUserId, displayName);
    
    if (success) {
      setRoomId(normalizedCode);
      setIsHost(false);
      setMyName(displayName);
      router.push(`/room/${normalizedCode}`);
    } else {
      setError('ルームが見つかりません');
    }
    
    setIsJoining(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Warm background */}
      <div className="bg-warm" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="relative z-10 w-full max-w-md">
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => router.push('/')}
          className="absolute -top-16 left-0 flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>戻る</span>
        </motion.button>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="card-warm p-8"
        >
          <h1 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-2">
            ルームに参加
          </h1>
          <p className="text-[var(--text-muted)] text-center text-sm mb-8">
            ルームコードを入力して参加
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-[var(--text-secondary)] text-sm mb-2">
                ルームコード
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="6桁のコードを入力..."
                maxLength={6}
                className="w-full px-4 py-4 rounded-xl bg-white border-2 border-[var(--coral)]/30 text-[var(--text-primary)] text-center text-2xl font-mono font-bold tracking-widest placeholder:text-[var(--text-muted)]/40 placeholder:text-base placeholder:tracking-normal focus:outline-none focus:border-[var(--coral)] transition-colors uppercase"
              />
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] text-sm mb-2">
                あなたの名前（任意）
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="名前を入力..."
                maxLength={20}
                className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[var(--coral)]/30 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--coral)] transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleJoin}
              disabled={isJoining || roomCode.length < 6}
              className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, var(--coral) 0%, var(--peach) 100%)',
                boxShadow: '0 6px 24px rgba(251, 113, 133, 0.3)',
              }}
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  参加中...
                </>
              ) : (
                'ルームに参加'
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
