'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRoomStore, createRoom, generateUserId, joinRoom } from '@/store/useRoomStore';

export default function CreateRoomPage() {
  const router = useRouter();
  const { setRoomId, setMyUserId, setMyName, myUserId } = useRoomStore();
  
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate user ID on mount
  useEffect(() => {
    if (!myUserId) {
      const userId = generateUserId();
      setMyUserId(userId);
    }
  }, [myUserId, setMyUserId]);

  const handleCreate = async () => {
    if (!myUserId) return;
    
    setIsCreating(true);
    setError(null);

    const newRoomId = await createRoom(myUserId);
    
    if (newRoomId) {
      setRoomId(newRoomId);
      
      // Immediately join room and go to denmoku
      const displayName = name.trim() || 'ゲスト';
      setMyName(displayName);
      
      const success = await joinRoom(newRoomId, myUserId, displayName);
      if (success) {
        router.push(`/room/${newRoomId}`);
      } else {
        setError('ルームへの参加に失敗しました');
        setIsCreating(false);
      }
    } else {
      setError('ルームの作成に失敗しました');
      setIsCreating(false);
    }
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
            ルームを作成
          </h1>
          <p className="text-[var(--text-muted)] text-center text-sm mb-8">
            新しいルームを作成してみんなで楽しもう
          </p>

          <div className="space-y-6">
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
                className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[var(--primary-light)]/30 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreate}
              disabled={isCreating}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  作成中...
                </>
              ) : (
                'ルームを作成'
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
