import styles from './Wordmark.module.css';

export default function Wordmark({ size = 20 }) {
  return (
    <span
      className={styles.wordmark}
      style={{ fontSize: `${size}px` }}
      aria-label="Split Smart"
    >
      <span className={styles.s}>S</span>
      <span className={styles.rest}>plit</span>
      <span className={styles.space}> </span>
      <span className={styles.s}>S</span>
      <span className={styles.rest}>mart</span>
    </span>
  );
}
