'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, Plus, LogIn, Sparkles } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Warm background */}
      <div className="bg-warm" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-16"
        >
          <div className="relative inline-block">
            <motion.h1 
              className="text-6xl font-black tracking-tight title-warm"
            >
              MinKara
            </motion.h1>
            <motion.div
              className="absolute -top-2 -right-2"
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-6 h-6 text-[var(--accent)]" />
            </motion.div>
          </div>
          <p className="text-[var(--text-secondary)] text-sm tracking-widest uppercase mt-3">
            みんなで楽しむカラオケ
          </p>
        </motion.div>

        {/* Action buttons */}
        <div className="space-y-4">
          <motion.button
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/room/create')}
            className="w-full py-5 px-6 card-warm flex items-center gap-4 transition-all border-2 border-transparent hover:border-[var(--primary)]/30"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <span className="block text-[var(--text-primary)] font-bold text-lg">ルームを作成</span>
              <span className="block text-[var(--text-muted)] text-sm">新しいルームを作成してホストになる</span>
            </div>
          </motion.button>

          <motion.button
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/room/join')}
            className="w-full py-5 px-6 card-warm flex items-center gap-4 transition-all border-2 border-transparent hover:border-[var(--coral)]/30"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--coral)] to-[var(--peach)] flex items-center justify-center">
              <LogIn className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <span className="block text-[var(--text-primary)] font-bold text-lg">ルームに参加</span>
              <span className="block text-[var(--text-muted)] text-sm">ルームコードで既存のルームに参加</span>
            </div>
          </motion.button>
        </div>

        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-[var(--text-muted)] text-sm">
            <Users className="w-4 h-4" />
            <span>3〜10人でプレイ</span>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
