'use client';

import { motion } from 'framer-motion';
import styles from './ScoreDisplay.module.css';

interface ScoreDisplayProps {
  score: number;
  combo: number;
}

export default function ScoreDisplay({ score, combo }: ScoreDisplayProps) {
  return (
    <div className={styles.container}>
      <div className={styles.scoreSection}>
        <span className={styles.label}>SCORE</span>
        <motion.span 
          className={styles.score}
          key={score}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.1 }}
        >
          {score.toLocaleString()}
        </motion.span>
      </div>

      <div className={styles.comboSection}>
        <span className={styles.label}>COMBO</span>
        <motion.span 
          className={styles.combo}
          key={combo}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.1 }}
        >
          {combo}
        </motion.span>
      </div>
    </div>
  );
}
