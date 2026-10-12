import { useEffect, useRef, useState } from 'react';
import type { GlassType } from '../game/types';

type Pick = { id: number; bin?: GlassType };

// Animate in order without dropping taps on other uncovered bottles.
export function useBottleInput(consume: (id: number, bin?: GlassType) => Promise<void>) {
  const consumer = useRef(consume);
  consumer.current = consume;
  const queue = useRef<Pick[]>([]);
  const generation = useRef(0);
  const running = useRef(false);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  useEffect(() => () => { generation.current++; queue.current = []; }, []);
  function clear() {
    generation.current++;
    running.current = false;
    queue.current = [];
    setPendingIds([]);
  }
  async function drain() {
    if (running.current) return;
    running.current = true;
    const ticket = generation.current;
    try {
      while (queue.current.length) {
        const pick = queue.current[0];
        await consumer.current(pick.id, pick.bin);
        if (ticket !== generation.current) return;
        queue.current.shift();
        setPendingIds(queue.current.map(pick => pick.id));
      }
    } finally {
      if (ticket === generation.current) {
        running.current = false;
        queue.current = [];
        setPendingIds([]);
      }
    }
  }
  function enqueue(id: number, bin?: GlassType) {
    if (queue.current.some(pick => pick.id === id)) return;
    queue.current.push({ id, bin });
    setPendingIds(queue.current.map(pick => pick.id));
    void drain();
  }
  return { pendingIds, enqueue, clear };
}
