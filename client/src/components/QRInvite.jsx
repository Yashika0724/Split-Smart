import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from 'lucide-react';
import styles from './QRInvite.module.css';

export default function QRInvite({ token }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/join/${token}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.qr}>
        <QRCodeSVG value={link} size={148} bgColor="#FFFFFF" fgColor="#1F3D2B" level="M" />
      </div>
      <div className={styles.meta}>
        <div className="label">Invite link</div>
        <div className={styles.linkRow}>
          <code className={styles.link}>{link}</code>
          <button className={styles.copy} onClick={copy} aria-label="copy invite link">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className={styles.hint}>
          Share the QR or the link. Anyone who opens it can join the group.
        </p>
      </div>
    </div>
  );
}
