'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Users, Copy, Check, Music, LogOut, 
  Plus, Trash2, Dices, Search, X, Timer
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRoomStore, fetchParticipants, leaveRoom } from '@/store/useRoomStore';
import { GENRES, filterSongs, getSongById } from '@/data/songs';
import { useGameSession, createGameSession } from '@/hooks/useGameSession';
import { useDisplayCountdown } from '@/hooks/useSyncedCountdown';
import type { Participant, Reservation, Song } from '@/types';

const COUNTDOWN_DURATION = 5; // seconds before role select

export default function DenmokuPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;
  
  const { 
    myUserId, 
    participants, setParticipants, 
    setRoomId, reset 
  } = useRoomStore();
  
  const [copied, setCopied] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);

  // Game session hook
  const { session } = useGameSession(roomId);
  
  // Synced countdown (only active when session is in countdown)
  const countdownRemaining = useDisplayCountdown(
    session?.status === 'countdown' ? session.countdown_started_at : null,
    COUNTDOWN_DURATION
  );

  const loadRoomData = useCallback(async () => {
    const participantList = await fetchParticipants(roomId);
    setParticipants(participantList);
  }, [roomId, setParticipants]);

  const loadReservations = useCallback(async () => {
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('room_id', roomId)
      .order('order', { ascending: true });
    
    if (data) {
      setReservations(data);
    }
  }, [roomId]);

  useEffect(() => {
    setRoomId(roomId);
    loadRoomData();
    loadReservations();
  }, [roomId, setRoomId, loadRoomData, loadReservations]);

  // Navigate to role select when countdown finishes
  useEffect(() => {
    if (session?.status === 'countdown' && countdownRemaining <= 0) {
      router.push(`/room/${roomId}/role-select`);
    }
  }, [session?.status, countdownRemaining, router, roomId]);

  // Auto-start game session when first reservation appears (for any user)
  useEffect(() => {
    const checkAndStartSession = async () => {
      // Only start if we have reservations and no active session
      if (reservations.length > 0 && !session) {
        const firstReservation = reservations[0];
        await createGameSession(
          roomId,
          firstReservation.id,
          firstReservation.song_id,
          firstReservation.user_id
        );
      }
    };
    
    checkAndStartSession();
  }, [reservations, session, roomId]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `room_id=eq.${roomId}`,
      }, () => loadRoomData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reservations',
        filter: `room_id=eq.${roomId}`,
      }, () => loadReservations())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, loadRoomData, loadReservations]);


  const handleCopy = async () => {
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    const myParticipant = participants.find(p => p.user_id === myUserId);
    if (myParticipant) {
      await leaveRoom(myParticipant.id);
    }
    reset();
    router.push('/');
  };

  const handleAddReservation = async (song: Song, singerId?: string) => {
    const userId = singerId || myUserId;
    if (!userId) return;
    
    const maxOrder = reservations.length > 0 
      ? Math.max(...reservations.map(r => r.order ?? 0)) + 1 
      : 0;


    const { error } = await supabase
      .from('reservations')
      .insert({
        room_id: roomId,
        user_id: userId,
        song_id: song.id,
        order: maxOrder,
        is_roulette: !!singerId,
      });
    
    if (!error) {
      // Realtime will trigger loadReservations, but also reload immediately for the user who added
      await loadReservations();
    }
    
    setShowSongPicker(false);
    setShowRoulette(false);
  };


  const handleDeleteReservation = async (reservation: Reservation) => {
    if (reservation.user_id !== myUserId) return;
    
    await supabase.from('reservations').delete().eq('id', reservation.id);
    await loadReservations();
  };

  const handleReorder = async (newOrder: Reservation[]) => {
    setReservations(newOrder);
    
    for (let i = 0; i < newOrder.length; i++) {
      await supabase
        .from('reservations')
        .update({ order: i })
        .eq('id', newOrder[i].id);
    }
  };

  const getParticipantName = (userId: string) => {
    const p = participants.find(p => p.user_id === userId);
    return p?.name || 'Unknown';
  };

  // If there's an active countdown, show the announcement overlay
  const showCountdownOverlay = session?.status === 'countdown' && countdownRemaining > 0;
  const countdownSong = session ? getSongById(session.song_id) : null;

  return (
    <main className="min-h-screen flex flex-col relative">
      {/* Warm background */}
      <div className="bg-warm" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Header */}
      <header className="relative z-10 glass mx-4 mt-4 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Music className="w-6 h-6 text-[var(--primary)]" />
            <h1 className="text-xl font-bold text-[var(--text-primary)]">デンモク</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-lg border border-[var(--primary)]/20">
              <span className="text-[var(--text-muted)] text-sm">コード:</span>
              <span className="font-mono font-bold text-[var(--primary)]">{roomId}</span>
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-[var(--primary)]/10 rounded transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-[var(--text-muted)]" />
                )}
              </button>
            </div>
            
            <button
              onClick={handleLeave}
              className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              退出
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex-1 p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Participants */}
          <div className="lg:col-span-1">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-[var(--primary)]" />
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  参加者
                </h2>
                <span className="ml-auto text-[var(--text-muted)] text-sm">
                  {participants.length}人
                </span>
              </div>
              
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {participants.map((participant) => (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-3 p-3 bg-[var(--surface-warm)] rounded-xl border border-[var(--primary)]/10"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-bold text-sm">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-primary)] font-medium truncate">
                            {participant.name}
                          </span>
                          {participant.user_id === myUserId && (
                            <span className="text-xs text-[var(--primary)]">(あなた)</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Reservations */}
          <div className="lg:col-span-2">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Music className="w-5 h-5 text-[var(--coral)]" />
                <h2 className="text-lg font-bold text-[var(--text-primary)]">予約リスト</h2>
                <span className="ml-auto text-[var(--text-muted)] text-sm">
                  {reservations.length}曲
                </span>
              </div>
              
              {reservations.length > 0 ? (
                <Reorder.Group 
                  axis="y" 
                  values={reservations} 
                  onReorder={handleReorder}
                  className="space-y-2"
                >
                  {reservations.map((reservation, index) => {
                    const song = getSongById(reservation.song_id);
                    const isMyReservation = reservation.user_id === myUserId;
                    const isFirst = index === 0;
                    
                    return (
                      <Reorder.Item
                        key={reservation.id}
                        value={reservation}
                        className={`flex items-center gap-4 p-4 rounded-xl border cursor-grab active:cursor-grabbing ${
                          isFirst 
                            ? 'bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent)]/10 border-[var(--primary)]/30' 
                            : 'bg-[var(--surface-warm)] border-[var(--primary)]/10'
                        }`}
                      >
                        <span className={`w-8 h-8 flex items-center justify-center rounded-full text-white font-bold text-sm ${
                          isFirst 
                            ? 'bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)]' 
                            : 'bg-gradient-to-br from-[var(--primary)]/70 to-[var(--accent)]/70'
                        }`}>
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--text-primary)] font-medium truncate">
                            {song?.title || 'Unknown Song'}
                            {isFirst && (
                              <span className="ml-2 text-xs text-[var(--primary)] font-normal">
                                次に開始
                              </span>
                            )}
                          </p>
                          <p className="text-[var(--text-muted)] text-sm truncate">
                            {song?.artist} · {getParticipantName(reservation.user_id)}
                            {reservation.is_roulette && (
                              <span className="ml-2 text-[var(--accent)]">(ルーレット)</span>
                            )}
                          </p>
                        </div>
                        {isMyReservation && (
                          <button
                            onClick={() => handleDeleteReservation(reservation)}
                            className="p-2 hover:bg-[var(--secondary)]/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--secondary)]" />
                          </button>
                        )}
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
              ) : (
                <div className="py-12 text-center">
                  <Music className="w-12 h-12 mx-auto mb-3 text-[var(--primary)]/30" />
                  <p className="text-[var(--text-muted)] mb-2">まだ曲が予約されていません</p>
                  <p className="text-[var(--text-muted)] text-sm">曲を予約すると自動的に始まります</p>
                </div>
              )}
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowSongPicker(true)}
                  disabled={showCountdownOverlay}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-5 h-5" />
                  曲を予約
                </button>
                <button
                  onClick={() => setShowRoulette(true)}
                  disabled={showCountdownOverlay}
                  className="btn-secondary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Dices className="w-5 h-5" />
                  ルーレット
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Song Picker Modal */}
      <AnimatePresence>
        {showSongPicker && (
          <SongPickerModal
            onSelect={(song) => handleAddReservation(song)}
            onClose={() => setShowSongPicker(false)}
          />
        )}
      </AnimatePresence>

      {/* Roulette Modal */}
      <AnimatePresence>
        {showRoulette && (
          <RouletteModal
            participants={participants}
            onComplete={(song, winnerId) => handleAddReservation(song, winnerId)}
            onClose={() => setShowRoulette(false)}
          />
        )}
      </AnimatePresence>

      {/* Countdown Overlay - synchronized */}
      <AnimatePresence>
        {showCountdownOverlay && countdownSong && (
          <CountdownOverlay
            song={countdownSong}
            singerName={getParticipantName(session!.singer_id)}
            countdown={countdownRemaining}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

// Countdown Overlay Component
function CountdownOverlay({
  song,
  singerName,
  countdown
}: {
  song: Song;
  singerName: string;
  countdown: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="w-full max-w-md bg-white rounded-3xl p-8 text-center shadow-2xl"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center"
        >
          <Music className="w-10 h-10 text-white" />
        </motion.div>
        
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          まもなく開始！
        </h2>
        
        <p className="text-[var(--text-muted)] mb-4">
          {song.title} - {song.artist}
        </p>
        
        <p className="text-lg text-[var(--primary)] font-medium mb-6">
          シンガー: {singerName}
        </p>
        
        <div className="flex items-center justify-center gap-2 text-[var(--text-secondary)]">
          <Timer className="w-5 h-5" />
          <span className="text-3xl font-mono font-bold text-[var(--primary)]">{countdown}</span>
          <span>秒後に役割選択へ</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Song Picker Modal
function SongPickerModal({ 
  onSelect, 
  onClose 
}: { 
  onSelect: (song: Song) => void; 
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  
  const filteredSongs = filterSongs(searchQuery, selectedGenre);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--primary)]/10">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">曲を選択</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--primary)]/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="p-5 border-b border-[var(--primary)]/10 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="曲名・アーティストで検索..."
              className="w-full pl-10 pr-4 py-3 bg-[var(--surface-warm)] border-2 border-[var(--primary)]/20 rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--primary)] transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {GENRES.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedGenre === genre
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--surface-warm)] text-[var(--text-secondary)] hover:bg-[var(--primary)]/10'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {filteredSongs.map((song) => (
            <button
              key={song.id}
              onClick={() => onSelect(song)}
              className="w-full flex items-center gap-4 p-4 bg-[var(--surface-warm)] hover:bg-[var(--primary)]/10 rounded-xl text-left transition-colors border border-transparent hover:border-[var(--primary)]/30"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--primary)] to-[var(--coral)] rounded-lg flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-primary)] font-medium truncate">{song.title}</p>
                <p className="text-[var(--text-muted)] text-sm truncate">{song.artist}</p>
              </div>
              <div className="text-right">
                <p className="text-[var(--text-secondary)] text-sm">{song.bpm} BPM</p>
                <p className="text-[var(--text-muted)] text-xs">{song.genre}</p>
              </div>
            </button>
          ))}
          
          {filteredSongs.length === 0 && (
            <p className="text-center text-[var(--text-muted)] py-8">曲が見つかりません</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Roulette Modal
function RouletteModal({ 
  participants, 
  onComplete,
  onClose
}: { 
  participants: Participant[]; 
  onComplete: (song: Song, winnerId: string) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'song' | 'spin' | 'result'>('song');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');

  const filteredSongs = filterSongs(searchQuery, selectedGenre);

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    setStep('spin');
    
    setTimeout(() => {
      setSpinning(true);
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * participants.length);
        setWinner(participants[randomIndex]);
        setSpinning(false);
        setStep('result');
      }, 2500);
    }, 500);
  };

  const handleConfirm = () => {
    if (selectedSong && winner) {
      onComplete(selectedSong, winner.user_id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl"
      >
        {step === 'song' && (
          <>
            <div className="flex items-center justify-between p-5 border-b border-[var(--primary)]/10 bg-gradient-to-r from-[var(--accent)]/10 to-[var(--primary)]/10">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">ルーレット</h2>
                <p className="text-[var(--text-muted)] text-sm">まず曲を選んでください</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[var(--primary)]/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="p-5 border-b border-[var(--primary)]/10 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="曲名・アーティストで検索..."
                  className="w-full pl-10 pr-4 py-3 bg-[var(--surface-warm)] border-2 border-[var(--primary)]/20 rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--primary)] transition-colors"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedGenre === genre
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--surface-warm)] text-[var(--text-secondary)] hover:bg-[var(--accent)]/10'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-5 space-y-2">
              {filteredSongs.map((song) => (
                <button
                  key={song.id}
                  onClick={() => handleSelectSong(song)}
                  className="w-full flex items-center gap-4 p-4 bg-[var(--surface-warm)] hover:bg-[var(--accent)]/10 rounded-xl text-left transition-colors border border-transparent hover:border-[var(--accent)]/30"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--accent)] to-[var(--primary)] rounded-lg flex items-center justify-center">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] font-medium truncate">{song.title}</p>
                    <p className="text-[var(--text-muted)] text-sm truncate">{song.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {(step === 'spin' || step === 'result') && (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              {spinning ? '回転中...' : '決定！'}
            </h2>
            {selectedSong && (
              <p className="text-[var(--text-muted)] mb-6">
                曲: {selectedSong.title}
              </p>
            )}
            
            <div className="w-40 h-40 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--primary)] flex items-center justify-center shadow-lg">
              {spinning ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.3, repeat: Infinity, ease: 'linear' }}
                >
                  <Dices className="w-16 h-16 text-white" />
                </motion.div>
              ) : winner ? (
                <span className="text-5xl font-bold text-white">
                  {winner.name.charAt(0).toUpperCase()}
                </span>
              ) : null}
            </div>
            
            {winner && !spinning && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-2xl font-bold text-[var(--primary)] mb-6">
                  {winner.name} さんがシンガー！
                </p>
                <button
                  onClick={handleConfirm}
                  className="btn-primary"
                >
                  予約リストに追加
                </button>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
