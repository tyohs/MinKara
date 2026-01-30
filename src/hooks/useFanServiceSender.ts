'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FanServiceRequest, FAN_SERVICE_CONFIG } from '@/types/fanService';

/**
 * ファンサ送信とそのフィードバックを管理するカスタムフック
 * @param roomId 送信先のルームID
 */
export function useFanServiceSender(roomId: string) {
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const sendFanService = useCallback(async (request: FanServiceRequest) => {
    if (!roomId) {
      console.warn('[useFanServiceSender] No roomId provided');
      return;
    }
    
    try {
      const channel = supabase.channel(`room:${roomId}`);
      
      // 接続待機
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Subscription timeout')), 5000);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve();
          }
        });
      });
      
      // 送信
      await channel.send({
        type: 'broadcast',
        event: 'fan_service',
        payload: request,
      });
      
      // 切断
      supabase.removeChannel(channel);
      
      // フィードバック表示
      const config = FAN_SERVICE_CONFIG[request.type];
      setFeedbackMessage(`${config.icon} ${config.label}`);
      setTimeout(() => setFeedbackMessage(null), 1500);

    } catch (error) {
      console.error('[useFanServiceSender] Failed to send fan service:', error);
    }
  }, [roomId]);

  return {
    sendFanService,
    feedbackMessage
  };
}
