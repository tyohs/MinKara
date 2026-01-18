// Re-export database types
export * from './database';

// Game-specific types
export type Judgment = 'perfect' | 'great' | 'good' | 'miss';

export interface Note {
  id: string;
  lane: number;
  time: number;
  hit: boolean;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  genre: string;
  audio_url: string;
  duration: number;
}

export interface Chart {
  song_id: string;
  bpm: number;
  notes: Note[];
}

export interface Score {
  id: string;
  session_id: string;
  participant_id: string;
  role: string;
  score: number;
  perfect_count?: number;
  great_count?: number;
  good_count?: number;
  miss_count?: number;
  max_combo?: number;
}
