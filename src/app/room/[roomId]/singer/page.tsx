'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mic, Music } from 'lucide-react';
import { useGameSession } from '@/hooks/useGameSession';
import { useSyncedAudio } from '@/hooks/useSyncedAudio';
import { getSongById } from '@/data/songs';

export default function SingerPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  
  const { session } = useGameSession(roomId);

  // Get song data
  const song = session ? getSongById(session.song_id) : null;
  
  // Audio sync hook
  const audioRef = useSyncedAudio(
    session?.song_started_at || null, 
    song?.audio_url || ''
  );

  // Logic to handle game end (auto-redirect when audio ends)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      // Small delay before going back
      setTimeout(() => {
        router.push(`/room/${roomId}`);
      }, 3000);
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [session?.song_started_at, song?.audio_url, roomId, router]);

  if (!session || !song) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xl">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center text-white bg-black">
      {/* Background with simple pulse effect based on BPM if we had it synced, generic for now */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 opacity-50" />
      
      {/* Hidden audio element */}
      <audio ref={audioRef} src={song.audio_url} preload="auto" />

      {/* Main Content */}
      <div className="relative z-10 text-center space-y-8 p-6 max-w-4xl w-full">
        
        {/* Singer Badge */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mx-auto"
        >
          <Mic className="w-5 h-5 text-pink-500" />
          <span className="text-sm font-medium">あなたがシンガーです</span>
        </motion.div>

        {/* Song Info */}
        <div className="space-y-4">
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400"
          >
            {song.title}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-300"
          >
            {song.artist}
          </motion.p>
        </div>

        {/* Visualizer Placeholder / Disc Animation */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="relative w-64 h-64 mx-auto my-12"
        >
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="w-full h-full rounded-full bg-black border-4 border-gray-800 flex items-center justify-center shadow-2xl shadow-purple-500/20"
          >
            <div className="absolute inset-0 rounded-full border border-white/10" />
            <div className="absolute inset-[20%] rounded-full border border-white/5" />
            <div className="absolute inset-[40%] rounded-full border border-white/5" />
            <Music className="w-20 h-20 text-gray-700" />
          </motion.div>
          
          {/* Pulsing glow */}
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 60 / song.bpm, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-purple-500/30 blur-xl -z-10"
          />
        </motion.div>

        {/* Lyrics Placeholder */}
        <div className="h-32 flex items-center justify-center">
          <p className="text-2xl font-light text-white/80 italic">
            ♪ 歌詞表示エリア (Coming Soon) ♪
          </p>
        </div>
      </div>
    </main>
  );
}
