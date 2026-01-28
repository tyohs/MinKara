"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Users,
  Copy,
  Check,
  Music,
  LogOut,
  Plus,
  Trash2,
  Dices,
  Search,
  X,
  Timer,
  Mic,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  useRoomStore,
  fetchParticipants,
  leaveRoom,
  generateUserId,
} from "@/store/useRoomStore";
import { GENRES, filterSongs, getSongById } from "@/data/songs";
import { useGameSession, createGameSession } from "@/hooks/useGameSession";
import { useDisplayCountdown } from "@/hooks/useSyncedCountdown";
import type { Participant, Reservation, Song } from "@/types";

const COUNTDOWN_DURATION = 5; // seconds before role select

export default function DenmokuPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;
  const {
    myUserId,
    setMyUserId,
    participants,
    setParticipants,
    setRoomId,
    reset,
  } = useRoomStore();

  const [copied, setCopied] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);

  // Game session hook
  const { session } = useGameSession(roomId);

  // Synced countdown (only active when session is in countdown)
  const countdownRemaining = useDisplayCountdown(
    session?.status === "countdown" ? session.countdown_started_at : null,
    COUNTDOWN_DURATION,
  );

  const loadRoomData = useCallback(async () => {
    const participantList = await fetchParticipants(roomId);
    setParticipants(participantList);
  }, [roomId, setParticipants]);

  const loadReservations = useCallback(async () => {
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .eq("room_id", roomId)
      .order("order", { ascending: true });

    if (data) {
      setReservations(data);
    }
  }, [roomId]);

  useEffect(() => {
    setRoomId(roomId);
    loadRoomData();
    loadReservations();
  }, [roomId, setRoomId, loadRoomData, loadReservations]);

  useEffect(() => {
    if (!myUserId) {
      const userId = generateUserId();
      setMyUserId(userId);
    }
  }, [myUserId, setMyUserId]);

  // Navigate to role select when countdown finishes
  useEffect(() => {
    if (session?.status === "countdown" && countdownRemaining <= 0) {
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
          firstReservation.user_id,
        );
      }
    };

    checkAndStartSession();
  }, [reservations, session, roomId]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `room_id=eq.${roomId}`,
        },
        () => loadRoomData(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
          filter: `room_id=eq.${roomId}`,
        },
        () => loadReservations(),
      )
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
    const myParticipant = participants.find((p) => p.user_id === myUserId);
    if (myParticipant) {
      await leaveRoom(myParticipant.id);
    }
    reset();
    router.push("/");
  };

  const handleAddReservation = async (song: Song, singerId?: string) => {
    const userId = singerId || myUserId;
    if (!userId) return;

    const maxOrder =
      reservations.length > 0
        ? Math.max(...reservations.map((r) => r.order ?? 0)) + 1
        : 0;

    const { error } = await supabase.from("reservations").insert({
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

    await supabase.from("reservations").delete().eq("id", reservation.id);
    await loadReservations();
  };

  const handleReorder = async (newOrder: Reservation[]) => {
    setReservations(newOrder);

    for (let i = 0; i < newOrder.length; i++) {
      await supabase
        .from("reservations")
        .update({ order: i })
        .eq("id", newOrder[i].id);
    }
  };

  const getParticipantName = (userId: string) => {
    const p = participants.find((p) => p.user_id === userId);
    return p?.name || "Unknown";
  };

  // If there's an active countdown, show the announcement overlay
  const showCountdownOverlay =
    session?.status === "countdown" && countdownRemaining > 0;
  const countdownSong = session ? getSongById(session.song_id) : null;

  return (
    <main className="min-h-screen flex flex-col relative bg-black text-white overflow-hidden">
      {/* Background Video (Darkened & Scaled) */}
      <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <video
          className="w-full h-full object-cover brightness-[0.4] scale-110"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
          role="presentation"
        >
          <source src="/video/background-monochrome.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Header */}
      <header className="relative z-10 mx-4 mt-4 px-6 py-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-pink-500 to-orange-400 p-2 rounded-lg">
              <Music className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              DENMOKU
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/5 rounded-xl border border-white/10">
              <span className="text-gray-400 text-xs sm:text-sm">Room ID:</span>
              <span className="font-mono font-bold text-white tracking-wider text-xs sm:text-sm">
                {roomId}
              </span>
              <button
                onClick={handleCopy}
                className="ml-2 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>

            <button
              onClick={handleLeave}
              className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">退出</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
          {/* Left Column: Participants (Mobile: Top, Desktop: Left Side) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-5 shadow-2xl">
              <div className="flex items-center gap-2 mb-4 px-1">
                <Users className="w-5 h-5 text-pink-400" />
                <h2 className="text-lg font-bold text-white">Member</h2>
                <span className="ml-auto bg-white/10 px-2 py-1 rounded-md text-xs text-white/70 font-mono">
                  {participants.length}
                </span>
              </div>

              <div className="space-y-2 max-h-[200px] lg:max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                  {participants.map((participant) => (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium truncate">
                            {participant.name}
                          </span>
                          {participant.user_id === myUserId && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-pink-500/20 text-pink-300 border border-pink-500/30">
                              YOU
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Column: Playlist */}
          <div className="lg:col-span-8">
            <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-5 shadow-2xl h-full flex flex-col">
              <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-orange-400" />
                  <h2 className="text-lg font-bold text-white">Playlist</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRoulette(true)}
                    disabled={showCountdownOverlay}
                    className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all active:scale-95 disabled:opacity-50"
                    title="ルーレット"
                  >
                    <Dices className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowSongPicker(true)}
                    disabled={showCountdownOverlay}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-400 hover:to-orange-300 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline">曲を追加</span>
                    <span className="sm:hidden">追加</span>
                  </button>
                </div>
              </div>

              {reservations.length > 0 ? (
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <Reorder.Group
                    axis="y"
                    values={reservations}
                    onReorder={handleReorder}
                    className="space-y-3"
                  >
                    {reservations.map((reservation, index) => {
                      const song = getSongById(reservation.song_id);
                      const isMyReservation = reservation.user_id === myUserId;
                      const isFirst = index === 0;

                      return (
                        <Reorder.Item
                          key={reservation.id}
                          value={reservation}
                          className={`group flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-sm cursor-grab active:cursor-grabbing transition-all ${
                            isFirst
                              ? "bg-gradient-to-r from-pink-500/10 to-orange-500/10 border-pink-500/30 shadow-[0_0_15px_rgba(255,100,150,0.1)]"
                              : "bg-white/5 hover:bg-white/10 border-white/5"
                          }`}
                        >
                          <span
                            className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-white font-bold text-sm ${
                              isFirst
                                ? "bg-gradient-to-br from-pink-500 to-orange-400 shadow-lg"
                                : "bg-white/10 text-white/50"
                            }`}
                          >
                            {isFirst ? (
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            ) : (
                              index + 1
                            )}
                          </span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-white font-bold truncate text-lg">
                                {song?.title || "Unknown Song"}
                              </p>
                              {isFirst && (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-pink-500 text-white font-bold animate-pulse">
                                  NOW PLAYING
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <span className="truncate max-w-[120px]">
                                {song?.artist}
                              </span>
                              <span className="w-1 h-1 bg-gray-600 rounded-full" />
                              <div className="flex items-center gap-1 text-gray-300">
                                <Mic className="w-3 h-3" />
                                <span className="truncate">
                                  {getParticipantName(reservation.user_id)}
                                </span>
                              </div>
                              {reservation.is_roulette && (
                                <span className="text-xs text-orange-400 border border-orange-400/30 px-1.5 rounded">
                                  Roulette
                                </span>
                              )}
                            </div>
                          </div>

                          {isMyReservation && (
                            <button
                              onClick={() =>
                                handleDeleteReservation(reservation)
                              }
                              className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 opacity-50">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Music className="w-8 h-8 text-white/30" />
                  </div>
                  <p className="text-white/50 text-lg">No songs queued</p>
                  <p className="text-white/30 text-sm mt-1">
                    右上のボタンから曲を追加してください
                  </p>
                </div>
              )}
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
            onComplete={(song, winnerId) =>
              handleAddReservation(song, winnerId)
            }
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
  countdown,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="w-full max-w-md bg-black/60 border border-white/10 rounded-3xl p-10 text-center shadow-[0_0_50px_rgba(255,107,107,0.2)] relative overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-50" />

        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center shadow-lg shadow-pink-500/30"
        >
          <Music className="w-12 h-12 text-white" />
        </motion.div>

        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
          ARE YOU READY?
        </h2>

        <div className="my-6 space-y-2">
          <p className="text-xl text-white font-medium">{song.title}</p>
          <p className="text-white/60">{song.artist}</p>
        </div>

        <div className="bg-white/5 rounded-xl p-4 mb-8 border border-white/5">
          <p className="text-sm text-white/50 mb-1">Singer</p>
          <p className="text-xl text-pink-400 font-bold">{singerName}</p>
        </div>

        <div className="flex items-center justify-center gap-3 text-white/80">
          <Timer className="w-5 h-5 text-orange-400" />
          <span className="text-4xl font-mono font-bold text-white tabular-nums">
            {countdown}
          </span>
          <span className="text-sm">SECONDS</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Song Picker Modal
function SongPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (song: Song) => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");

  const filteredSongs = filterSongs(searchQuery, selectedGenre);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] bg-[#121212] border border-white/10 rounded-3xl flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-2xl font-bold text-white">Select Song</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 border-b border-white/5 space-y-4 bg-white/[0.02]">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-pink-400 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="          曲名・アーティストで検索..."
              className="w-full pl-12 pr-4 py-4 bg-black border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {GENRES.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedGenre === genre
                    ? "bg-white text-black font-bold shadow-lg"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-black/20">
          {filteredSongs.map((song) => (
            <button
              key={song.id}
              onClick={() => onSelect(song)}
              className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-left transition-all border border-transparent hover:border-white/10 group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Music className="w-6 h-6 text-gray-500 group-hover:text-pink-400 transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-lg truncate group-hover:text-pink-300 transition-colors">
                  {song.title}
                </p>
                <p className="text-gray-400 text-sm truncate">{song.artist}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-gray-300 font-mono text-sm">
                  {song.bpm} BPM
                </p>
                <p className="text-gray-600 text-xs uppercase tracking-wider">
                  {song.genre}
                </p>
              </div>
            </button>
          ))}

          {filteredSongs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No songs found</p>
            </div>
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
  onClose,
}: {
  participants: Participant[];
  onComplete: (song: Song, winnerId: string) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"song" | "spin" | "result">("song");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");

  const filteredSongs = filterSongs(searchQuery, selectedGenre);

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    setStep("spin");

    setTimeout(() => {
      setSpinning(true);
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * participants.length);
        setWinner(participants[randomIndex]);
        setSpinning(false);
        setStep("result");
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#121212] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        {step === "song" && (
          <>
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-r from-pink-500/10 to-orange-500/10">
              <div>
                <h2 className="text-2xl font-bold text-white">Roulette</h2>
                <p className="text-white/60 text-sm">
                  運命の曲を選んでください
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 border-b border-white/5 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="          曲名・アーティストで検索..."
                  className="w-full pl-12 pr-4 py-4 bg-black border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedGenre === genre
                        ? "bg-orange-500 text-white font-bold"
                        : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {filteredSongs.map((song) => (
                <button
                  key={song.id}
                  onClick={() => handleSelectSong(song)}
                  className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-orange-500/10 rounded-2xl text-left transition-all border border-transparent hover:border-orange-500/30 group"
                >
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Music className="w-6 h-6 text-gray-500 group-hover:text-orange-400 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-lg truncate">
                      {song.title}
                    </p>
                    <p className="text-gray-400 text-sm truncate">
                      {song.artist}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {(step === "spin" || step === "result") && (
          <div className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <h2 className="text-3xl font-bold text-white mb-2 tracking-wide">
              {spinning ? "CHOOSING..." : "WINNER!"}
            </h2>
            {selectedSong && (
              <p className="text-white/50 mb-10 text-lg">
                Song: <span className="text-white">{selectedSong.title}</span>
              </p>
            )}

            <div className="w-48 h-48 mx-auto mb-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center shadow-[0_0_40px_rgba(255,100,100,0.3)] border-4 border-white/10">
              {spinning ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <Dices className="w-20 h-20 text-white" />
                </motion.div>
              ) : winner ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                  className="text-7xl font-bold text-white"
                >
                  {winner.name.charAt(0).toUpperCase()}
                </motion.span>
              ) : null}
            </div>

            {winner && !spinning && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
              >
                <p className="text-2xl font-bold text-white mb-8">
                  <span className="text-pink-400">{winner.name}</span> さんが
                  <br />
                  歌います！
                </p>
                <button
                  onClick={handleConfirm}
                  className="w-full max-w-xs py-4 bg-white text-black font-bold text-lg rounded-full shadow-lg hover:scale-105 transition-transform"
                >
                  決定する
                </button>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
