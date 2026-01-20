import { NoteData } from '@/components/game/Note';
import { LANE_COUNT } from '@/lib/gameConfig';
import { generateNotesFromBPM } from '@/lib/noteGenerator';
import { SONGS } from './songs';

export interface Chart {
  songId: string;
  bpm: number;
  notes: NoteData[];
}

const chartCache: Map<string, Chart> = new Map();

/**
 * 曲IDから譜面を取得（自動生成）
 */
export function getChartForSong(songId: string): Chart | null {
  if (chartCache.has(songId)) {
    return chartCache.get(songId)!;
  }

  const song = SONGS.find(s => s.id === songId);
  if (!song) return null;

  const notes = generateNotesFromBPM({
    songId: song.id,
    bpm: song.bpm,
    duration: song.duration,
    difficulty: 'normal',
    specialNoteChance: 0.1,
  });

  const chart: Chart = {
    songId: song.id,
    bpm: song.bpm,
    notes,
  };

  chartCache.set(songId, chart);
  return chart;
}

/**
 * 譜面キャッシュをクリア
 */
export function clearChartCache(): void {
  chartCache.clear();
}

/**
 * デモ用の短い譜面を生成
 */
export function generateDemoChart(): Chart {
  const notes: NoteData[] = [];
  const bpm = 120;
  const beatMs = 60000 / bpm;

  for (let beat = 0; beat < 64; beat++) {
    const time = 2000 + beat * beatMs;
    const lane = beat % LANE_COUNT;
    const isSpecial = beat % 16 === 15;

    notes.push({
      id: `demo-${beat}`,
      lane,
      time,
      type: isSpecial ? 'special' : 'normal',
      hit: false,
    });
  }

  return {
    songId: 'demo',
    bpm,
    notes,
  };
}
