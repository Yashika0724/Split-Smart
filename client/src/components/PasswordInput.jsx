import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './PasswordInput.module.css';

export default function PasswordInput({
  value,
  onChange,
  autoComplete = 'current-password',
  required = false,
  placeholder,
  id,
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.wrap}>
      <input
        id={id}
        className={`input ${styles.input}`}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
      />
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'hide password' : 'show password'}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
