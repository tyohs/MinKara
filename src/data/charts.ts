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
 * difficultyを指定可能に変更（デフォルトはnormal）
 */
export function getChartForSong(
  songId: string, 
  difficulty: 'easy' | 'normal' | 'hard' = 'normal'
): Chart | null {
  
  // キャッシュキーに難易度を含める（例: "song-001-easy"）
  const cacheKey = `${songId}-${difficulty}`;

  if (chartCache.has(cacheKey)) {
    return chartCache.get(cacheKey)!;
  }

  const song = SONGS.find(s => s.id === songId);
  if (!song) return null;

  // generateNotesFromBPM に difficulty を渡す
  const notes = generateNotesFromBPM({
    songId: song.id,
    bpm: song.bpm,
    duration: song.duration,
    difficulty: difficulty,
    specialNoteChance: songId === 'song-001' ? 0.15 : 0.1, // Shining Star用調整
  });

  const chart: Chart = {
    songId: song.id,
    bpm: song.bpm,
    notes,
  };

  chartCache.set(cacheKey, chart);
  return chart;
}

/**
 * 譜面キャッシュをクリア
 */
export function clearChartCache(): void {
  chartCache.clear();
}

/**
 * デモ用の譜面を生成（テスト・デバッグ用に十分な長さ）
 */
export function generateDemoChart(): Chart {
  const notes: NoteData[] = [];
  const bpm = 120;
  const beatMs = 60000 / bpm; // 500ms per beat
  const durationSeconds = 360; // 6分間
  const totalBeats = Math.floor((durationSeconds * 1000) / beatMs);
  const targetNotes = 1200; // 目標ノーツ数
  const skipRate = Math.max(0, 1 - (targetNotes / totalBeats)); // スキップ率を計算

  let prevLane = -1;
  let noteCount = 0;

  for (let beat = 0; beat < totalBeats && noteCount < targetNotes; beat++) {
    // ノーツ数調整のためのスキップ
    if (skipRate > 0 && Math.random() < skipRate) {
      continue;
    }

    const time = 2000 + beat * beatMs; // 2秒後から開始
    
    // ランダムレーン（連続同一レーン回避）
    let lane = Math.floor(Math.random() * LANE_COUNT);
    if (lane === prevLane && Math.random() > 0.3) {
      lane = (lane + Math.floor(Math.random() * (LANE_COUNT - 1)) + 1) % LANE_COUNT;
    }
    
    const isSpecial = beat % 16 === 15;

    notes.push({
      id: `demo-${noteCount}`,
      lane,
      time,
      type: isSpecial ? 'special' : 'normal',
      hit: false,
    });

    prevLane = lane;
    noteCount++;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[generateDemoChart] Generated notes count:', notes.length);
  }

  return {
    songId: 'demo',
    bpm,
    notes,
  };
}