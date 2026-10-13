import { useCallback, useEffect, useRef, useState } from 'react';
import { playQueueSound } from '../audio';

export function useQueuePressure(active: boolean, roundKey: number, sound: boolean) {
  const [pressure, setPressure] = useState({ idleLevel: 0, quoteTick: 0 });
  const lastActivity = useRef(0);
  const stopSound = useRef<() => void>(() => {});
  const markActivity = useCallback(() => {
    lastActivity.current = Date.now();
    stopSound.current();
    stopSound.current = () => {};
    setPressure(previous => previous.idleLevel ? { ...previous, idleLevel: 0 } : previous);
  }, []);
  useEffect(() => {
    markActivity();
    setPressure({ idleLevel: 0, quoteTick: 0 });
    if (!active) return;
    let start = Date.now(), lastSound = start;
    const visibility = () => {
      markActivity();
      start = Date.now();
      lastSound = start;
      setPressure({ idleLevel: 0, quoteTick: 0 });
    };
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const now = Date.now(), idle = now - lastActivity.current;
      const idleLevel = idle >= 25000 ? 2 : idle >= 12000 ? 1 : 0;
      const quoteTick = Math.floor((now - start) / 4000);
      setPressure(previous => previous.idleLevel === idleLevel && previous.quoteTick === quoteTick
        ? previous : { idleLevel, quoteTick });
      if (idleLevel && now - lastSound >= 6000) {
        stopSound.current();
        stopSound.current = playQueueSound(sound, idleLevel);
        lastSound = now;
      }
    }, 500);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
      stopSound.current();
    };
  }, [active, roundKey, sound, markActivity]);
  return { ...pressure, markActivity };
}
