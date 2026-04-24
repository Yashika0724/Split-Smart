import styles from './Avatar.module.css';
import { initials } from '../lib/format.js';

const PALETTE = [
  { bg: '#E8D6C3', fg: '#5C3A1E' },
  { bg: '#D6E2CD', fg: '#2F4B2A' },
  { bg: '#E6D0D0', fg: '#6B2F2F' },
  { bg: '#D9D4E3', fg: '#3B3365' },
  { bg: '#EED9B8', fg: '#6B4A16' },
  { bg: '#CFE0E3', fg: '#214B52' },
  { bg: '#E7C9B7', fg: '#7A3A1B' },
  { bg: '#D4DACB', fg: '#3A4A2E' },
];

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function colorFor(userId) {
  const h = hashString(String(userId || ''));
  return PALETTE[h % PALETTE.length];
}

export default function Avatar({ userId, name, size = 36 }) {
  const { bg, fg } = colorFor(userId);
  const style = {
    width: size,
    height: size,
    background: bg,
    color: fg,
    fontSize: Math.round(size * 0.4),
  };
  return (
    <span className={styles.avatar} style={style} aria-label={name}>
      {initials(name)}
    </span>
  );
}
