'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore } from '@/store/roomStore';
import ExcitementGauge from '@/components/ExcitementGauge';
import PenLight from '@/components/PenLight';
import CallButton, { CALL_PRESETS } from '@/components/CallButton';
import { FansaButton } from '@/components/FansaButton';
import { FansaType } from '@/types';

export default function AudiencePage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const { room, addScore, sendFansaRequest, updateExcitement } = useGameStore();
  const { initRoom, broadcastMessage, broadcastCall } = useRoomStore();
  const [score, setScore] = useState(0);
  const [customMessage, setCustomMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  // Initialize room connection
  useEffect(() => {
    initRoom(roomId, 'オーディエンス', 'audience');
  }, [roomId, initRoom]);

  // 盛り上がりの自動増加（デモ用）
  useEffect(() => {
    const interval = setInterval(() => {
      updateExcitement(1);
    }, 5000);
    return () => clearInterval(interval);
  }, [updateExcitement]);

  // 60秒後に自動でゲーム終了（デモ用）
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(`/room/${roomId}/result`);
    }, 60000);
    return () => clearTimeout(timer);
  }, [router, roomId]);

  const handleSwing = (intensity: number) => {
    const points = Math.floor(intensity / 10);
    addScore(points);
    setScore(prev => prev + points);
  };

  const handleCall = (callText: string, callEmoji: string) => {
    addScore(50);
    setScore(prev => prev + 50);
    updateExcitement(5);
    // Broadcast to singer
    broadcastCall(callText, callEmoji);
  };

  const handleFansaRequest = (type: FansaType) => {
    sendFansaRequest(type);
    updateExcitement(10);
  };

  const handleSendMessage = () => {
    if (customMessage.trim()) {
      broadcastMessage(customMessage.trim());
      setCustomMessage('');
      setShowMessageInput(false);
      setMessageSent(true);
      setTimeout(() => setMessageSent(false), 2000);
    }
  };

  const excitement = room?.excitementGauge || 0;

  return (
    <main className="min-h-screen flex flex-col p-4 relative">
      {/* Message sent notification */}
      <AnimatePresence>
        {messageSent && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500/80 text-white px-4 py-2 rounded-full text-sm z-50"
          >
            ✓ メッセージを送信しました
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="text-white/60 text-xs">ROOM</span>
          <span className="text-white font-bold ml-2">{roomId}</span>
        </div>
        <div className="text-right">
          <span className="text-white/60 text-xs">SCORE</span>
          <motion.span 
            key={score}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-white font-bold text-xl ml-2"
          >
            {score.toLocaleString()}
          </motion.span>
        </div>
      </div>

      {/* Excitement Gauge */}
      <div className="mb-6">
        <ExcitementGauge value={excitement} />
      </div>

      {/* PenLight */}
      <div className="flex-1 flex items-center justify-center mb-6">
        <PenLight onSwing={handleSwing} />
      </div>

      {/* Call Buttons */}
      <div className="mb-6">
        <h3 className="text-white font-bold mb-3">📢 コール</h3>
        <div className="flex gap-2 justify-center flex-wrap">
          {CALL_PRESETS.map((call) => (
            <CallButton
              key={call.text}
              text={call.text}
              emoji={call.emoji}
              onCall={() => handleCall(call.text, call.emoji)}
              isActive={true}
            />
          ))}
        </div>
      </div>

      {/* Custom Message Section */}
      <div className="mb-6">
        <h3 className="text-white font-bold mb-3">✉️ メッセージ</h3>
        <AnimatePresence mode="wait">
          {showMessageInput ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="歌手に送るメッセージ..."
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-purple-400"
                maxLength={50}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!customMessage.trim()}
                className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                送信
              </button>
              <button
                onClick={() => setShowMessageInput(false)}
                className="text-white/40 px-3"
              >
                ✕
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowMessageInput(true)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white/60 text-left hover:bg-white/15 transition-colors"
            >
              💬 タップしてメッセージを入力...
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Fansa Buttons */}
      <div className="mb-4">
        <h3 className="text-white font-bold mb-3">💕 ファンサお願い</h3>
        <div className="flex gap-2 justify-center flex-wrap">
          {(['heart', 'wave', 'peace'] as FansaType[]).map((type) => (
            <FansaButton
              key={type}
              type={type}
              onRequest={handleFansaRequest}
              disabled={false}
              canRequest={true}
              currentScore={score}
              requiredScore={0}
            />
          ))}
        </div>
      </div>

      {/* End button */}
      <button
        onClick={() => router.push(`/room/${roomId}/result`)}
        className="text-white/60 text-sm text-center py-2"
      >
        ゲームを終了する
      </button>
    </main>
  );
}
