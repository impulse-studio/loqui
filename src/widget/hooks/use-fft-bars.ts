import { useEffect, useRef, useState } from "react";
import barCount from "../constants/bar-count";
import lerp from "../lib/lerp";
import seededRandom from "../lib/seeded-random";

export default function useFftBars(rms: number): number[] {
  const [bars, setBars] = useState<number[]>(() => new Array(barCount).fill(0));
  const currentRef = useRef<number[]>(new Array(barCount).fill(0));
  const targetRef = useRef<number[]>(new Array(barCount).fill(0));
  const frameRef = useRef(0);
  const rafRef = useRef(0);

  // Update targets when rms changes — boost amplitude significantly
  useEffect(() => {
    frameRef.current += 1;
    const frame = frameRef.current;
    const boosted = Math.min(1, rms * 6);
    for (let i = 0; i < barCount; i++) {
      const variation = 0.3 + seededRandom(i, frame) * 0.7;
      targetRef.current[i] = boosted * variation;
    }
  }, [rms]);

  // Animation loop
  useEffect(() => {
    let running = true;

    function animate() {
      if (!running) return;
      const current = currentRef.current;
      const target = targetRef.current;
      const next = new Array(barCount) as number[];

      for (let i = 0; i < barCount; i++) {
        next[i] = lerp(current[i], target[i], 0.18);
      }

      currentRef.current = next;
      setBars(next);
      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return bars;
}
