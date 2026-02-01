"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  X,
  Mic,
  ArrowUp,
  Loader2,
  Square,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  useRoomStore,
  fetchParticipants,
  leaveRoom,
  generateUserId,
} from "@/store/useRoomStore";
import { GENRES, filterSongs, getSongById } from "@/data/songs";
import {
  useGameSession,
  createGameSession,
  finishSession,
} from "@/hooks/useGameSession";
import { useDisplayCountdown } from "@/hooks/useSyncedCountdown";
import type { Participant, Reservation, Song } from "@/types";

const COUNTDOWN_DURATION = 5;

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
    isHost,
  } = useRoomStore();

  const [copied, setCopied] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Game session hook
  const { session } = useGameSession(roomId);

  // Synced countdown
  const countdownRemaining = useDisplayCountdown(
    session?.status === "countdown" ? session.countdown_started_at : null,
    COUNTDOWN_DURATION,
  );

  const fetchRoomData = useCallback(async () => {
    try {
      const [participantList, { data: reservationsData }] = await Promise.all([
        fetchParticipants(roomId),
        supabase
          .from("reservations")
          .select("*")
          .eq("room_id", roomId)
          .order("order", { ascending: true }),
      ]);

      setParticipants(participantList);
      if (reservationsData) {
        setReservations(reservationsData);
      }
    } catch (error) {
      console.error("Failed to fetch room data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, setParticipants]);

  useEffect(() => {
    setRoomId(roomId);
    fetchRoomData();
  }, [roomId, setRoomId, fetchRoomData]);

  useEffect(() => {
    if (!myUserId) {
      const userId = generateUserId();
      setMyUserId(userId);
    }
  }, [myUserId, setMyUserId]);

  useEffect(() => {
    if (session?.status === "countdown" && countdownRemaining <= 0) {
      router.push(`/room/${roomId}/role-select`);
    }
  }, [session?.status, countdownRemaining, router, roomId]);

  useEffect(() => {
    const checkAndStartSession = async () => {
      if (reservations.length > 0 && !session) {
        try {
          const firstReservation = reservations[0];
          await createGameSession(
            roomId,
            firstReservation.id,
            firstReservation.song_id,
            firstReservation.user_id,
          );
        } catch (error) {
          console.error("Failed to start session automatically:", error);
        }
      }
    };
    checkAndStartSession();
  }, [reservations, session, roomId]);

  // Realtime subscription
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
        () => fetchRoomData(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
          filter: `room_id=eq.${roomId}`,
        },
        () => fetchRoomData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchRoomData]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleLeave = async () => {
    try {
      const myParticipant = participants.find((p) => p.user_id === myUserId);
      if (myParticipant) {
        await leaveRoom(myParticipant.id);
      }
      reset();
      router.push("/");
    } catch (error) {
      console.error("Error leaving room:", error);
      router.push("/");
    }
  };

  const handleAddReservation = async (song: Song, singerId?: string) => {
    const userId = singerId || myUserId;
    if (!userId) return;

    try {
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

      if (error) throw error;

      await fetchRoomData();
    } catch (error) {
      console.error("Failed to add reservation:", error);
      alert("予約に失敗しました。もう一度お試しください。");
    }

    setShowSongPicker(false);
    setShowRoulette(false);
  };

  const handleDeleteReservation = async (reservation: Reservation) => {
    if (!reservation?.id) {
      console.warn("invalid reservation id", reservation);
      return;
    }

    // ホストは他人の予約も削除可能にする
    if (reservation.user_id !== myUserId && !isHost) return;

    try {
      const { error } = await supabase
        .from("reservations")
        .delete()
        .eq("id", reservation.id);

      if (error) {
        console.error("Failed to delete reservation (supabase):", error);
        alert("曲の削除に失敗しました。再度お試しください。");
        await fetchRoomData();
        return;
      }

      // 成功したらローカル state を即時更新（optimistic）
      setReservations((prev) => prev.filter((r) => r.id !== reservation.id));
    } catch (err) {
      console.error("Unexpected error deleting reservation:", err);
      alert("予期せぬエラーが発生しました。");
      await fetchRoomData();
    }
  };

  const handleStopSession = async () => {
    if (!session || !isHost) return;
    if (!confirm("本当に演奏を停止しますか？")) return;

    try {
      await finishSession(session.id);
    } catch (error) {
      console.error("Failed to stop session:", error);
      alert("演奏の停止に失敗しました。");
    }
  };

  const handleReorder = async (newOrder: Reservation[]) => {
    setReservations(newOrder);

    try {
      await Promise.all(
        newOrder.map((res, index) =>
          supabase
            .from("reservations")
            .update({ order: index })
            .eq("id", res.id),
        ),
      );
    } catch (error) {
      console.error("Failed to reorder:", error);
      fetchRoomData();
    }
  };

  const getParticipantName = useCallback(
    (userId: string) => {
      const p = participants.find((p) => p.user_id === userId);
      return p?.name || "Unknown";
    },
    [participants],
  );

  const showCountdownOverlay =
    session?.status === "countdown" && countdownRemaining > 0;

  const countdownSong = useMemo(
    () => (session ? getSongById(session.song_id) : null),
    [session],
  );

  return (
    <main
      className="min-h-screen flex flex-col relative bg-black text-white overflow-hidden"
      style={{
        paddingLeft: "24px",
        paddingRight: "24px",
        paddingTop: "24px",
        paddingBottom: "24px",
      }}
    >
      {/* Background Video */}
      <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none bg-black">
        <video
          className="w-full h-full object-cover brightness-[0.4] scale-105 blur-sm"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
          poster="/images/logo-main.png"
        >
          <source src="/video/background-monochrome.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Header */}
      <header className="relative z-10 mx-2 mt-2 px-4 py-3 md:mx-4 md:mt-4 md:px-6 md:py-4 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-linear-to-br from-pink-500 to-orange-400 p-1.5 rounded-lg shadow-lg shadow-pink-500/20">
            <Music className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <h1 className="text-lg md:text-xl font-bold text-white tracking-wide hidden sm:block">
            DENMOKU
          </h1>
        </div>

        {/* Room ID Display */}
        <div
          className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 border border-white/10"
          style={{ marginBottom: "12px" }}
        >
          <span className="text-gray-400 text-xs md:text-sm">ID:</span>
          <span className="font-mono font-bold text-white text-sm md:text-base tracking-wider">
            {roomId}
          </span>
          <button
            onClick={handleCopy}
            className="ml-1 p-1 hover:bg-white/10 rounded active:scale-95 transition-transform"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>
        </div>

        <button
          onClick={handleLeave}
          className="p-2 md:px-4 md:py-2 text-sm font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">退出</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex-1 p-3 md:p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 pb-20">
          {/* Participants - Optimized rendering */}
          <div className="lg:col-span-4">
            <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-4 shadow-xl">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Users className="w-4 h-4 text-pink-400" />
                <h2 className="text-base font-bold text-white">Member</h2>
                <span className="ml-auto bg-white/10 px-2 py-0.5 rounded text-[10px] text-white/70 font-mono">
                  {participants.length}
                </span>
              </div>
              <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto lg:max-h-[calc(100vh-300px)] custom-scrollbar pb-2 lg:pb-0">
                <AnimatePresence mode="popLayout" initial={false}>
                  {participants.map((participant) => (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      layout // リストの並び替えアニメーション
                      className="shrink-0 flex items-center gap-2 p-2 pr-4 bg-white/5 rounded-full lg:rounded-xl border border-white/5"
                    >
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-gray-700 to-gray-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white text-sm font-medium truncate max-w-25 lg:max-w-none">
                        {participant.name}
                      </span>
                      {participant.user_id === myUserId && (
                        <span className="ml-auto text-[10px] text-pink-300 bg-pink-500/20 px-1.5 py-0.5 rounded border border-pink-500/30">
                          YOU
                        </span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Playlist */}
          <div className="lg:col-span-8">
            <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-4 shadow-xl min-h-125 flex flex-col">
              {/* Playlist Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 px-1">
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-orange-400" />
                  <h2 className="text-lg font-bold text-white">Playlist</h2>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                  {/* Stop Button (Only visible if playing and user is host) */}
                  {session?.status === "playing" && isHost && (
                    <button
                      onClick={handleStopSession}
                      className="flex-1 sm:flex-initial px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>演奏停止</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowRoulette(true)}
                    disabled={showCountdownOverlay || isLoading}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-white/10 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Dices className="w-4 h-4 text-orange-400" />
                    <span>ルーレット</span>
                  </button>
                  <button
                    onClick={() => setShowSongPicker(true)}
                    disabled={showCountdownOverlay || isLoading}
                    className="flex-2 sm:flex-initial px-6 py-2.5 bg-linear-to-r from-pink-500 to-orange-500 hover:from-pink-400 hover:to-orange-400 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>曲を予約</span>
                  </button>
                </div>
              </div>

              {/* Reservation List */}
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                </div>
              ) : reservations.length > 0 ? (
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <Reorder.Group
                    axis="y"
                    values={reservations}
                    onReorder={handleReorder}
                    className="space-y-3"
                  >
                    {reservations.map((reservation, index) => (
                      <ReservationItem
                        key={reservation.id}
                        reservation={reservation}
                        index={index}
                        isMyReservation={reservation.user_id === myUserId}
                        onDelete={handleDeleteReservation}
                        getParticipantName={getParticipantName}
                      />
                    ))}
                  </Reorder.Group>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center opacity-60">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <Music className="w-8 h-8 text-white/30" />
                  </div>
                  <p className="text-white font-medium mb-1">
                    プレイリストが空です
                  </p>
                  <p className="text-sm text-gray-400 mb-6">
                    上のボタンから曲を追加しよう！
                  </p>
                  <ArrowUp className="w-6 h-6 text-pink-400 animate-bounce" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals - Conditional Rendering for Performance */}
      <AnimatePresence>
        {showSongPicker && (
          <SongPickerModal
            onSelect={(song) => handleAddReservation(song)}
            onClose={() => setShowSongPicker(false)}
          />
        )}
      </AnimatePresence>

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

      {/* Countdown Overlay */}
      <AnimatePresence>
        {showCountdownOverlay && countdownSong && session && (
          <CountdownOverlay
            song={countdownSong}
            singerName={getParticipantName(session.singer_id)}
            countdown={countdownRemaining}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

// ============================================================================
// Sub Components (Separated for better re-rendering control)
// ============================================================================

// Reservation Item Component (Memoized)
const ReservationItem = ({
  reservation,
  index,
  isMyReservation,
  onDelete,
  getParticipantName,
}: {
  reservation: Reservation;
  index: number;
  isMyReservation: boolean;
  onDelete: (r: Reservation) => void;
  getParticipantName: (id: string) => string;
}) => {
  const song = useMemo(
    () => getSongById(reservation.song_id),
    [reservation.song_id],
  );
  const isFirst = index === 0;

  return (
    <Reorder.Item
      value={reservation}
      className={`group relative overflow-hidden flex items-center gap-3 p-3 rounded-xl border backdrop-blur-sm cursor-grab active:cursor-grabbing transition-all ${
        isFirst
          ? "bg-linear-to-r from-pink-500/20 to-orange-500/20 border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.1)]"
          : "bg-white/5 hover:bg-white/10 border-white/5"
      }`}
    >
      {/* Playing Indicator */}
      <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg bg-black/20">
        {isFirst ? (
          <div className="flex gap-0.5 items-end h-4">
            <motion.div
              animate={{ height: [4, 16, 8, 12, 4] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="w-1 bg-pink-400 rounded-full"
            />
            <motion.div
              animate={{ height: [8, 4, 16, 8, 8] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
              className="w-1 bg-orange-400 rounded-full"
            />
            <motion.div
              animate={{ height: [12, 8, 4, 16, 12] }}
              transition={{ repeat: Infinity, duration: 0.7 }}
              className="w-1 bg-pink-400 rounded-full"
            />
          </div>
        ) : (
          <span className="text-white/40 font-bold text-sm">{index + 1}</span>
        )}
      </div>

      <div className="flex-1 min-w-0 z-10">
        <p className="text-white font-bold truncate text-base">
          {song?.title || "Unknown Song"}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
          <span className="truncate max-w-30">
            {song?.artist || "Unknown Artist"}
          </span>
          <span className="w-0.5 h-3 bg-gray-600" />
          <div className="flex items-center gap-1">
            <Mic className="w-3 h-3 text-gray-500" />
            <span className="text-gray-300 truncate">
              {getParticipantName(reservation.user_id)}
            </span>
          </div>
        </div>
      </div>

      {reservation.is_roulette && (
        <div className="absolute top-0 right-0 p-1">
          <span className="text-[9px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-bl-lg border-l border-b border-orange-500/20">
            Roulette
          </span>
        </div>
      )}

      {isMyReservation && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // prevent drag start
            onDelete(reservation);
          }}
          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 touch-manipulation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </Reorder.Item>
  );
};

// Countdown Overlay
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-6"
    >
      <div className="text-center w-full max-w-md">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="inline-block p-6 rounded-full bg-linear-to-br from-pink-500 to-orange-500 mb-8 shadow-[0_0_40px_rgba(255,100,100,0.4)]"
        >
          <Music className="w-12 h-12 text-white" />
        </motion.div>
        <h2 className="text-4xl font-black text-white mb-2 italic tracking-tighter">
          ARE YOU READY?
        </h2>
        <div className="bg-white/10 rounded-2xl p-6 my-8 border border-white/5">
          <p className="text-2xl font-bold text-white mb-1">{song.title}</p>
          <p className="text-gray-400 mb-4">{song.artist}</p>
          <div className="inline-block px-4 py-1 rounded-full bg-black/30 border border-white/10 text-sm">
            Vocal: <span className="text-pink-400 font-bold">{singerName}</span>
          </div>
        </div>
        <div className="flex justify-center items-end gap-2 text-white/50">
          <span className="text-6xl font-mono font-bold text-white tabular-nums">
            {countdown}
          </span>
          <span className="mb-2">秒後に開始</span>
        </div>
      </div>
    </motion.div>
  );
}

// Song Picker (Optimized with useMemo)
function SongPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (song: Song) => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");

  // フィルタリング処理をメモ化して再計算コストを削減
  const filteredSongs = useMemo(
    () => filterSongs(searchQuery, selectedGenre),
    [searchQuery, selectedGenre],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl h-[90vh] sm:h-[80vh] bg-[#1a1a1a] sm:rounded-3xl rounded-t-3xl border-t sm:border border-white/10 flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white pl-2">曲を選択</h2>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3 bg-black/20">
          <div className="relative">
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="曲名・アーティストで検索..."
              className="w-full pl-4 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {GENRES.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedGenre === genre
                    ? "bg-white text-black font-bold"
                    : "bg-white/5 text-gray-400"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {filteredSongs.map((song) => (
            <button
              key={song.id}
              onClick={() => onSelect(song)}
              className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-left group border-b border-white/5 last:border-0"
            >
              <div className="w-12 h-12 bg-linear-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center shadow-md group-hover:from-pink-900/50 group-hover:to-orange-900/50 transition-colors">
                <Music className="w-5 h-5 text-gray-500 group-hover:text-pink-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate">{song.title}</p>
                <p className="text-gray-400 text-sm truncate">{song.artist}</p>
              </div>
            </button>
          ))}
          {filteredSongs.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              該当する曲がありません
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

  const filteredSongs = useMemo(
    () => filterSongs(searchQuery, "All"),
    [searchQuery],
  );

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    setStep("spin");
    setTimeout(() => {
      setSpinning(true);
      setTimeout(() => {
        // 安全なランダム選択
        if (participants.length === 0) {
          setSpinning(false);
          return;
        }
        const randomIndex = Math.floor(Math.random() * participants.length);
        setWinner(participants[randomIndex]);
        setSpinning(false);
        setStep("result");
      }, 2500);
    }, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl h-[90vh] sm:h-[80vh] bg-[#1a1a1a] sm:rounded-3xl rounded-t-3xl border-t sm:border border-white/10 flex flex-col shadow-2xl overflow-hidden"
      >
        {step === "song" && (
          <>
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-linear-to-r from-pink-900/20 to-orange-900/20">
              <div>
                <h2 className="text-lg font-bold text-white">ルーレット</h2>
                <p className="text-xs text-orange-300">
                  まずは曲を選んでください
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-white/5 rounded-full text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="曲名で検索..."
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar h-[50vh]">
              {filteredSongs.map((song) => (
                <button
                  key={song.id}
                  onClick={() => handleSelectSong(song)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-orange-500/10 rounded-xl transition-colors text-left border-b border-white/5 last:border-0"
                >
                  <Music className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-white font-bold">{song.title}</p>
                    <p className="text-xs text-gray-400">{song.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {(step === "spin" || step === "result") && (
          <div className="p-8 flex flex-col items-center justify-center min-h-75 text-center">
            <h2 className="text-2xl font-bold text-white mb-8 tracking-widest">
              {spinning ? "抽選中..." : "決定！"}
            </h2>

            <div className="w-40 h-40 rounded-full bg-linear-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-[0_0_50px_rgba(255,100,100,0.3)] mb-8 border-4 border-white/10 relative">
              {spinning ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 0.3,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <Dices className="w-16 h-16 text-white" />
                </motion.div>
              ) : (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                  className="text-6xl font-bold text-white"
                >
                  {winner?.name.charAt(0).toUpperCase() || "?"}
                </motion.span>
              )}
            </div>

            {winner && !spinning && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
              >
                <div className="mb-8">
                  <p className="text-sm text-gray-400 mb-1">Singer</p>
                  <p className="text-3xl font-bold text-white mb-2">
                    {winner.name}
                  </p>
                  <p className="text-sm text-orange-400 bg-orange-900/30 inline-block px-3 py-1 rounded-full border border-orange-500/30">
                    {selectedSong?.title}
                  </p>
                </div>
                <button
                  onClick={() =>
                    selectedSong &&
                    onComplete(selectedSong, winner?.user_id || "")
                  }
                  className="w-full py-4 bg-white text-black font-bold text-lg rounded-xl shadow-lg active:scale-95 transition-transform"
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
