'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  FanServiceType, 
  FanServiceRequest,
  FAN_SERVICE_COOLDOWN,
  FAN_SERVICE_CONFIG,
  getFanServiceTypeFromDirection,
} from '@/types/fanService';

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
}

interface UseFanServiceOptions {
  userId: string;
  role: 'keyboard' | 'guitar' | 'drum';
  onSend?: (request: FanServiceRequest) => void;
  enabled?: boolean;
  initialCooldown?: number; // 初期クールダウン（ミリ秒）
}

const SWIPE_THRESHOLD = 50; // スワイプと認識する最小距離(px)
const SWIPE_TIME_LIMIT = 300; // スワイプと認識する最大時間(ms)

export function useFanService({
  userId,
  role,
  onSend,
  enabled = true,
  initialCooldown = 30000, // デフォルト30秒
}: UseFanServiceOptions) {
  // 初期クールダウンを設定するため、ゲーム開始時刻を基準にする
  const [lastSentTime, setLastSentTime] = useState<number>(() => {
    // 初期クールダウンを適用するため、(現在時刻 - COOLDOWN + initialCooldown)で初期化
    return Date.now() - FAN_SERVICE_COOLDOWN + initialCooldown;
  });
  const [cooldownRemaining, setCooldownRemaining] = useState(initialCooldown);
  const swipeStateRef = useRef<SwipeState | null>(null);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // クールダウン更新
  useEffect(() => {
    const updateCooldown = () => {
      const elapsed = Date.now() - lastSentTime;
      const remaining = Math.max(0, FAN_SERVICE_COOLDOWN - elapsed);
      setCooldownRemaining(remaining);
      
      if (remaining <= 0 && cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };

    updateCooldown();
    cooldownIntervalRef.current = setInterval(updateCooldown, 100);

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, [lastSentTime]);

  // ファンサ送信可能かどうか
  const canSend = cooldownRemaining === 0 && enabled;

  // ファンサ送信
  const sendFanService = useCallback((type: FanServiceType) => {
    if (!canSend) return false;

    const request: FanServiceRequest = {
      type,
      fromUserId: userId,
      fromRole: role,
      timestamp: Date.now(),
    };

    // 送信処理（Supabase経由）
    onSend?.(request);
    
    setLastSentTime(Date.now());
    setCooldownRemaining(FAN_SERVICE_COOLDOWN);

    // 振動フィードバック
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    return true;
  }, [canSend, userId, role, onSend]);

  // スワイプ開始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    swipeStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };
  }, [enabled]);

  // スワイプ終了
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled || !swipeStateRef.current) return;

    const touch = e.changedTouches[0];
    const { startX, startY, startTime } = swipeStateRef.current;
    
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const deltaTime = Date.now() - startTime;

    swipeStateRef.current = null;

    // スワイプ判定
    if (deltaTime > SWIPE_TIME_LIMIT) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < SWIPE_THRESHOLD && absY < SWIPE_THRESHOLD) return;

    // 方向判定
    let direction: 'up' | 'down' | 'left' | 'right';
    if (absX > absY) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    const fanServiceType = getFanServiceTypeFromDirection(direction);
    sendFanService(fanServiceType);
  }, [enabled, sendFanService]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);

  return {
    canSend,
    cooldownRemaining,
    cooldownSeconds: Math.ceil(cooldownRemaining / 1000),
    sendFanService,
    handleTouchStart,
    handleTouchEnd,
    config: FAN_SERVICE_CONFIG,
  };
}
