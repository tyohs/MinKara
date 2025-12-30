// Core types for ENCORE band app

export type Role = 'singer' | 'band' | 'audience';
export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type FansaType = 'kiss' | 'point' | 'heart' | 'wave' | 'peace';

// 楽器タイプ
export type InstrumentType = 'drums' | 'guitar' | 'keyboard' | 'bass';

export interface Participant {
  id: string;
  name: string;
  role: Role;
  instrument?: InstrumentType;  // 選択した楽器
  score: number;
  isHost: boolean;
  penLightColor: string;
}

export interface Room {
  id: string;
  hostId: string;
  participants: Participant[];
  status: RoomStatus;
  currentSong?: Song;
  excitementGauge: number; // 0-100
  fansaRequests: FansaRequest[];
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number; // seconds
  callTimings: CallTiming[];
  fansaThresholds: number[]; // スコア閾値
}

export interface CallTiming {
  time: number; // seconds from start
  callType: string;
  text: string;
}

export interface FansaRequest {
  id: string;
  fromParticipantId: string;
  type: FansaType;
  completed: boolean;
  timestamp: number;
}

// Actions sent between participants
export type GameAction =
  | { type: 'swing'; participantId: string; intensity: number }
  | { type: 'call'; participantId: string; callType: string }
  | { type: 'fansa_request'; participantId: string; fansaType: FansaType }
  | { type: 'fansa_complete'; fansaType: FansaType };

// Fansa display info
export const FANSA_INFO: Record<FansaType, { emoji: string; label: string }> = {
  kiss: { emoji: '💋', label: '投げキッス' },
  point: { emoji: '👉', label: '指差し' },
  heart: { emoji: '💕', label: 'ハート作って' },
  wave: { emoji: '👋', label: '手を振って' },
  peace: { emoji: '✌️', label: 'ピース' },
};

// 楽器情報
export const INSTRUMENT_INFO: Record<InstrumentType, {
  emoji: string;
  label: string;
  color: string;
  difficulty: number; // 1-3
}> = {
  drums: { emoji: '🥁', label: 'ドラム', color: '#FF6B6B', difficulty: 3 },
  guitar: { emoji: '🎸', label: 'ギター', color: '#4ECDC4', difficulty: 2 },
  keyboard: { emoji: '🎹', label: 'キーボード', color: '#A78BFA', difficulty: 1 },
  bass: { emoji: '🎸', label: 'ベース', color: '#34D399', difficulty: 2 },
};

// Penlight colors
export const PENLIGHT_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#95E1D3', // Mint
  '#F38181', // Coral
  '#AA96DA', // Purple
  '#FCBAD3', // Pink
  '#A8D8EA', // Sky Blue
];


export interface Reservation {
  id: string;
  room_id: string;
  user_id: string;
  song_id: string;
  status: 'pending' | 'playing' | 'history' | 'cancelled';
  created_at: string;
  user_name?: string; // For display, joined from participants
  song_title?: string; // For display, joined from SONGS
}
