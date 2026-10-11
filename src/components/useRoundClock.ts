import { useEffect, useRef, useState } from 'react';

// A monotonic clock avoids losing time when browser intervals are throttled.
// Reading help or leaving the board pauses it; undo never refunds elapsed time.
export function useRoundClock(active: boolean, initialSeconds: number) {
  const remaining = useRef(initialSeconds * 1000);
  const last = useRef(performance.now());
  const running = useRef(active);
  const [milliseconds, setMilliseconds] = useState(remaining.current);
  function settle() {
    const now = performance.now();
    if (running.current) remaining.current = Math.max(0, remaining.current - (now - last.current));
    last.current = now;
    return remaining.current;
  }
  useEffect(() => {
    settle(); running.current = active; last.current = performance.now();
    setMilliseconds(remaining.current);
    if (!active) return;
    const timer = window.setInterval(() => setMilliseconds(settle()), 100);
    return () => { window.clearInterval(timer); settle(); running.current = false; };
  }, [active]);
  return {
    milliseconds,
    read: settle,
    deduct(seconds: number) { settle(); remaining.current = Math.max(0,remaining.current-seconds*1000);setMilliseconds(remaining.current); },
    reset(seconds: number) { remaining.current = seconds*1000;last.current=performance.now();setMilliseconds(remaining.current); },
  };
}
