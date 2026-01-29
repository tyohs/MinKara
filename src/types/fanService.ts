// ファンサ（アクション要求）関連の型定義

/**
 * ファンサのタイプ（スワイプ方向に対応）
 */
export type FanServiceType = 'wave' | 'heart' | 'wink' | 'peace';

/**
 * ファンサの設定情報
 */
export interface FanServiceConfig {
  type: FanServiceType;
  icon: string;
  label: string;
  direction: 'up' | 'down' | 'left' | 'right';
}

/**
 * ファンサ要求のペイロード
 */
export interface FanServiceRequest {
  type: FanServiceType;
  fromUserId: string;
  fromRole: 'keyboard' | 'guitar' | 'drum';
  timestamp: number;
}

/**
 * ファンサ設定一覧
 */
export const FAN_SERVICE_CONFIG: Record<FanServiceType, FanServiceConfig> = {
  wave: {
    type: 'wave',
    icon: '👋',
    label: '手を振って！',
    direction: 'up',
  },
  heart: {
    type: 'heart',
    icon: '💕',
    label: 'ハート作って！',
    direction: 'down',
  },
  wink: {
    type: 'wink',
    icon: '😉',
    label: 'ウインクして！',
    direction: 'left',
  },
  peace: {
    type: 'peace',
    icon: '✌️',
    label: 'ピースして！',
    direction: 'right',
  },
};

/**
 * スワイプ方向からファンサタイプを取得
 */
export function getFanServiceTypeFromDirection(
  direction: 'up' | 'down' | 'left' | 'right'
): FanServiceType {
  const map: Record<'up' | 'down' | 'left' | 'right', FanServiceType> = {
    up: 'wave',
    down: 'heart',
    left: 'wink',
    right: 'peace',
  };
  return map[direction];
}

/**
 * ファンサのクールダウン時間（ミリ秒）
 */
export const FAN_SERVICE_COOLDOWN = 30000; // 30秒
