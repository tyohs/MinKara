/**
 * 譜面（チャート）データ定義
 * 各楽器ごとに異なる譜面を持つ
 */

import { InstrumentType } from '@/types';

export type NoteType = 'tap' | 'hold' | 'special';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type Judgment = 'perfect' | 'great' | 'good' | 'miss';

export interface NoteData {
  time: number;
  type: NoteType;
  duration?: number;
  lane?: number;
}

export interface InstrumentChart {
  songId: string;
  instrument: InstrumentType;
  difficulty: Difficulty;
  notes: NoteData[];
}

export const JUDGMENT_WINDOWS = {
  perfect: 100,
  great: 180,
  good: 300,
};

export const JUDGMENT_MULTIPLIERS: Record<Judgment, number> = {
  perfect: 2.0,
  great: 1.5,
  good: 1.0,
  miss: 0,
};

export function getComboMultiplier(combo: number): number {
  if (combo >= 100) return 3.0;
  if (combo >= 50) return 2.0;
  if (combo >= 30) return 1.5;
  if (combo >= 10) return 1.2;
  return 1.0;
}

export const BASE_POINTS: Record<NoteType, number> = {
  tap: 30,
  hold: 50,
  special: 100,
};

// 楽器別レーン数
const LANE_COUNTS: Record<InstrumentType, number> = {
  drums: 4,     // HH, SN, TM, KK
  guitar: 3,    // 左、中、右
  keyboard: 5,  // ドレミファソ
  bass: 2,      // 低、高
};

// 汎用の譜面生成関数
function generateChartForSong(
  songId: string,
  instrument: InstrumentType,
  bpm: number,
  duration: number, // 秒
  density: number
): NoteData[] {
  const notes: NoteData[] = [];
  const beat = 60000 / bpm; // 1拍のミリ秒
  const interval = beat / density;
  let noteIndex = 0;
  
  const startTime = 2000;
  const endTime = duration * 1000 - 5000;
  const laneCount = LANE_COUNTS[instrument];

  for (let time = startTime; time < endTime; time += interval) {
    const type: NoteType = noteIndex % 16 === 0 ? 'special' : 'tap';
    
    // 楽器ごとにレーンを分散
    let lane: number;
    if (instrument === 'drums') {
      // ドラム: 4レーンを順番に
      lane = noteIndex % 4;
    } else if (instrument === 'keyboard') {
      // キーボード: 5レーンをランダム風に
      lane = (noteIndex * 3) % 5;
    } else if (instrument === 'guitar') {
      // ギター: 3レーンを左右に振る
      lane = (noteIndex * 2) % 3;
    } else {
      // ベース: 2レーンを交互に
      lane = noteIndex % 2;
    }
    
    notes.push({ time: Math.round(time), type, lane });
    noteIndex++;
  }

  return notes;
}

// 全楽器の譜面を一括生成
function generateAllInstruments(
  songId: string,
  bpm: number,
  duration: number
): InstrumentChart[] {
  const instruments: { instrument: InstrumentType; density: number }[] = [
    { instrument: 'drums', density: 1 },
    { instrument: 'guitar', density: 0.5 },
    { instrument: 'keyboard', density: 0.25 },
    { instrument: 'bass', density: 0.5 },
  ];

  return instruments.map(({ instrument, density }) => ({
    songId,
    instrument,
    difficulty: 'easy' as Difficulty,
    notes: generateChartForSong(songId, instrument, bpm, duration, density),
  }));
}

// ============================================
// 「仰げば尊し」BPM: 96, 長さ: 198秒
// ============================================

const aogeba_drums: InstrumentChart = {
  songId: 'aogeba_toutoshi',
  instrument: 'drums',
  difficulty: 'easy',
  notes: generateChartForSong('aogeba_toutoshi', 'drums', 96, 198, 1),
};

const aogeba_guitar: InstrumentChart = {
  songId: 'aogeba_toutoshi',
  instrument: 'guitar',
  difficulty: 'easy',
  notes: generateChartForSong('aogeba_toutoshi', 'guitar', 96, 198, 0.5),
};

const aogeba_keyboard: InstrumentChart = {
  songId: 'aogeba_toutoshi',
  instrument: 'keyboard',
  difficulty: 'easy',
  notes: generateChartForSong('aogeba_toutoshi', 'keyboard', 96, 198, 0.25),
};

const aogeba_bass: InstrumentChart = {
  songId: 'aogeba_toutoshi',
  instrument: 'bass',
  difficulty: 'easy',
  notes: generateChartForSong('aogeba_toutoshi', 'bass', 96, 198, 0.5),
};

// ============================================
// 「シャイニングスター」BPM: 158, 長さ: 240秒
// ============================================

const shining_drums: InstrumentChart = {
  songId: 'shining_star',
  instrument: 'drums',
  difficulty: 'easy',
  notes: generateChartForSong('shining_star', 'drums', 158, 240, 1),
};

const shining_guitar: InstrumentChart = {
  songId: 'shining_star',
  instrument: 'guitar',
  difficulty: 'easy',
  notes: generateChartForSong('shining_star', 'guitar', 158, 240, 0.5),
};

const shining_keyboard: InstrumentChart = {
  songId: 'shining_star',
  instrument: 'keyboard',
  difficulty: 'easy',
  notes: generateChartForSong('shining_star', 'keyboard', 158, 240, 0.25),
};

const shining_bass: InstrumentChart = {
  songId: 'shining_star',
  instrument: 'bass',
  difficulty: 'easy',
  notes: generateChartForSong('shining_star', 'bass', 158, 240, 0.5),
};

// ============================================
// 「Asou」BPM: 80, 長さ: 200秒
// ============================================

const asou_drums: InstrumentChart = {
  songId: 'asou',
  instrument: 'drums',
  difficulty: 'easy',
  notes: generateChartForSong('asou', 'drums', 80, 200, 1),
};

const asou_guitar: InstrumentChart = {
  songId: 'asou',
  instrument: 'guitar',
  difficulty: 'easy',
  notes: generateChartForSong('asou', 'guitar', 80, 200, 0.5),
};

const asou_keyboard: InstrumentChart = {
  songId: 'asou',
  instrument: 'keyboard',
  difficulty: 'easy',
  notes: generateChartForSong('asou', 'keyboard', 80, 200, 0.25),
};

const asou_bass: InstrumentChart = {
  songId: 'asou',
  instrument: 'bass',
  difficulty: 'easy',
  notes: generateChartForSong('asou', 'bass', 80, 200, 0.5),
};

export const CHARTS: InstrumentChart[] = [
  // 仰げば尊し
  aogeba_drums,
  aogeba_guitar,
  aogeba_keyboard,
  aogeba_bass,
  // シャイニングスター
  shining_drums,
  shining_guitar,
  shining_keyboard,
  shining_bass,
  // Asou
  asou_drums,
  asou_guitar,
  asou_keyboard,
  asou_bass,
  // バーニングハート
  ...generateAllInstruments('burning_heart', 142, 240),
];

export function getChart(
  songId: string, 
  instrument: InstrumentType, 
  difficulty: Difficulty
): InstrumentChart | undefined {
  return CHARTS.find(
    chart => chart.songId === songId && 
             chart.instrument === instrument && 
             chart.difficulty === difficulty
  );
}

export function getChartsForSong(songId: string): InstrumentChart[] {
  return CHARTS.filter(chart => chart.songId === songId);
}
