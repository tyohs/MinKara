'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { JUDGMENT_CONFIG, JudgmentType } from '@/lib/gameConfig';
import styles from './JudgmentDisplay.module.css';

interface JudgmentDisplayProps {
  judgment: JudgmentType | null;
  combo: number;
}

export default function JudgmentDisplay({ judgment, combo }: JudgmentDisplayProps) {
  return (
    <div className={styles.container}>
      <AnimatePresence mode="wait">
        {judgment && (
          <motion.div
            key={`${judgment}-${Date.now()}`}
            className={styles.judgment}
            style={{ 
              '--judgment-color': JUDGMENT_CONFIG[judgment].color,
            } as React.CSSProperties}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 0.15 }}
          >
            {JUDGMENT_CONFIG[judgment].text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* コンボ表示（常に表示、10以上で強調） */}
      {combo > 0 && (
        <motion.div 
          className={styles.combo}
          key={combo}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.1 }}
        >
          <span className={styles.comboNumber}>{combo}</span>
          <span className={styles.comboLabel}>COMBO</span>
        </motion.div>
      )}
    </div>
  );
}
