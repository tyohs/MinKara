// Sample song data for MinKara
// These are placeholder entries - in production, would use actual free/licensed music

import type { Song } from '@/types';

export const SONGS: Song[] = [
  {
    id: 'song-001',
    title: 'Shining Star',
    artist: 'Sample Artist',
    bpm: 128,
    genre: 'Pop',
    duration: 210,
    audio_url: '/audio/shining_star.mp3',
  },
  {
    id: 'song-002',
    title: 'Midnight Drive',
    artist: 'Night Runners',
    bpm: 120,
    genre: 'Rock',
    duration: 240,
    audio_url: '/audio/midnight_drive.mp3',
  },
  {
    id: 'song-003',
    title: 'Summer Breeze',
    artist: 'Ocean Waves',
    bpm: 110,
    genre: 'Chill',
    duration: 180,
    audio_url: '/audio/summer_breeze.mp3',
  },
  {
    id: 'song-004',
    title: 'Electric Dreams',
    artist: 'Synth Masters',
    bpm: 140,
    genre: 'Electronic',
    duration: 200,
    audio_url: '/audio/electric_dreams.mp3',
  },
  {
    id: 'song-005',
    title: 'Heartbeat',
    artist: 'Pulse',
    bpm: 130,
    genre: 'Dance',
    duration: 195,
    audio_url: '/audio/heartbeat.mp3',
  },
  {
    id: 'song-006',
    title: 'Acoustic Morning',
    artist: 'Gentle Strings',
    bpm: 90,
    genre: 'Acoustic',
    duration: 220,
    audio_url: '/audio/acoustic_morning.mp3',
  },
  {
    id: 'song-007',
    title: 'City Lights',
    artist: 'Urban Beat',
    bpm: 125,
    genre: 'Pop',
    duration: 205,
    audio_url: '/audio/city_lights.mp3',
  },
  {
    id: 'song-008',
    title: 'Thunder Road',
    artist: 'Heavy Metal Heroes',
    bpm: 150,
    genre: 'Rock',
    duration: 260,
    audio_url: '/audio/thunder_road.mp3',
  },
];

export const GENRES = ['All', 'Pop', 'Rock', 'Electronic', 'Dance', 'Chill', 'Acoustic'];

export function getSongById(id: string): Song | undefined {
  return SONGS.find(song => song.id === id);
}

export function filterSongs(query: string, genre: string): Song[] {
  return SONGS.filter(song => {
    const matchesQuery = query === '' || 
      song.title.toLowerCase().includes(query.toLowerCase()) ||
      song.artist.toLowerCase().includes(query.toLowerCase());
    const matchesGenre = genre === 'All' || song.genre === genre;
    return matchesQuery && matchesGenre;
  });
}
