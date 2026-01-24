'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { JUDGMENT_CONFIG, JudgmentType } from '@/lib/gameConfig';
import styles from './JudgmentDisplay.module.css';

interface JudgmentDisplayProps {
  judgment: JudgmentType | null;
  combo: number;
}

export default function JudgmentDisplay({ judgment, combo }: JudgmentDisplayProps) {
  const isMiss = judgment === 'miss';
  
  return (
    <>
      {/* Miss時の画面フラッシュ */}
      <AnimatePresence>
        {isMiss && (
          <motion.div
            className={styles.missFlash}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      <div className={styles.container}>
        {/* コンボ表示（上） */}
        <AnimatePresence>
          {combo >= 5 && (
            <motion.div 
              className={styles.combo}
              initial={{ opacity: 0, scale: 0.5, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -20 }}
            >
              <motion.span 
                className={styles.comboNumber}
                key={combo}
                initial={{ scale: 1.5 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.1 }}
              >
                {combo}
              </motion.span>
              <span className={styles.comboLabel}>COMBO</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 判定表示（下） */}
        <AnimatePresence mode="popLayout">
          {judgment && (
            <motion.div
              key={`${judgment}-${combo}`} // Ensure re-render on each hit
              className={styles.judgmentWrapper}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <span className={`${styles.judgment} ${styles[judgment]}`}>
                {JUDGMENT_CONFIG[judgment].text}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
