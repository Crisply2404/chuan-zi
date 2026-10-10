import { useEffect, useState } from 'react';

export function useTimedMessage() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 6000);
    return () => window.clearTimeout(timer);
  }, [message]);
  return [message, setMessage] as const;
}
