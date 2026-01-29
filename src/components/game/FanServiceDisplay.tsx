'use client';

import { useEffect, useState } from 'react';
import { FanServiceRequest, FAN_SERVICE_CONFIG } from '@/types/fanService';
import styles from './FanServiceDisplay.module.css';

interface FanServiceDisplayProps {
  request: FanServiceRequest | null;
  onDismiss?: () => void;
  onTap?: () => void;
}

const DISPLAY_DURATION = 5000; // 5秒表示

export default function FanServiceDisplay({ 
  request, 
  onDismiss,
  onTap
}: FanServiceDisplayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<FanServiceRequest | null>(null);

  useEffect(() => {
    if (!request) return;

    console.log('[FanServiceDisplay] Received request:', request);
    setCurrentRequest(request);
    setIsVisible(true);

    // バイブレーション
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentRequest(null);
        onDismiss?.();
      }, 500); // フェードアウト完了後
    }, DISPLAY_DURATION);

    return () => clearTimeout(timer);
  }, [request, onDismiss]);

  const handleTap = () => {
    onTap?.();
    // タップしたら早めに消す
    setIsVisible(false);
    setTimeout(() => {
      setCurrentRequest(null);
      onDismiss?.();
    }, 300);
  };

  if (!currentRequest) return null;

  const config = FAN_SERVICE_CONFIG[currentRequest.type];

  return (
    <div 
      className={`${styles.overlay} ${isVisible ? styles.visible : styles.hidden}`}
      onClick={handleTap}
    >
      <div className={styles.container}>
        {/* グロー効果の背景 */}
        <div className={styles.glowBackground} />
        
        {/* アイコン */}
        <div className={styles.iconWrapper}>
          <span className={styles.icon}>{config.icon}</span>
        </div>
        
        {/* 送信元情報 */}
        <div className={styles.senderInfo}>
          {currentRequest.fromRole === 'keyboard' ? 'キーボード' : 
           currentRequest.fromRole === 'guitar' ? 'ギター' : 
           currentRequest.fromRole === 'drum' ? 'ドラム' : '誰か'}から
        </div>

        {/* テキスト */}
        <div className={styles.label}>{config.label}</div>
        
        {/* TAPボタン */}
        <button className={styles.tapButton}>
          TAP
        </button>
      </div>
    </div>
  );
}
