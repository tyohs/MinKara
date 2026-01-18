// Supabase Database Types
// Aligned with actual Supabase schema

export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string;
          host_id: string;
          status: string | null;
          current_song_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          host_id: string;
          status?: string | null;
          current_song_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          host_id?: string;
          status?: string | null;
          current_song_id?: string | null;
          created_at?: string | null;
        };
      };
      participants: {
        Row: {
          id: string;
          room_id: string | null;
          user_id: string;
          name: string;
          role: string;
          instrument: string | null;
          score: number | null;
          joined_at: string | null;
        };
        Insert: {
          id?: string;
          room_id?: string | null;
          user_id: string;
          name: string;
          role: string;
          instrument?: string | null;
          score?: number | null;
          joined_at?: string | null;
        };
        Update: {
          id?: string;
          room_id?: string | null;
          user_id?: string;
          name?: string;
          role?: string;
          instrument?: string | null;
          score?: number | null;
          joined_at?: string | null;
        };
      };
      reservations: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          song_id: string;
          order: number | null;
          is_roulette: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          song_id: string;
          order?: number | null;
          is_roulette?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          song_id?: string;
          order?: number | null;
          is_roulette?: boolean | null;
          created_at?: string | null;
        };
      };
      game_sessions: {
        Row: {
          id: string;
          room_id: string | null;
          reservation_id: string | null;
          song_id: string;
          singer_id: string;
          countdown_started_at: string | null;
          role_select_started_at: string | null;
          song_started_at: string | null;
          ended_at: string | null;
          status: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          room_id?: string | null;
          reservation_id?: string | null;
          song_id: string;
          singer_id: string;
          countdown_started_at?: string | null;
          role_select_started_at?: string | null;
          song_started_at?: string | null;
          ended_at?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          room_id?: string | null;
          reservation_id?: string | null;
          song_id?: string;
          singer_id?: string;
          countdown_started_at?: string | null;
          role_select_started_at?: string | null;
          song_started_at?: string | null;
          ended_at?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
      };
    };
  };
};

// Convenience types
export type Room = Database['public']['Tables']['rooms']['Row'];
export type Participant = Database['public']['Tables']['participants']['Row'];
export type Reservation = Database['public']['Tables']['reservations']['Row'];
export type GameSession = Database['public']['Tables']['game_sessions']['Row'];

// App-specific types
export type Role = 'singer' | 'band' | 'ojama' | 'spectator';
export type Instrument = 'guitar' | 'drums' | 'keyboard';
export type RoomStatus = 'waiting' | 'playing' | 'result';
export type GameSessionStatus = 'waiting' | 'countdown' | 'role_select' | 'playing' | 'finished';
