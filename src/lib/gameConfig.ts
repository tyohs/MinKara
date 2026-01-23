/**
 * キーボードリズムゲーム 設定定数
 * 
 * すべてのゲーム関連の定数をここで一元管理
 */

// ========================================
// レーン設定
// ========================================
export const LANE_COUNT = 6;

// ========================================
// カラーパレット（レーンごとの色）
// ========================================
export interface KeyColor {
  base: string;
  active: string;
  name: string;
}

export const KEY_COLORS: KeyColor[] = [
  { base: '#FF6B6B', active: '#FF8E8E', name: 'red' },
  { base: '#FF9F43', active: '#FFB86C', name: 'orange' },
  { base: '#FED330', active: '#FEE16C', name: 'yellow' },
  { base: '#26DE81', active: '#5BEB9B', name: 'green' },
  { base: '#00D2D3', active: '#4DE5E5', name: 'cyan' },
  { base: '#A55EEA', active: '#BE7FF5', name: 'purple' },
];

// ========================================
// 判定タイミング（ミリ秒）
// ========================================
export const TIMING_WINDOWS = {
  perfect: 50,
  great: 100,
  good: 150,
} as const;

export type JudgmentType = 'perfect' | 'great' | 'good' | 'miss';

// ========================================
// スコア設定
// ========================================
export const SCORE_VALUES: Record<JudgmentType, number> = {
  perfect: 100,
  great: 75,
  good: 50,
  miss: 0,
};

// ========================================
// 判定表示設定
// ========================================
export const JUDGMENT_CONFIG: Record<JudgmentType, { text: string; color: string }> = {
  perfect: { text: 'PERFECT', color: '#22C55E' },
  great: { text: 'GREAT', color: '#F59E0B' },
  good: { text: 'GOOD', color: '#38BDF8' },
  miss: { text: 'MISS', color: '#EF4444' },
};

// ========================================
// ノーツ表示設定
// ========================================
export const NOTE_CONFIG = {
  /** デフォルトの落下速度 (px/ms) */
  defaultSpeed: 0.4,
  /** ノーツの可視範囲 (ms) - 過去 */
  visibleRangePast: -300,
  /** ノーツの可視範囲 (ms) - 未来 */
  visibleRangeFuture: 3500,
  /** 遠いノーツのスケール */
  minScale: 0.3,
  /** 近いノーツのスケール */
  maxScale: 1.0,
  /** ノーツ幅（レーン幅に対する割合） */
  widthRatio: 0.75,
} as const;

// ========================================
// 振動フィードバック設定 (ms)
// ========================================
export const VIBRATION_DURATION: Record<JudgmentType, number> = {
  perfect: 30,
  great: 20,
  good: 10,
  miss: 100,
};

// ========================================
// 判定表示時間 (ms)
// ========================================
export const JUDGMENT_DISPLAY_DURATION = 400;

// ========================================
// ゲームループ設定
// ========================================
export const GAME_LOOP = {
  /** フレーム更新間隔 (ms) - 60fps */
  frameInterval: 16,
} as const;
